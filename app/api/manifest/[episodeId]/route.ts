import fs from 'node:fs';
import path from 'node:path';

import { NextResponse } from 'next/server';

type ReaderUnit = {
  index: number;
  url: string;
  filename: string | null;
  kind: 'image' | 'unknown';
  confidence: number | null;
  isLikelyPage: boolean;
  rejectionReason: string | null;
  batchKey: string | null;
  requestOrder: number | null;
  responseOrder: number | null;
  resourceType: string | null;
};

type ChapterManifest = {
  source: 'comicwalker' | 'captured-local';
  targetUrl: string;
  seriesId: string | null;
  comicId: string | null;
  episodeId: string | null;
  playerType: string | null;
  frameCount: number | null;
  capturedCount: number;
  validPageCount: number;
  rejectedCount: number;
  isComplete: boolean;
  dominantBatchKey: string | null;
  dominantBatchSize: number | null;
  units: ReaderUnit[];
};

type CapturedManifestItem = {
  order?: unknown;
  tap?: unknown;
  fileName?: unknown;
  mime?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCapturedManifest(rawManifest: unknown, episodeId: string): ChapterManifest | null {
  if (!rawManifest || typeof rawManifest !== 'object') {
    return null;
  }

  const candidate = rawManifest as Record<string, unknown>;
  const itemsRaw = Array.isArray(candidate.items) ? candidate.items : [];
  const basePath = `/captured/${encodeURIComponent(episodeId)}`;

  const units = itemsRaw
    .map((item, index) => {
      const candidateItem = item as CapturedManifestItem;
      const fileName = readString(candidateItem.fileName);

      if (!fileName) {
        return null;
      }

      const tap = readNumber(candidateItem.tap);
      const order = readNumber(candidateItem.order) ?? index + 1;
      const mime = readString(candidateItem.mime);

      return {
        index: order,
        url: `${basePath}/${encodeURIComponent(fileName)}`,
        filename: fileName,
        kind: 'image' as const,
        confidence: null,
        isLikelyPage: true,
        rejectionReason: null,
        batchKey: tap !== null ? `tap-${tap}` : null,
        requestOrder: tap,
        responseOrder: null,
        resourceType: mime,
      } satisfies ReaderUnit;
    })
    .filter((unit): unit is ReaderUnit => unit !== null)
    .sort((left, right) => left.index - right.index);

  if (units.length === 0) {
    return null;
  }

  const tapCounts = new Map<string, number>();
  for (const unit of units) {
    const key = unit.batchKey ?? 'sem-lote';
    tapCounts.set(key, (tapCounts.get(key) ?? 0) + 1);
  }

  let dominantBatchKey: string | null = null;
  let dominantBatchSize: number | null = null;
  for (const [key, count] of tapCounts.entries()) {
    if (dominantBatchSize === null || count > dominantBatchSize) {
      dominantBatchKey = key;
      dominantBatchSize = count;
    }
  }

  const targetUrl = readString(candidate.targetUrl) ?? basePath;
  const savedCount = readNumber(candidate.savedCount) ?? units.length;

  return {
    source: 'captured-local',
    targetUrl,
    seriesId: null,
    comicId: null,
    episodeId,
    playerType: 'local-captured',
    frameCount: units.length,
    capturedCount: savedCount,
    validPageCount: units.length,
    rejectedCount: 0,
    isComplete: true,
    dominantBatchKey,
    dominantBatchSize,
    units,
  };
}

function readRemoteManifest(episodeId: string): ChapterManifest | null {
  const manifestPath = path.resolve(process.cwd(), 'public', 'manifests', `${episodeId}.json`);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ChapterManifest;
  } catch {
    return null;
  }
}

function readCapturedManifest(episodeId: string): ChapterManifest | null {
  const manifestPath = path.resolve(
    process.cwd(),
    'public',
    'captured',
    episodeId,
    'manifest-lite.json',
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
    return normalizeCapturedManifest(rawManifest, episodeId);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ episodeId: string }> },
) {
  const { episodeId } = await context.params;

  if (!episodeId?.trim()) {
    return NextResponse.json({ error: 'Episode ID é obrigatório.' }, { status: 400 });
  }

  const manifest = readRemoteManifest(episodeId) ?? readCapturedManifest(episodeId);

  if (!manifest) {
    return NextResponse.json(
      { error: 'Manifesto não encontrado.', episodeId },
      { status: 404 },
    );
  }

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
