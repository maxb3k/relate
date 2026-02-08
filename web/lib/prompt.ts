import { selectFaqSnippets } from "@/lib/faq";
import { PersonaProfile } from "@/types/voice";

const LOCKED_SYSTEM_RULES = [
  "No diagnosis.",
  "No medical or legal advice.",
  "No explicit sexual content.",
  "Voice-friendly responses.",
  "Plain text only. No markdown."
].join("\n");

export function buildSystemPrompt(persona: PersonaProfile, transcript: string): string {
  const faq = selectFaqSnippets(transcript, persona);

  const faqBlock = faq.length
    ? faq.map((f, i) => `${i + 1}) Q: ${f.question}\nA: ${f.answer}`).join("\n")
    : "None";

  return [
    "Locked system safety rules (highest priority):",
    LOCKED_SYSTEM_RULES,
    "",
    "Product behavior constraints:",
    `- Keep responses within ${persona.maxSentences} sentences.`,
    `- Ask at most one question: ${persona.askOneQuestion ? "enabled" : "disabled"}.`,
    `- Validation first: ${persona.validationFirst ? "enabled" : "disabled"}.`,
    "",
    "Persona profile:",
    `Name: ${persona.name}`,
    `Role: ${persona.role}`,
    `Tagline: ${persona.tagline}`,
    `Warmth: ${persona.warmth}/10, Directness: ${persona.directness}/10, Humor: ${persona.humor}/10`,
    "",
    "Persona style prompt (lower priority than rules above):",
    persona.personaStylePrompt,
    "",
    "Doctrine (lower priority than rules above):",
    persona.doctrine || "None",
    "",
    "FAQ support references (inject only if relevant):",
    faqBlock
  ].join("\n");
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]?/g) || [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function enforceResponseRules(rawText: string, persona: PersonaProfile): string {
  const sentenceLimited = splitSentences(rawText).slice(0, persona.maxSentences).join(" ");
  if (!persona.askOneQuestion) {
    return sentenceLimited.replace(/\?/g, ".");
  }

  const chunks = sentenceLimited.split("?");
  if (chunks.length <= 2) return sentenceLimited;
  return `${chunks[0]}? ${chunks.slice(1).join(".").trim()}`.replace(/\.\./g, ".");
}
