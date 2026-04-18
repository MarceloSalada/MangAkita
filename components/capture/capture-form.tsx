'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type ProbeResponse = {
  source: 'comicwalker';
  requestedUrl: string;
  normalizedUrl: string;
  seriesId: string | null;
  comicId: string | null;
  episodeId: string | null;
  diagnosisSummary: string;
  nextRequiredStep: string;
  readerHref: string;
  manifestApiHref: string | null;
};

function extractEpisodeId(url: string) {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/\/episodes\/([^/?#]+)/i);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

export function CaptureForm() {
  const [url, setUrl] = useState('https://comic-walker.com/detail/KC_008566_S/episodes/KC_0085660000200011_E');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProbeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const episodeId = useMemo(() => extractEpisodeId(url), [url]);
  const fallbackReaderHref = episodeId ? `/reader?episodeId=${encodeURIComponent(episodeId)}` : '/reader';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'Falha ao preparar o probe.');
        return;
      }

      setResult(payload as ProbeResponse);
    } catch {
      setError('Falha ao chamar a API de probe.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-semibold text-white">Importar capítulo Comic Walker</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Esta tela agora valida a URL no backend e prepara a próxima etapa do fluxo Comic Walker-first.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <textarea
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          rows={4}
          placeholder="https://comic-walker.com/detail/.../episodes/..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400/40"
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition enabled:hover:border-emerald-300/40 enabled:hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? 'Validando URL...' : 'Preparar probe'}
          </button>

          <Link
            href={fallbackReaderHref}
            className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900"
          >
            Abrir reader direto
          </Link>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
        <p><span className="font-semibold text-white">Episode ID detectado:</span> {episodeId || 'não detectado ainda'}</p>
        <p className="mt-2">O próximo passo técnico é executar o probe real e atualizar o manifesto local.</p>
      </div>

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-slate-300">
          <p><span className="font-semibold text-white">Fonte:</span> {result.source}</p>
          <p><span className="font-semibold text-white">URL normalizada:</span> {result.normalizedUrl}</p>
          <p><span className="font-semibold text-white">Series ID:</span> {result.seriesId ?? 'não detectado'}</p>
          <p><span className="font-semibold text-white">Episode ID:</span> {result.episodeId ?? 'não detectado'}</p>
          <p className="mt-3"><span className="font-semibold text-white">Diagnóstico:</span> {result.diagnosisSummary}</p>
          <p className="mt-2"><span className="font-semibold text-white">Próximo passo:</span> {result.nextRequiredStep}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={result.readerHref}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
            >
              Abrir reader do episódio
            </Link>
            {result.manifestApiHref ? (
              <a
                href={result.manifestApiHref}
                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900"
              >
                Abrir API do manifesto
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
