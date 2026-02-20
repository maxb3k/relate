import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = VoiceSessionViewModel()

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            Circle()
                .fill(.orange.opacity(0.2))
                .frame(width: 112, height: 112)
                .overlay(Text(String(appState.selectedPersona.name.prefix(1))).font(.system(size: 48, weight: .bold)))

            Text(appState.selectedPersona.name)
                .font(.title.bold())

            Text(appState.selectedPersona.tagline)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Text("State: \(vm.voiceState.rawValue)")
                .font(.headline)

            Button {
            } label: {
                Text("Hold to Talk")
                    .font(.headline)
                    .frame(width: 180, height: 180)
                    .background(vm.voiceState == .listening ? .red : .orange)
                    .foregroundStyle(.white)
                    .clipShape(Circle())
            }
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if vm.voiceState == .idle {
                            vm.beginPressHold()
                        }
                    }
                    .onEnded { _ in
                        vm.endPressHold(appState: appState)
                    }
            )

            if !vm.latestDebugText.isEmpty {
                Text(vm.latestDebugText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .multilineTextAlignment(.center)
            }

            HStack {
                Button("New Session") {
                    vm.startSession(appState: appState)
                }
                .buttonStyle(.borderedProminent)

                Button("End Session") {
                    vm.endSession(appState: appState)
                }
                .buttonStyle(.bordered)
            }

            Spacer()
        }
        .padding()
        .task {
            await vm.loadPersonas(appState: appState)
        }
    }
}
