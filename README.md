# Relate Coach MVP

Monorepo scaffold for a 7-14 day MVP:
- `/web`: Next.js backend + `/tester` web UI
- `/ios/RelateCoach`: SwiftUI iOS app source files
- `/docs/supabase-schema.sql`: Postgres schema

## Core endpoint
`POST /api/voice-turn`
- input: multipart audio + `personaId` + `sessionId`
- output: `transcript`, `responseText`, `audioUrl`, `turnId`, optional `debug`
- pipeline: ElevenLabs STT -> OpenRouter LLM -> ElevenLabs TTS

## Health endpoint
`GET /api/health/providers`
- checks connectivity/config for OpenRouter, ElevenLabs, and Supabase

## Voice-turn protection
`POST /api/voice-turn` supports:
- shared-secret auth (`API_SHARED_SECRET`)
- in-memory IP rate limiting (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`)

## Quick start (web)
1. `cd /Users/max/dev/codex/relate/web`
2. Copy `.env.example` to `.env.local` and fill provider keys.
3. `npm install`
4. `npm run dev`
5. Open `http://localhost:3000/tester`

## Supabase
1. Run SQL in `/Users/max/dev/codex/relate/docs/supabase-schema.sql`.
2. Create storage bucket (default `voice-turns`) with public read URLs for MVP.

## iOS
Create an Xcode iOS App project named `RelateCoach`, then copy files from `/Users/max/dev/codex/relate/ios/RelateCoach/RelateCoach` into the target.

Set environment variables in scheme Run settings:
- `RELATE_API_BASE_URL`
- `RELATE_POSTHOG_KEY`
- `RELATE_POSTHOG_HOST`
- `RELATE_SENTRY_DSN`
