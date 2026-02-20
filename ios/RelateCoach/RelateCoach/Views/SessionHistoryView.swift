import SwiftUI

struct SessionHistoryView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = VoiceSessionViewModel()

    private func coachName(for personaId: String) -> String {
        appState.personas.first(where: { $0.id == personaId })?.name ?? appState.selectedPersona.name
    }

    var body: some View {
        NavigationStack {
            List(appState.turns) { turn in
                VStack(alignment: .leading, spacing: 6) {
                    Text("You: \(turn.transcript)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("\(coachName(for: turn.personaId)): \(turn.responseText)")
                        .font(.body)
                    Text(turn.createdAt.formatted(date: .omitted, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.vertical, 4)
            }
            .navigationTitle("Session History")
            .toolbar {
                Button("Refresh") {
                    Task { await vm.loadHistory(appState: appState) }
                }
            }
        }
    }
}
