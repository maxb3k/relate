import { NextRequest, NextResponse } from "next/server";
import { getPersonaProfile, savePersonaProfile } from "@/lib/db";
import { getPersona } from "@/lib/personas";
import { requireSharedSecret } from "@/lib/security";
import { PersonaProfile } from "@/types/voice";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeProfile(base: PersonaProfile, patch: Partial<PersonaProfile>): PersonaProfile {
  return {
    ...base,
    ...patch,
    id: base.id,
    name: (patch.name || base.name).trim(),
    role: (patch.role || base.role).trim(),
    tagline: (patch.tagline || base.tagline).trim(),
    voiceId: (patch.voiceId || base.voiceId).trim(),
    warmth: clamp(Number(patch.warmth ?? base.warmth), 1, 10),
    directness: clamp(Number(patch.directness ?? base.directness), 1, 10),
    humor: clamp(Number(patch.humor ?? base.humor), 1, 10),
    maxSentences: clamp(Number(patch.maxSentences ?? base.maxSentences), 2, 6),
    validationFirst: Boolean(patch.validationFirst ?? base.validationFirst),
    askOneQuestion: Boolean(patch.askOneQuestion ?? base.askOneQuestion),
    personaStylePrompt: (patch.personaStylePrompt || base.personaStylePrompt).trim(),
    doctrine: (patch.doctrine ?? base.doctrine)?.trim(),
    faq: Array.isArray(patch.faq) ? patch.faq : base.faq
  };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ personaId: string }> }
) {
  const auth = requireSharedSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", detail: auth.reason }, { status: 401 });
  }

  const { personaId } = await context.params;
  const fallback = getPersona(personaId);
  const current = await getPersonaProfile(personaId, fallback);

  const patch = (await req.json().catch(() => ({}))) as Partial<PersonaProfile>;
  const nextProfile = normalizeProfile(current, patch);

  if (!nextProfile.voiceId) {
    return NextResponse.json({ error: "voiceId is required" }, { status: 400 });
  }

  try {
    const saved = await savePersonaProfile(nextProfile);
    return NextResponse.json({ persona: saved });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save persona", detail: String(error) }, { status: 500 });
  }
}
