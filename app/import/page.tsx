import Link from 'next/link';

import { CaptureForm } from '@/components/capture/capture-form';

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Voltar para a home
        </Link>
        <CaptureForm />
      </div>
    </main>
  );
}
