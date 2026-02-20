"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Persona = {
  id: string;
  name: string;
  tagline: string;
};

type Turn = {
  id: string;
  personaId: string;
  personaName: string;
  transcript: string;
  responseText: string;
  audioUrl: string;
  createdAt: string;
  debug?: {
    selectedModel: string;
    latency: { sttMs: number; llmMs: number; ttsMs: number; totalMs: number };
  };
};

function makeSessionId() {
  return crypto.randomUUID();
}

export default function TesterPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState("ava");
  const [sessionId, setSessionId] = useState(makeSessionId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [debugMode, setDebugMode] = useState(true);
  const [modelOverride, setModelOverride] = useState("");
  const [expandedDebugFor, setExpandedDebugFor] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [errorText, setErrorText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartedAtRef = useRef<number>(0);

  const persona = useMemo(() => personas.find((p) => p.id === personaId), [personas, personaId]);
  const personaNameById = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, p.name])),
    [personas]
  );

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas || []));
  }, []);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/turns`)
      .then((r) => r.json())
      .then((d) => {
        const loaded = (d.turns || []).map(
          (t: {
            id: string;
            persona_id?: string;
            transcript: string;
            response_text: string;
            output_audio_url: string;
            created_at?: string;
          }): Turn => ({
            id: t.id,
            personaId: t.persona_id || "unknown",
            personaName: t.persona_id ? personaNameById[t.persona_id] || t.persona_id : "Coach",
            transcript: t.transcript || "",
            responseText: t.response_text || "",
            audioUrl: t.output_audio_url || "",
            createdAt: t.created_at || new Date().toISOString()
          })
        );
        setTurns(loaded);
      })
      .catch(() => {
        setTurns([]);
      });
  }, [sessionId, personaNameById]);

  useEffect(() => {
    void fetch("/api/ping-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "start_session", sessionId })
    });
  }, [sessionId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/ping-event",
        JSON.stringify({ event: "session_end", sessionId, userId: sessionId })
      );
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [sessionId]);

  useEffect(() => {
    const turnCount = turns.length;
    if (turnCount === 0) return;
    if (turnCount === 1) {
      void fetch("/api/ping-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "first_reply", sessionId })
      });
    }
  }, [turns, sessionId]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
    const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.start(250);
    recordStartedAtRef.current = Date.now();
    setErrorText("");
    mediaRecorderRef.current = recorder;
    setState("listening");
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.requestData();
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;

    const heldMs = Date.now() - recordStartedAtRef.current;
    if (heldMs < 450 || blob.size < 3000) {
      setState("idle");
      setErrorText("Recording too short. Hold to talk for at least 1 second.");
      return;
    }

    setState("thinking");

    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    form.append("audio", blob, `turn.${ext}`);
    form.append("personaId", personaId);
    form.append("sessionId", sessionId);

    const params = new URLSearchParams();
    if (debugMode) params.set("debug", "1");
    if (modelOverride.trim()) params.set("model", modelOverride.trim());

    const headers: HeadersInit = {};
    if (process.env.NEXT_PUBLIC_API_SHARED_SECRET) {
      headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_API_SHARED_SECRET}`;
    }

    const res = await fetch(`/api/voice-turn?${params.toString()}`, { method: "POST", body: form, headers });
    const data = await res.json();

    if (!res.ok) {
      setState("idle");
      setErrorText(data.detail || data.error || "Voice turn failed");
      return;
    }
    setErrorText("");

    const nextTurn: Turn = {
      id: data.turnId,
      personaId,
      personaName: persona?.name || "Coach",
      transcript: data.transcript,
      responseText: data.responseText,
      audioUrl: data.audioUrl,
      createdAt: new Date().toISOString(),
      debug: data.debug
    };

    setTurns((prev) => [...prev, nextTurn]);
    setState("speaking");

    const audio = new Audio(data.audioUrl);
    audio.onended = () => setState("idle");
    await audio.play();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <section className="rounded-3xl border border-white/50 bg-[var(--card)] p-6 shadow-xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Voice Backend Tester</h1>
            <p className="text-sm text-slate-600">{persona?.tagline || "Choose a coach and run push-to-talk turns."}</p>
          </div>
          <div className="flex gap-2">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              onClick={() => {
                setSessionId(makeSessionId());
                setTurns([]);
              }}
            >
              New Session
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} />
            Debug mode
          </label>
          <input
            className="min-w-64 rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Model override e.g. openai/gpt-4o"
            value={modelOverride}
            onChange={(e) => setModelOverride(e.target.value)}
          />
        </div>

        <div className="mb-6 max-h-96 space-y-3 overflow-auto rounded-2xl border border-slate-200 bg-white/90 p-4">
          {errorText && <p className="rounded-lg bg-rose-100 p-2 text-sm text-rose-800">{errorText}</p>}
          {turns.length === 0 && <p className="text-sm text-slate-500">No turns yet.</p>}
          {turns.map((turn) => (
            <article key={turn.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm text-slate-500">You: {turn.transcript}</p>
              <p className="mt-2 font-medium">{turn.personaName}: {turn.responseText}</p>
              <div className="mt-3 flex items-center gap-3">
                <audio controls src={turn.audioUrl} className="h-8" />
                <button
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => setExpandedDebugFor(expandedDebugFor === turn.id ? null : turn.id)}
                >
                  {expandedDebugFor === turn.id ? "Hide" : "Show"} debug
                </button>
              </div>
              {expandedDebugFor === turn.id && turn.debug && (
                <pre className="mt-3 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{JSON.stringify(
  {
    transcript: turn.transcript,
    responseTextPreTts: turn.responseText,
    selectedModel: turn.debug.selectedModel,
    latency: turn.debug.latency
  },
  null,
  2
)}
                </pre>
              )}
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">State: {state}</span>
          <button
            className="h-24 w-24 rounded-full bg-[var(--accent)] text-white shadow-lg active:scale-95"
            onMouseDown={() => {
              if (state === "idle") void startRecording();
            }}
            onMouseUp={() => {
              if (state === "listening") void stopRecording();
            }}
            onTouchStart={() => {
              if (state === "idle") void startRecording();
            }}
            onTouchEnd={() => {
              if (state === "listening") void stopRecording();
            }}
            onTouchCancel={() => {
              if (state === "listening") void stopRecording();
            }}
            disabled={state === "thinking" || state === "speaking"}
          >
            Hold to Talk
          </button>
        </div>
      </section>
    </main>
  );
}
