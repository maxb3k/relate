export type PersonaId = "ava" | "marcus" | "mina";

export type PersonaProfile = {
  id: PersonaId;
  name: string;
  role: string;
  tagline: string;
  warmth: number;
  directness: number;
  humor: number;
  validationFirst: boolean;
  askOneQuestion: boolean;
  maxSentences: number;
  doctrine?: string;
  personaStylePrompt: string;
  faq?: Array<{ question: string; answer: string }>;
};

export type LatencyBreakdown = {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
};

export type VoiceTurnResponse = {
  transcript: string;
  responseText: string;
  audioUrl: string;
  turnId: string;
  debug?: {
    selectedModel: string;
    latency: LatencyBreakdown;
  };
};
