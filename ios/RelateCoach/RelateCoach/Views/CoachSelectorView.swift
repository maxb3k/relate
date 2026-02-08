import SwiftUI

struct CoachSelectorView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            List(PersonaCatalog.all, id: \.id) { persona in
                Button {
                    appState.selectedPersona = persona
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(persona.name).font(.headline)
                            Text(persona.tagline).font(.caption).foregroundStyle(.secondary)
                        }

                        Spacer()

                        if appState.selectedPersona.id == persona.id {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                        }
                    }
                }
            }
            .navigationTitle("Choose Coach")
        }
    }
}
