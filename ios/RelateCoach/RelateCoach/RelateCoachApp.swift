import SwiftUI

@main
struct RelateCoachApp: App {
    @StateObject private var appState = AppState()
    private let analytics = AnalyticsClient()

    init() {
        CrashReporter.shared.startIfAvailable()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .onAppear {
                    analytics.trackAppOpen(sessionId: appState.sessionId)
                }
        }
    }
}
