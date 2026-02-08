import Foundation

struct Persona: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
    let tagline: String
    let warmth: Int
    let directness: Int
    let humor: Int
    let validationFirst: Bool
    let askOneQuestion: Bool
    let maxSentences: Int
}

enum PersonaCatalog {
    static let ava = Persona(id: "ava", name: "Ava", role: "Compassionate relationship coach", tagline: "Warm clarity for hard conversations", warmth: 9, directness: 6, humor: 2, validationFirst: true, askOneQuestion: true, maxSentences: 4)
    static let marcus = Persona(id: "marcus", name: "Marcus", role: "Direct communication strategist", tagline: "Straightforward scripts that reduce friction", warmth: 5, directness: 9, humor: 3, validationFirst: false, askOneQuestion: true, maxSentences: 3)
    static let mina = Persona(id: "mina", name: "Mina", role: "Calm reflective coach", tagline: "Balanced perspective with gentle accountability", warmth: 8, directness: 7, humor: 4, validationFirst: true, askOneQuestion: true, maxSentences: 4)

    static let all: [Persona] = [ava, marcus, mina]
}
