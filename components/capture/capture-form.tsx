'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  const episodeId = useMemo(() => extractEpisodeId(url), [url]);
  const readerHref = episodeId ? `/reader?episodeId=${encodeURIComponent(episodeId)}` : '/reader';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-semibold text-white">Importar capítulo Comic Walker</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Esta tela é o ponto de entrada para o fluxo Comic Walker-first. Nesta fase, ela prioriza episódio e manifesto local em vez de múltiplas fontes legadas.
      </p>

      <div className="mt-6 space-y-4">
        <textarea
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          rows={4}
          placeholder="https://comic-walker.com/detail/.../episodes/..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400/40"
        />

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
          <p><span className="font-semibold text-white">Episode ID detectado:</span> {episodeId || 'não detectado ainda'}</p>
          <p className="mt-2">O próximo passo técnico é ligar esta tela à execução do probe e à reconstrução do manifesto.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={readerHref}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
            >
              Abrir reader do episódio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
