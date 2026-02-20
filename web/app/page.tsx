import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold">Relate Coach MVP</h1>
      <p className="mt-4 text-lg text-slate-600">Voice turns run through one endpoint: STT, coaching response, and TTS.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:scale-[1.02]" href="/tester">
          Open Web Tester
        </Link>
        <Link className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50" href="/persona-lab">
          Open Persona Lab
        </Link>
      </div>
    </main>
  );
}
