import { NextResponse } from 'next/server';

import { DEFAULT_EPISODE_ID, getProjectStatusSummary } from '@/lib/project-status';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const episodeId = url.searchParams.get('episodeId') || DEFAULT_EPISODE_ID;

  try {
    const status = getProjectStatusSummary(episodeId);
    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao montar o status do projeto.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
