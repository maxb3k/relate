import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var selectedPersona: Persona = PersonaCatalog.ava
    @Published var sessionId: String = UUID().uuidString
    @Published var turns: [SessionTurn] = []

    func resetSession() {
        sessionId = UUID().uuidString
        turns = []
    }
}
