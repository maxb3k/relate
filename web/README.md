# Web MVP (Next.js)

## Routes
- `/tester` web backend tester UI
- `POST /api/voice-turn` unified STT -> LLM -> TTS turn
- `GET /api/health/providers` provider connectivity and key health checks
- `GET /api/personas` persona catalog
- `GET /api/sessions/:sessionId/turns` session history

## Voice turn debug mode
Use query params:
- `debug=1`
- `model=openai/gpt-4o` (override persona default)

## API protection
- `POST /api/voice-turn` supports shared-secret auth.
- Set `API_SHARED_SECRET` on the backend and send `Authorization: Bearer <secret>` (or `x-api-key`) from clients.
- Web tester can use `NEXT_PUBLIC_API_SHARED_SECRET` for local/internal testing.
- Rate limit defaults: `12` requests per `60s` per IP.
- Configure with `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`.

## Persona model routing defaults
- `ava` -> `anthropic/claude-3.5-sonnet`
- `marcus` -> `openai/gpt-4o`
- `mina` -> `openai/gpt-4o-mini`

## Notes
- STT uses ElevenLabs Speech-to-Text (`/v1/speech-to-text`) with `ELEVENLABS_STT_MODEL` (default `scribe_v2`).
- If Supabase storage is not configured, API returns data URLs for audio so tester still works.
- Health endpoint supports browser HTML view (`?format=html`) and raw JSON (`?format=json`).
