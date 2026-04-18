import fs from 'node:fs';
import path from 'node:path';

import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ episodeId: string }> },
) {
  const { episodeId } = await context.params;

  if (!episodeId?.trim()) {
    return NextResponse.json({ error: 'Episode ID é obrigatório.' }, { status: 400 });
  }

  const manifestPath = path.resolve(process.cwd(), 'public', 'manifests', `${episodeId}.json`);

  if (!fs.existsSync(manifestPath)) {
    return NextResponse.json(
      { error: 'Manifesto não encontrado.', episodeId },
      { status: 404 },
    );
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao ler o manifesto.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
