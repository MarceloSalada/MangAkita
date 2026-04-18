'use client';

import { useEffect, useState } from 'react';

import type { ChapterManifest } from '@/lib/reader/load-manifest';

type ManifestAuditProps = {
  episodeId: string;
};

export function ManifestAudit({ episodeId }: ManifestAuditProps) {
  const [manifest, setManifest] = useState<ChapterManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/manifest/${encodeURIComponent(episodeId)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Manifesto não encontrado');
        }

        const payload = (await response.json()) as ChapterManifest;
        if (isMounted) {
          setManifest(payload);
        }
      } catch {
        if (isMounted) {
          setError('Falha ao carregar o manifesto para auditoria.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [episodeId]);

  if (isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Carregando auditoria do manifesto...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-slate-300">{error}</div>;
  }

  if (!manifest) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Nenhum manifesto disponível.</div>;
  }

  const validUnits = manifest.units.filter((unit) => unit.isLikelyPage);
  const rejectedUnits = manifest.units.filter((unit) => !unit.isLikelyPage);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">audit</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Auditoria do manifesto</h1>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
          <p><span className="font-semibold text-white">Episode ID:</span> {manifest.episodeId ?? 'não informado'}</p>
          <p><span className="font-semibold text-white">Capturados:</span> {manifest.capturedCount}</p>
          <p><span className="font-semibold text-white">Válidos:</span> {manifest.validPageCount}</p>
          <p><span className="font-semibold text-white">Rejeitados:</span> {manifest.rejectedCount}</p>
          <p><span className="font-semibold text-white">Lote dominante:</span> {manifest.dominantBatchKey ?? 'não informado'}</p>
          <p><span className="font-semibold text-white">Tamanho do lote dominante:</span> {manifest.dominantBatchSize ?? 'n/d'}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5">
        <h2 className="text-xl font-semibold text-white">Páginas promovidas</h2>
        {validUnits.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">Nenhuma unidade foi promovida ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {validUnits.map((unit) => (
              <div key={`${unit.index}-${unit.url}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                <p><span className="font-semibold text-white">Página:</span> {unit.index}</p>
                <p><span className="font-semibold text-white">Arquivo:</span> {unit.filename ?? 'não identificado'}</p>
                <p><span className="font-semibold text-white">Batch key:</span> {unit.batchKey ?? 'não informado'}</p>
                <p><span className="font-semibold text-white">Request order:</span> {unit.requestOrder ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Response order:</span> {unit.responseOrder ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Resource type:</span> {unit.resourceType ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Confiança:</span> {unit.confidence ?? 'n/d'}</p>
                <p className="break-all"><span className="font-semibold text-white">URL:</span> {unit.url}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5">
        <h2 className="text-xl font-semibold text-white">Unidades rejeitadas</h2>
        {rejectedUnits.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">Nenhuma unidade foi rejeitada ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {rejectedUnits.map((unit) => (
              <div key={`${unit.index}-${unit.url}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                <p><span className="font-semibold text-white">Página:</span> {unit.index}</p>
                <p><span className="font-semibold text-white">Arquivo:</span> {unit.filename ?? 'não identificado'}</p>
                <p><span className="font-semibold text-white">Batch key:</span> {unit.batchKey ?? 'não informado'}</p>
                <p><span className="font-semibold text-white">Request order:</span> {unit.requestOrder ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Response order:</span> {unit.responseOrder ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Resource type:</span> {unit.resourceType ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Confiança:</span> {unit.confidence ?? 'n/d'}</p>
                <p><span className="font-semibold text-white">Motivo da rejeição:</span> {unit.rejectionReason ?? 'não informado'}</p>
                <p className="break-all"><span className="font-semibold text-white">URL:</span> {unit.url}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
