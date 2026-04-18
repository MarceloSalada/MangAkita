import { NextResponse } from 'next/server';

function normalizeComicWalkerUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function extractEpisodeId(targetUrl: string) {
  try {
    const url = new URL(targetUrl);
    const match = url.pathname.match(/\/episodes\/([^/?#]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractSeriesId(targetUrl: string) {
  try {
    const url = new URL(targetUrl);
    const match = url.pathname.match(/\/detail\/([^/]+)\/episodes\//i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function isComicWalkerUrl(rawUrl: string) {
  const normalized = normalizeComicWalkerUrl(rawUrl);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    return url.hostname === 'comic-walker.com' && /\/detail\/[^/]+\/episodes\//i.test(url.pathname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const requestedUrl = body.url?.trim() ?? '';

    if (!requestedUrl) {
      return NextResponse.json({ error: 'A URL do episódio é obrigatória.' }, { status: 400 });
    }

    if (!isComicWalkerUrl(requestedUrl)) {
      return NextResponse.json(
        { error: 'URL inválida para Comic Walker.' },
        { status: 400 },
      );
    }

    const normalizedUrl = normalizeComicWalkerUrl(requestedUrl);
    const episodeId = extractEpisodeId(normalizedUrl);
    const seriesId = extractSeriesId(normalizedUrl);

    return NextResponse.json({
      source: 'comicwalker',
      requestedUrl,
      normalizedUrl,
      seriesId,
      comicId: seriesId,
      episodeId,
      diagnosisSummary: 'A URL foi validada para o fluxo Comic Walker-first.',
      nextRequiredStep: 'Executar o probe real para gerar ou atualizar public/manifests/<episodeId>.json.',
      readerHref: episodeId ? `/reader?episodeId=${encodeURIComponent(episodeId)}` : '/reader',
      manifestApiHref: episodeId ? `/api/manifest/${encodeURIComponent(episodeId)}` : null,
    });
  } catch {
    return NextResponse.json({ error: 'Falha ao preparar o probe.' }, { status: 500 });
  }
}
