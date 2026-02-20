import Foundation

struct SessionTurn: Codable, Identifiable, Hashable {
    let id: String
    let personaId: String
    let transcript: String
    let responseText: String
    let audioUrl: String
    let createdAt: Date
}

struct VoiceTurnResponse: Codable {
    let transcript: String
    let responseText: String
    let audioUrl: String
    let turnId: String
    let debug: DebugInfo?

    struct DebugInfo: Codable {
        let selectedModel: String
        let latency: Latency

        struct Latency: Codable {
            let sttMs: Double
            let llmMs: Double
            let ttsMs: Double
            let totalMs: Double
        }
    }
}
