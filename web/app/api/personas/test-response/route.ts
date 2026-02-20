import { NextRequest, NextResponse } from "next/server";
import { generateCoachResponse } from "@/lib/clients";
import { getPersonaProfile } from "@/lib/db";
import { DEFAULT_MODELS, getPersona } from "@/lib/personas";
import { buildSystemPrompt, enforceResponseRules } from "@/lib/prompt";
import { requireSharedSecret } from "@/lib/security";

export async function POST(req: NextRequest) {
  const auth = requireSharedSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", detail: auth.reason }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    personaId?: string;
    userText?: string;
    model?: string;
  };

  const personaId = (body.personaId || "ava").trim();
  const userText = (body.userText || "").trim();
  if (!userText) {
    return NextResponse.json({ error: "userText is required" }, { status: 400 });
  }

  const fallback = getPersona(personaId);
  const persona = await getPersonaProfile(personaId, fallback);
  const selectedModel = body.model?.trim() || DEFAULT_MODELS[persona.id] || DEFAULT_MODELS.ava;

  try {
    const raw = await generateCoachResponse(selectedModel, [
      { role: "system", content: buildSystemPrompt(persona, userText) },
      { role: "user", content: userText }
    ]);

    return NextResponse.json({
      responseText: enforceResponseRules(raw, persona),
      selectedModel,
      persona: {
        id: persona.id,
        name: persona.name,
        warmth: persona.warmth,
        directness: persona.directness,
        humor: persona.humor,
        maxSentences: persona.maxSentences
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Test response failed", detail: String(error) }, { status: 500 });
  }
}
