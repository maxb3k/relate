"use client";

import { useEffect, useMemo, useState } from "react";

type Persona = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  voiceId: string;
  warmth: number;
  directness: number;
  humor: number;
  validationFirst: boolean;
  askOneQuestion: boolean;
  maxSentences: number;
  doctrine?: string;
  personaStylePrompt: string;
};

const emptyPersona: Persona = {
  id: "",
  name: "",
  role: "",
  tagline: "",
  voiceId: "",
  warmth: 7,
  directness: 7,
  humor: 3,
  validationFirst: true,
  askOneQuestion: true,
  maxSentences: 4,
  doctrine: "",
  personaStylePrompt: ""
};

export default function PersonaLabPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Persona>(emptyPersona);
  const [status, setStatus] = useState("");
  const [testInput, setTestInput] = useState("I keep shutting down when conflict starts.");
  const [testModel, setTestModel] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testMeta, setTestMeta] = useState("");

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.NEXT_PUBLIC_API_SHARED_SECRET) {
      h.Authorization = `Bearer ${process.env.NEXT_PUBLIC_API_SHARED_SECRET}`;
    }
    return h;
  }, []);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.personas || []) as Persona[];
        setPersonas(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setDraft(list[0]);
        }
      });
  }, []);

  function selectPersona(id: string) {
    setSelectedId(id);
    const next = personas.find((p) => p.id === id);
    if (next) setDraft(next);
    setStatus("");
    setTestResult("");
  }

  function updateDraft<K extends keyof Persona>(key: K, value: Persona[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function savePersona() {
    if (!draft.id) return;
    setStatus("Saving...");

    const res = await fetch(`/api/personas/${encodeURIComponent(draft.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(draft)
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Save failed: ${data.detail || data.error || "unknown error"}`);
      return;
    }

    const saved = data.persona as Persona;
    setDraft(saved);
    setPersonas((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    setStatus("Saved");
  }

  async function runTest() {
    if (!draft.id || !testInput.trim()) return;
    setTestResult("Testing...");
    setTestMeta("");

    const res = await fetch("/api/personas/test-response", {
      method: "POST",
      headers,
      body: JSON.stringify({
        personaId: draft.id,
        userText: testInput,
        model: testModel || undefined
      })
    });
    const data = await res.json();

    if (!res.ok) {
      setTestResult(`Test failed: ${data.detail || data.error || "unknown error"}`);
      return;
    }

    setTestResult(data.responseText || "No response");
    setTestMeta(`Model: ${data.selectedModel}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">Persona Lab</h1>
      <p className="mt-2 text-sm text-slate-600">Modify coach persona settings from Supabase, then run text tests before mobile QA.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Coaches</p>
          <div className="space-y-2">
            {personas.map((p) => (
              <button
                key={p.id}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedId === p.id ? "border-[var(--accent)] bg-orange-50" : "border-slate-200 bg-white"}`}
                onClick={() => selectPersona(p.id)}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-slate-600">{p.id}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Name<input className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} /></label>
              <label className="text-sm">Voice ID<input className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.voiceId} onChange={(e) => updateDraft("voiceId", e.target.value)} /></label>
              <label className="text-sm">Role<input className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.role} onChange={(e) => updateDraft("role", e.target.value)} /></label>
              <label className="text-sm">Tagline<input className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.tagline} onChange={(e) => updateDraft("tagline", e.target.value)} /></label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label className="text-sm">Warmth<input type="number" min={1} max={10} className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.warmth} onChange={(e) => updateDraft("warmth", Number(e.target.value))} /></label>
              <label className="text-sm">Directness<input type="number" min={1} max={10} className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.directness} onChange={(e) => updateDraft("directness", Number(e.target.value))} /></label>
              <label className="text-sm">Humor<input type="number" min={1} max={10} className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.humor} onChange={(e) => updateDraft("humor", Number(e.target.value))} /></label>
              <label className="text-sm">Max Sentences<input type="number" min={2} max={6} className="mt-1 w-full rounded-lg border px-2 py-2" value={draft.maxSentences} onChange={(e) => updateDraft("maxSentences", Number(e.target.value))} /></label>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.validationFirst} onChange={(e) => updateDraft("validationFirst", e.target.checked)} />Validation First</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.askOneQuestion} onChange={(e) => updateDraft("askOneQuestion", e.target.checked)} />Ask One Question</label>
            </div>

            <label className="mt-4 block text-sm">Persona Style Prompt
              <textarea className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2" value={draft.personaStylePrompt} onChange={(e) => updateDraft("personaStylePrompt", e.target.value)} />
            </label>

            <label className="mt-3 block text-sm">Doctrine
              <textarea className="mt-1 min-h-20 w-full rounded-lg border px-3 py-2" value={draft.doctrine || ""} onChange={(e) => updateDraft("doctrine", e.target.value)} />
            </label>

            <div className="mt-4 flex items-center gap-3">
              <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" onClick={savePersona}>Save Persona</button>
              <span className="text-sm text-slate-600">{status}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Test Response</h2>
            <p className="mt-1 text-sm text-slate-600">Run a text-only coaching test with current persona settings.</p>
            <label className="mt-3 block text-sm">Model override (optional)
              <input className="mt-1 w-full rounded-lg border px-2 py-2" value={testModel} onChange={(e) => setTestModel(e.target.value)} placeholder="anthropic/claude-3.5-sonnet" />
            </label>
            <label className="mt-3 block text-sm">User message
              <textarea className="mt-1 min-h-20 w-full rounded-lg border px-3 py-2" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
            </label>
            <div className="mt-3">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={runTest}>Run Test</button>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              {testMeta && <p className="mb-1 text-xs text-slate-500">{testMeta}</p>}
              <p className="whitespace-pre-wrap text-sm">{testResult || "No test run yet."}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
