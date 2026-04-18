import Link from 'next/link';

import { getProjectStatusSummary } from '@/lib/project-status';

export default function StatusPage() {
  const status = getProjectStatusSummary();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <Link href="/" className="hover:text-white">
            ← Voltar para a home
          </Link>
          <Link href={`/audit?episodeId=${encodeURIComponent(status.manifestEpisodeId)}`} className="hover:text-white">
            Auditar manifesto padrão →
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">status do projeto</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{status.projectName}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{status.currentStage}</p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">manifesto</p>
            <p className="mt-3 text-2xl font-bold text-white">{status.manifestAvailable ? 'Disponível' : 'Ausente'}</p>
            <p className="mt-2 text-sm text-slate-300">Episódio {status.manifestEpisodeId}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">capturados</p>
            <p className="mt-3 text-2xl font-bold text-white">{status.capturedCount}</p>
            <p className="mt-2 text-sm text-slate-300">Unidades totais no manifesto</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">páginas válidas</p>
            <p className="mt-3 text-2xl font-bold text-white">{status.validPageCount}</p>
            <p className="mt-2 text-sm text-slate-300">Promovidas para o reader</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">rejeitados</p>
            <p className="mt-3 text-2xl font-bold text-white">{status.rejectedCount}</p>
            <p className="mt-2 text-sm text-slate-300">Descartados na validação</p>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <h2 className="text-xl font-semibold text-white">Saúde operacional do manifesto</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
            <p><span className="font-semibold text-white">Completude:</span> {status.isComplete ? 'completo' : 'incompleto'}</p>
            <p><span className="font-semibold text-white">Episódio padrão:</span> {status.manifestEpisodeId}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-white">Principais motivos de rejeição</h3>
            {status.topRejectionReasons.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {status.topRejectionReasons.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">Ainda não há motivos de rejeição registrados no manifesto padrão.</p>
            )}
          </div>
        </section>

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
