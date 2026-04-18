import Link from 'next/link';

import { ReaderShell } from '@/components/reader/reader-shell';

type ReaderPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const DEFAULT_EPISODE_ID = 'KC_0085660000200011_E';

export default async function ReaderPage({ searchParams }: ReaderPageProps) {
  const params = searchParams ? await searchParams : {};
  const episodeId = readFirst(params.episodeId) ?? DEFAULT_EPISODE_ID;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Voltar para a home
        </Link>
        <ReaderShell episodeId={episodeId} />
      </div>
    </main>
  );
}
