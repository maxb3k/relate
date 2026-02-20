import AVFoundation
import Foundation
import Combine

final class AudioPlayer: NSObject, AVAudioPlayerDelegate, ObservableObject {
    private var player: AVAudioPlayer?
    var onFinish: (() -> Void)?

    func play(url: URL) throws {
        let data = try Data(contentsOf: url)
        player = try AVAudioPlayer(data: data)
        player?.delegate = self
        player?.prepareToPlay()
        player?.play()
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        onFinish?()
    }
}
