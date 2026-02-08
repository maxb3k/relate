import Foundation

final class AnalyticsClient {
    private let defaults = UserDefaults.standard
    private let keyLastOpen = "relate.last_open_at"

    func capture(event: String, sessionId: String) {
        guard !AppConfig.posthogKey.isEmpty else { return }
        guard let url = URL(string: "\(AppConfig.posthogHost)/capture/") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "api_key": AppConfig.posthogKey,
            "event": event,
            "properties": [
                "distinct_id": sessionId,
                "sessionId": sessionId,
                "platform": "ios"
            ]
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: request).resume()
    }

    func trackAppOpen(sessionId: String) {
        let now = Date()
        if let last = defaults.object(forKey: keyLastOpen) as? Date {
            let seconds = now.timeIntervalSince(last)
            if seconds > 20 * 3600 && seconds < 48 * 3600 {
                capture(event: "return_1d", sessionId: sessionId)
            }
            if seconds > 6 * 24 * 3600 && seconds < 8 * 24 * 3600 {
                capture(event: "return_7d", sessionId: sessionId)
            }
        }
        defaults.set(now, forKey: keyLastOpen)
    }
}
