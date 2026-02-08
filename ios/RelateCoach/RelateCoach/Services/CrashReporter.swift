import Foundation
#if canImport(Sentry)
import Sentry
#endif

final class CrashReporter {
    static let shared = CrashReporter()

    func startIfAvailable() {
#if canImport(Sentry)
        let options = Options()
        if let dsn = ProcessInfo.processInfo.environment["RELATE_SENTRY_DSN"], !dsn.isEmpty {
            options.dsn = dsn
            options.enableAutoSessionTracking = true
            SentrySDK.start(options: options)
        }
#endif
    }

    func capture(_ error: Error) {
#if canImport(Sentry)
        SentrySDK.capture(error: error)
#else
        print("Captured error: \(error)")
#endif
    }
}
