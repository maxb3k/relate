import Foundation

final class APIClient {
    func sendVoiceTurn(audioURL: URL, personaId: String, sessionId: String, modelOverride: String? = nil, debug: Bool = true) async throws -> VoiceTurnResponse {
        var components = URLComponents(url: AppConfig.apiBaseURL.appending(path: "/api/voice-turn"), resolvingAgainstBaseURL: false)!
        var items: [URLQueryItem] = []
        if debug { items.append(URLQueryItem(name: "debug", value: "1")) }
        if let modelOverride, !modelOverride.isEmpty {
            items.append(URLQueryItem(name: "model", value: modelOverride))
        }
        components.queryItems = items.isEmpty ? nil : items

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if !AppConfig.apiSharedSecret.isEmpty {
            request.setValue("Bearer \(AppConfig.apiSharedSecret)", forHTTPHeaderField: "Authorization")
        }

        let audioData = try Data(contentsOf: audioURL)
        request.httpBody = makeBody(audioData: audioData, personaId: personaId, sessionId: sessionId, boundary: boundary)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let serverError = String(data: data, encoding: .utf8) ?? "unknown"
            throw NSError(domain: "APIClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: serverError])
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(VoiceTurnResponse.self, from: data)
    }

    func fetchSessionTurns(sessionId: String) async throws -> [SessionTurn] {
        let url = AppConfig.apiBaseURL.appending(path: "/api/sessions/\(sessionId)/turns")
        let (data, _) = try await URLSession.shared.data(from: url)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        struct TurnsPayload: Decodable {
            let turns: [TurnDTO]
            struct TurnDTO: Decodable {
                let id: String
                let transcript: String
                let responseText: String
                let outputAudioUrl: String
                let createdAt: Date
            }
        }

        let payload = try decoder.decode(TurnsPayload.self, from: data)
        return payload.turns.map {
            SessionTurn(id: $0.id, transcript: $0.transcript, responseText: $0.responseText, audioUrl: $0.outputAudioUrl, createdAt: $0.createdAt)
        }
    }

    private func makeBody(audioData: Data, personaId: String, sessionId: String, boundary: String) -> Data {
        var body = Data()

        func append(_ string: String) {
            body.append(string.data(using: .utf8)!)
        }

        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"audio\"; filename=\"turn.m4a\"\r\n")
        append("Content-Type: audio/mp4\r\n\r\n")
        body.append(audioData)
        append("\r\n")

        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"personaId\"\r\n\r\n")
        append(personaId)
        append("\r\n")

        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"sessionId\"\r\n\r\n")
        append(sessionId)
        append("\r\n")

        append("--\(boundary)--\r\n")
        return body
    }
}
