import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { captureEvent } from "@/lib/analytics";
import { generateCoachResponse, synthesizeSpeech, transcribeAudio } from "@/lib/clients";
import { ensureSession, saveTurn, uploadAudio } from "@/lib/db";
import { DEFAULT_MODELS, getPersona } from "@/lib/personas";
import { buildSystemPrompt, enforceResponseRules } from "@/lib/prompt";
import { checkRateLimit, requireSharedSecret } from "@/lib/security";
import { elapsedMs, nowMs } from "@/lib/utils";
import { VoiceTurnResponse } from "@/types/voice";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const totalStart = nowMs();
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const overrideModel = req.nextUrl.searchParams.get("model");

  try {
    const auth = requireSharedSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized", detail: auth.reason }, { status: 401 });
    }

    const rateLimit = checkRateLimit(req);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limited",
          detail: `Too many voice turns. Try again in ${rateLimit.retryAfterSec}s.`
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining)
          }
        }
      );
    }

    const form = await req.formData();
    const audioFile = form.get("audio") as File | null;
    const sessionId = String(form.get("sessionId") || randomUUID());
    const personaId = String(form.get("personaId") || "ava");

    if (!audioFile) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const persona = getPersona(personaId);
    const selectedModel = overrideModel || DEFAULT_MODELS[persona.id];

    await ensureSession(sessionId, persona);

    const inputTurnId = randomUUID();
    const inputExt = (audioFile.name.split(".").pop() || "m4a").toLowerCase();
    const inputMimeExt = inputExt === "webm" ? "webm" : "m4a";
    const inputAudioBuffer = Buffer.from(await audioFile.arrayBuffer());
    if (inputAudioBuffer.byteLength < 3000) {
      return NextResponse.json(
        { error: "Audio too short", detail: "Please hold the mic for at least 1 second before releasing." },
        { status: 400 }
      );
    }
    const inputUpload = await uploadAudio(sessionId, `${inputTurnId}-input`, inputAudioBuffer, inputMimeExt);

    const sttStart = nowMs();
    const transcript = await transcribeAudio(
      inputAudioBuffer,
      audioFile.type || "audio/mp4",
      audioFile.name || "turn.m4a"
    );
    const sttMs = elapsedMs(sttStart);

    const llmStart = nowMs();
    const systemPrompt = buildSystemPrompt(persona, transcript);
    const rawResponse = await generateCoachResponse(selectedModel, [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript }
    ]);
    const responseText = enforceResponseRules(rawResponse, persona);
    const llmMs = elapsedMs(llmStart);

    const ttsStart = nowMs();
    const ttsAudioBuffer = await synthesizeSpeech(responseText);
    const ttsMs = elapsedMs(ttsStart);

    const turnId = randomUUID();
    const outputUpload = await uploadAudio(sessionId, `${turnId}-output`, ttsAudioBuffer, "mp3");

    await saveTurn({
      turnId,
      sessionId,
      personaId: persona.id,
      transcript,
      responseText,
      inputAudioUrl: inputUpload.audioUrl,
      outputAudioUrl: outputUpload.audioUrl
    });

    captureEvent("first_reply", { sessionId, personaId: persona.id, turnId });

    const payload: VoiceTurnResponse = {
      transcript,
      responseText,
      audioUrl: outputUpload.audioUrl,
      turnId,
      ...(debug
        ? {
            debug: {
              selectedModel,
              latency: {
                sttMs,
                llmMs,
                ttsMs,
                totalMs: elapsedMs(totalStart)
              }
            }
          }
        : {})
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Voice turn failed", detail: String(error) }, { status: 500 });
  }
}
