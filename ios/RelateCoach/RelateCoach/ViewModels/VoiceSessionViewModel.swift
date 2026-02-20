import Foundation
import Combine

@MainActor
final class VoiceSessionViewModel: ObservableObject {
    enum VoiceState: String {
        case idle
        case listening
        case thinking
        case speaking
    }

    @Published var voiceState: VoiceState = .idle
    @Published var latestDebugText: String = ""
    @Published var modelOverride: String = ""

    private let recorder = AudioRecorder()
    private let player = AudioPlayer()
    private let apiClient = APIClient()
    private let analytics = AnalyticsClient()

    init() {
        player.onFinish = { [weak self] in
            Task { @MainActor in
                self?.voiceState = .idle
            }
        }
    }

    func beginPressHold() {
        do {
            try recorder.start()
            voiceState = .listening
        } catch {
            CrashReporter.shared.capture(error)
        }
    }

    func endPressHold(appState: AppState) {
        guard voiceState == .listening else { return }
        guard let audioURL = recorder.stop() else {
            voiceState = .idle
            return
        }

        voiceState = .thinking

        Task {
            do {
                let response = try await apiClient.sendVoiceTurn(
                    audioURL: audioURL,
                    personaId: appState.selectedPersona.id,
                    sessionId: appState.sessionId,
                    modelOverride: modelOverride.isEmpty ? nil : modelOverride,
                    debug: true
                )

                let turn = SessionTurn(
                    id: response.turnId,
                    personaId: appState.selectedPersona.id,
                    transcript: response.transcript,
                    responseText: response.responseText,
                    audioUrl: response.audioUrl,
                    createdAt: Date()
                )
                appState.turns.append(turn)

                analytics.capture(event: appState.turns.count == 1 ? "first_reply" : "turn_complete", sessionId: appState.sessionId)

                if let debug = response.debug {
                    latestDebugText = "model=\(debug.selectedModel) stt=\(Int(debug.latency.sttMs))ms llm=\(Int(debug.latency.llmMs))ms tts=\(Int(debug.latency.ttsMs))ms total=\(Int(debug.latency.totalMs))ms"
                }

                if response.audioUrl.starts(with: "data:") {
                    guard let commaIndex = response.audioUrl.firstIndex(of: ",") else {
                        voiceState = .idle
                        return
                    }
                    let base64Payload = String(response.audioUrl[response.audioUrl.index(after: commaIndex)...])
                    guard let data = Data(base64Encoded: base64Payload) else {
                        voiceState = .idle
                        return
                    }
                    let tmpURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(response.turnId).mp3")
                    try data.write(to: tmpURL)
                    voiceState = .speaking
                    try player.play(url: tmpURL)
                } else if let remoteURL = URL(string: response.audioUrl) {
                    let tmpURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(response.turnId).mp3")
                    let (data, _) = try await URLSession.shared.data(from: remoteURL)
                    try data.write(to: tmpURL)
                    voiceState = .speaking
                    try player.play(url: tmpURL)
                } else {
                    voiceState = .idle
                }
            } catch {
                voiceState = .idle
                CrashReporter.shared.capture(error)
            }
        }
    }

    func startSession(appState: AppState) {
        appState.resetSession()
        analytics.capture(event: "start_session", sessionId: appState.sessionId)
    }

    func endSession(appState: AppState) {
        analytics.capture(event: "session_end", sessionId: appState.sessionId)
    }

    func loadHistory(appState: AppState) async {
        do {
            appState.turns = try await apiClient.fetchSessionTurns(sessionId: appState.sessionId)
        } catch {
            CrashReporter.shared.capture(error)
        }
    }

    func loadPersonas(appState: AppState) async {
        do {
            let loaded = try await apiClient.fetchPersonas()
            appState.applyPersonas(loaded)
        } catch {
            CrashReporter.shared.capture(error)
        }
    }
}
