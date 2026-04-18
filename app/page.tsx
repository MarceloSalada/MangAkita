import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Comic Walker-first</p>
          <h1 className="mt-2 text-4xl font-bold text-white">MangAkita</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            Reader experimental focado em Comic Walker com arquitetura orientada a probe, manifesto e reader.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/import" className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 hover:border-emerald-400/30">
            <h2 className="text-xl font-semibold text-white">Import</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Informar a URL alvo e preparar o episódio.</p>
          </Link>
          <Link href="/reader" className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 hover:border-emerald-400/30">
            <h2 className="text-xl font-semibold text-white">Reader</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Abrir manifesto local do episódio no reader.</p>
          </Link>
          <Link href="/status" className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 hover:border-emerald-400/30">
            <h2 className="text-xl font-semibold text-white">Status</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Ver o estágio atual e os próximos bloqueios técnicos.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
