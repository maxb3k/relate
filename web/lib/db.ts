import { createClient } from "@supabase/supabase-js";
import { PersonaProfile } from "@/types/voice";

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

function personaToRow(persona: PersonaProfile) {
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    tagline: persona.tagline,
    voice_id: persona.voiceId,
    warmth: persona.warmth,
    directness: persona.directness,
    humor: persona.humor,
    validation_first: persona.validationFirst,
    ask_one_question: persona.askOneQuestion,
    max_sentences: persona.maxSentences,
    persona_style_prompt: persona.personaStylePrompt,
    doctrine: persona.doctrine || null,
    faq: persona.faq || []
  };
}

export async function ensureSession(sessionId: string, persona: PersonaProfile): Promise<void> {
  if (!supabase) return;

  const { error: personaError } = await supabase.from("personas").upsert(personaToRow(persona), {
    onConflict: "id",
    ignoreDuplicates: true
  });
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

export async function savePersonaProfile(persona: PersonaProfile): Promise<PersonaProfile> {
  if (!supabase) return persona;

  const { error } = await supabase.from("personas").upsert(personaToRow(persona), {
    onConflict: "id"
  });
  if (error) {
    throw new Error(error.message);
  }
  return persona;
}

type PersonaRow = {
  id: string;
  name: string | null;
  role: string | null;
  tagline: string | null;
  voice_id: string | null;
  warmth: number | null;
  directness: number | null;
  humor: number | null;
  validation_first: boolean | null;
  ask_one_question: boolean | null;
  max_sentences: number | null;
  persona_style_prompt: string | null;
  doctrine: string | null;
  faq: unknown;
};

function parseFaq(faq: unknown, fallback: PersonaProfile["faq"]): PersonaProfile["faq"] {
  if (!Array.isArray(faq)) return fallback;
  const parsed = faq
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = (item as { question?: unknown }).question;
      const answer = (item as { answer?: unknown }).answer;
      if (typeof question !== "string" || typeof answer !== "string") return null;
      return { question, answer };
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x));
  return parsed.length > 0 ? parsed : fallback;
}

export async function getPersonaProfile(personaId: string, fallback: PersonaProfile): Promise<PersonaProfile> {
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("personas")
    .select(
      "id, name, role, tagline, voice_id, warmth, directness, humor, validation_first, ask_one_question, max_sentences, persona_style_prompt, doctrine, faq"
    )
    .eq("id", personaId)
    .maybeSingle<PersonaRow>();

  if (error || !data) {
    if (error) {
      console.error("getPersonaProfile failed", error.message);
    }
    return fallback;
  }

  return {
    id: fallback.id,
    name: data.name || fallback.name,
    role: data.role || fallback.role,
    tagline: data.tagline || fallback.tagline,
    voiceId: data.voice_id || fallback.voiceId,
    warmth: typeof data.warmth === "number" ? data.warmth : fallback.warmth,
    directness: typeof data.directness === "number" ? data.directness : fallback.directness,
    humor: typeof data.humor === "number" ? data.humor : fallback.humor,
    validationFirst: typeof data.validation_first === "boolean" ? data.validation_first : fallback.validationFirst,
    askOneQuestion: typeof data.ask_one_question === "boolean" ? data.ask_one_question : fallback.askOneQuestion,
    maxSentences: typeof data.max_sentences === "number" ? data.max_sentences : fallback.maxSentences,
    personaStylePrompt: data.persona_style_prompt || fallback.personaStylePrompt,
    doctrine: data.doctrine || fallback.doctrine,
    faq: parseFaq(data.faq, fallback.faq)
  };
}

export async function listPersonaProfiles(fallbacks: PersonaProfile[]): Promise<PersonaProfile[]> {
  if (!supabase) return fallbacks;

  await supabase.from("personas").upsert(
    fallbacks.map((persona) => personaToRow(persona)),
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data, error } = await supabase
    .from("personas")
    .select(
      "id, name, role, tagline, voice_id, warmth, directness, humor, validation_first, ask_one_question, max_sentences, persona_style_prompt, doctrine, faq"
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listPersonaProfiles failed", error.message);
    return fallbacks;
  }

  if (!data || data.length === 0) {
    return fallbacks;
  }

  return (data as PersonaRow[]).map((row, index) => {
    const fallback = fallbacks[index] || fallbacks[0];
    return {
      id: row.id || fallback.id,
      name: row.name || fallback.name,
      role: row.role || fallback.role,
      tagline: row.tagline || fallback.tagline,
      voiceId: row.voice_id || fallback.voiceId,
      warmth: typeof row.warmth === "number" ? row.warmth : fallback.warmth,
      directness: typeof row.directness === "number" ? row.directness : fallback.directness,
      humor: typeof row.humor === "number" ? row.humor : fallback.humor,
      validationFirst: typeof row.validation_first === "boolean" ? row.validation_first : fallback.validationFirst,
      askOneQuestion: typeof row.ask_one_question === "boolean" ? row.ask_one_question : fallback.askOneQuestion,
      maxSentences: typeof row.max_sentences === "number" ? row.max_sentences : fallback.maxSentences,
      personaStylePrompt: row.persona_style_prompt || fallback.personaStylePrompt,
      doctrine: row.doctrine || fallback.doctrine,
      faq: parseFaq(row.faq, fallback.faq)
    };
  });
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
