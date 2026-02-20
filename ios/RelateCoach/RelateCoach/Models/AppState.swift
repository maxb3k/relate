import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var personas: [Persona] = PersonaCatalog.all
    @Published var selectedPersona: Persona = Persona.fallbackAva
    @Published var sessionId: String = UUID().uuidString
    @Published var turns: [SessionTurn] = []

    func applyPersonas(_ loaded: [Persona]) {
        guard !loaded.isEmpty else { return }
        personas = loaded
        if let matched = loaded.first(where: { $0.id == selectedPersona.id }) {
            selectedPersona = matched
        } else if let first = loaded.first {
            selectedPersona = first
        }
    }

    func resetSession() {
        sessionId = UUID().uuidString
        turns = []
    }
}
