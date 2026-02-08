import { PersonaProfile } from "@/types/voice";

function scoreMatch(text: string, candidate: string): number {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  const unique = new Set(words);
  let score = 0;
  for (const w of unique) {
    if (candidate.toLowerCase().includes(w)) score += 1;
  }
  return score;
}

export function selectFaqSnippets(transcript: string, persona: PersonaProfile): Array<{ question: string; answer: string }> {
  if (!persona.faq || persona.faq.length === 0) return [];

  const ranked = persona.faq
    .map((entry) => ({
      entry,
      score: scoreMatch(transcript, `${entry.question} ${entry.answer}`)
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.entry);

  return ranked;
}
