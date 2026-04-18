'use client';

import { useEffect, useState } from 'react';

import { ChapterView } from '@/components/reader/chapter-view';
import { loadManifest } from '@/lib/reader/load-manifest';
import type { ChapterManifest } from '@/lib/reader/load-manifest';

type ReaderShellProps = {
  episodeId?: string;
};

const DEFAULT_EPISODE_ID = 'KC_0085660000200011_E';

export function ReaderShell({ episodeId = DEFAULT_EPISODE_ID }: ReaderShellProps) {
  const [manifest, setManifest] = useState<ChapterManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError(null);
      setManifest(null);

      try {
        const loadedManifest = await loadManifest(episodeId);

        if (!isMounted) {
          return;
        }

        if (!loadedManifest) {
          setError(
            `Manifesto não encontrado para ${episodeId}. Gere public/manifests/${episodeId}.json antes de abrir este reader.`,
          );
          return;
        }

        if (loadedManifest.units.length === 0) {
          setError(
            `O manifesto ${episodeId} foi encontrado, mas ainda não tem unidades de leitura utilizáveis.`,
          );
          return;
        }

        setManifest(loadedManifest);
      } catch {
        if (!isMounted) {
          return;
        }

        setError('Falha ao carregar o manifesto do capítulo.');
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
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-300">
        Carregando manifesto do episódio <span className="font-semibold text-white">{episodeId}</span>...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300">reader</p>
        <h1 className="text-2xl font-bold text-white">Manifesto indisponível</h1>
        <p className="text-sm leading-6 text-slate-300">{error}</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-300">
        Nenhum manifesto carregado.
      </div>
    );
  }

  return <ChapterView manifest={manifest} />;
}
