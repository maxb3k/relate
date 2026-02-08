# RelateCoach iOS App (SwiftUI + AVFoundation)

## Included
- Push-to-talk recording (`AudioRecorder`) to AAC `.m4a`
- Voice turn upload (`APIClient`) multipart form data
- Audio playback (`AudioPlayer`)
- Persona selector, home coach screen, session history
- Analytics events: `start_session`, `first_reply`, `session_end`, `return_1d`, `return_7d`
- Sentry hook via `CrashReporter` when Sentry SDK is installed

## Setup
1. Create iOS project in Xcode (SwiftUI App lifecycle).
2. Copy source files under `RelateCoach/RelateCoach` into your target.
3. Add `NSMicrophoneUsageDescription` to `Info.plist`.
4. Optionally add Sentry Cocoa SDK (SPM) for production crash monitoring.
5. Set run-time env vars in scheme:
   - `RELATE_API_BASE_URL=http://localhost:3000`
   - `RELATE_API_SHARED_SECRET=...` (required if backend sets `API_SHARED_SECRET`)
   - `RELATE_POSTHOG_KEY=...`
   - `RELATE_POSTHOG_HOST=https://us.i.posthog.com`
   - `RELATE_SENTRY_DSN=...`
