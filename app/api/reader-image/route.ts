import { NextRequest, NextResponse } from 'next/server';

function isAllowedRemote(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'cdn.comic-walker.com' || hostname === 'comic-walker.com';
}

function buildOrigin() {
  return 'https://comic-walker.com';
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  const referer = request.nextUrl.searchParams.get('referer') || 'https://comic-walker.com/';

  if (!src) {
    return NextResponse.json({ error: 'Parâmetro src é obrigatório.' }, { status: 400 });
  }

  let remoteUrl: URL;
  try {
    remoteUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: 'URL remota inválida.' }, { status: 400 });
  }

  if (!isAllowedRemote(remoteUrl)) {
    return NextResponse.json(
      { error: 'Host remoto não permitido.', host: remoteUrl.hostname },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(remoteUrl, {
      headers: {
        Referer: referer,
        Origin: buildOrigin(),
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao buscar imagem remota.',
          status: upstream.status,
          statusText: upstream.statusText,
          url: remoteUrl.toString(),
        },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro inesperado ao fazer proxy da imagem.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
