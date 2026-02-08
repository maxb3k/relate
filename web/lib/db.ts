import { createClient } from "@supabase/supabase-js";
import { PersonaProfile } from "@/types/voice";

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function ensureSession(sessionId: string, persona: PersonaProfile): Promise<void> {
  if (!supabase) return;

  const { error: personaError } = await supabase.from("personas").upsert(
    {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      tagline: persona.tagline,
      warmth: persona.warmth,
      directness: persona.directness,
      humor: persona.humor,
      validation_first: persona.validationFirst,
      ask_one_question: persona.askOneQuestion,
      max_sentences: persona.maxSentences,
      persona_style_prompt: persona.personaStylePrompt,
      doctrine: persona.doctrine || null,
      faq: persona.faq || []
    },
    { onConflict: "id" }
  );
  if (personaError) {
    console.error("ensureSession persona upsert failed", personaError.message);
    return;
  }

  const { error } = await supabase.from("sessions").upsert(
    {
      id: sessionId,
      persona_id: persona.id,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("ensureSession session upsert failed", error.message);
  }
}

export async function uploadAudio(sessionId: string, turnId: string, audioBuffer: Buffer, mimeExt: "m4a" | "mp3" | "webm") {
  const mimeType = mimeExt === "mp3" ? "audio/mpeg" : mimeExt === "webm" ? "audio/webm" : "audio/mp4";
  if (!supabase) {
    return { audioUrl: `data:${mimeType};base64,${audioBuffer.toString("base64")}`, storagePath: "" };
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-turns";
  const path = `${sessionId}/${turnId}.${mimeExt}`;

  const { error } = await supabase.storage.from(bucket).upload(path, audioBuffer, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: true
  });

  if (error) {
    console.error("uploadAudio failed", error.message);
    return { audioUrl: `data:${mimeType};base64,${audioBuffer.toString("base64")}`, storagePath: "" };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { audioUrl: data.publicUrl, storagePath: path };
}

export async function saveTurn(params: {
  turnId: string;
  sessionId: string;
  personaId: string;
  transcript: string;
  responseText: string;
  inputAudioUrl: string;
  outputAudioUrl: string;
}) {
  if (!supabase) return;

  const { error } = await supabase.from("turns").insert({
    id: params.turnId,
    session_id: params.sessionId,
    persona_id: params.personaId,
    transcript: params.transcript,
    response_text: params.responseText,
    input_audio_url: params.inputAudioUrl,
    output_audio_url: params.outputAudioUrl
  });

  if (error) {
    console.error("saveTurn failed", error.message);
  }
}
