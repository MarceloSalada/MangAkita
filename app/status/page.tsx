import Link from 'next/link';

import { getProjectStatusSummary } from '@/lib/project-status';

export default function StatusPage() {
  const status = getProjectStatusSummary();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Voltar para a home
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">status do projeto</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{status.projectName}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{status.currentStage}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-xl font-semibold text-white">Achados concluídos</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              {status.completedFindings.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-xl font-semibold text-white">Perguntas abertas</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              {status.openQuestions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5">
          <h2 className="text-xl font-semibold text-white">Bloqueios</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
            {status.blockedBy.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <h2 className="text-xl font-semibold text-white">Próxima fase</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{status.nextPhaseName}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
            {status.nextPhaseEntryPoints.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
