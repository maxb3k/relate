import Foundation

enum AppConfig {
    static let apiBaseURL = URL(string: ProcessInfo.processInfo.environment["RELATE_API_BASE_URL"] ?? "http://localhost:3000")!
    static let apiSharedSecret = ProcessInfo.processInfo.environment["RELATE_API_SHARED_SECRET"] ?? ""
    static let posthogKey = ProcessInfo.processInfo.environment["RELATE_POSTHOG_KEY"] ?? ""
    static let posthogHost = ProcessInfo.processInfo.environment["RELATE_POSTHOG_HOST"] ?? "https://us.i.posthog.com"
}
