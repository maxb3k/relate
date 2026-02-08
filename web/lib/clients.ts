import { requireEnv } from "@/lib/utils";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function transcribeAudio(audio: Buffer, mimeType: string, filename: string): Promise<string> {
  const elevenKey = requireEnv("ELEVENLABS_API_KEY");
  const sttModel = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";
  const form = new FormData();
  form.append("model_id", sttModel);
  const audioBytes = new Uint8Array(audio);
  form.append("file", new Blob([audioBytes], { type: mimeType }), filename);

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": elevenKey
    },
    body: form
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs STT failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    text?: string;
    transcripts?: Array<{ text?: string }>;
  };

  if (data.text?.trim()) return data.text.trim();
  if (Array.isArray(data.transcripts)) {
    return data.transcripts
      .map((t) => t.text?.trim() || "")
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return "";
}

export async function generateCoachResponse(model: string, messages: OpenRouterMessage[]): Promise<string> {
  const base = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const apiKey = requireEnv("OPENROUTER_API_KEY");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://relate.local",
      "X-Title": "Relate Coach MVP"
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "I hear you. Let us take one small step together.";
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const key = requireEnv("ELEVENLABS_API_KEY");
  const voiceId = requireEnv("ELEVENLABS_VOICE_ID");

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      model_id: "eleven_flash_v2_5",
      text,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        use_speaker_boost: true
      }
    })
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs failed: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
