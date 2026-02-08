import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Coach", systemImage: "mic.circle.fill") }

            SessionHistoryView()
                .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }

            CoachSelectorView()
                .tabItem { Label("Coaches", systemImage: "person.3.fill") }
        }
    }
}
