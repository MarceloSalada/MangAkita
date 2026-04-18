import type { ChapterManifest } from '@/lib/reader/load-manifest';

type ChapterViewProps = {
  manifest: ChapterManifest;
};

function buildStatusLabel(manifest: ChapterManifest) {
  if (manifest.isComplete) {
    return 'Capítulo pronto';
  }

  if (manifest.validPageCount > 0) {
    return 'Captura parcial';
  }

  return 'Sem páginas válidas';
}

function buildReaderImageUrl(src: string, referer: string) {
  const params = new URLSearchParams({ src, referer });
  return `/api/reader-image?${params.toString()}`;
}

export function ChapterView({ manifest }: ChapterViewProps) {
  const statusLabel = buildStatusLabel(manifest);
  const validUnits = manifest.units.filter((unit) => unit.isLikelyPage);
  const rejectedUnits = manifest.units.filter((unit) => !unit.isLikelyPage);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">reader real</p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              manifest.isComplete
                ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : 'border border-amber-400/30 bg-amber-400/10 text-amber-200'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Episódio {manifest.episodeId ?? 'não informado'}
        </h1>

        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
          <p>
            <span className="font-semibold text-white">Fonte:</span> {manifest.source}
          </p>
          <p>
            <span className="font-semibold text-white">Target URL:</span> {manifest.targetUrl}
          </p>
          <p>
            <span className="font-semibold text-white">Comic ID:</span> {manifest.comicId ?? 'não informado'}
          </p>
          <p>
            <span className="font-semibold text-white">Player type:</span> {manifest.playerType ?? 'não informado'}
          </p>
          <p>
            <span className="font-semibold text-white">Frame count:</span> {manifest.frameCount ?? 'não informado'}
          </p>
          <p>
            <span className="font-semibold text-white">Unidades capturadas:</span> {manifest.capturedCount}
          </p>
          <p>
            <span className="font-semibold text-white">Páginas válidas:</span> {manifest.validPageCount}
          </p>
          <p>
            <span className="font-semibold text-white">Unidades rejeitadas:</span> {manifest.rejectedCount}
          </p>
          <p>
            <span className="font-semibold text-white">Lote dominante:</span> {manifest.dominantBatchKey ?? 'não informado'}
          </p>
          <p>
            <span className="font-semibold text-white">Tamanho do lote dominante:</span> {manifest.dominantBatchSize ?? 'n/d'}
          </p>
        </div>

        {rejectedUnits.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">
            O reader está ignorando {rejectedUnits.length} unidade(s) marcadas como não confiáveis para leitura final.
          </div>
        ) : null}
      </div>

      {validUnits.length === 0 ? (
        <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-sm leading-6 text-slate-300">
          Nenhuma página válida foi promovida para renderização ainda. O próximo passo é melhorar o ranking do probe.
        </div>
      ) : null}

      <div className="space-y-3">
        {validUnits.map((unit) => (
          <article
            key={`${unit.index}-${unit.url}`}
            className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-3 shadow-2xl shadow-black/20"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-300">
              <p>
                <span className="font-semibold text-white">Página:</span> {unit.index}
              </p>
              <p>
                <span className="font-semibold text-white">Kind:</span> {unit.kind}
              </p>
              <p>
                <span className="font-semibold text-white">Confiança:</span> {unit.confidence ?? 'n/d'}
              </p>
              <p className="break-all">
                <span className="font-semibold text-white">Arquivo:</span> {unit.filename ?? 'não identificado'}
              </p>
            </div>

            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-2">
              <img
                src={buildReaderImageUrl(unit.url, manifest.targetUrl)}
                alt={`Página ${unit.index}`}
                loading={unit.index <= 2 ? 'eager' : 'lazy'}
                className="h-auto w-full rounded-xl object-contain"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
