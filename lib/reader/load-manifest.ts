export type ReaderUnit = {
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

export type ChapterManifest = {
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
  size?: unknown;
  mime?: unknown;
  hash?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeUnit(rawUnit: unknown, fallbackIndex: number): ReaderUnit | null {
  if (!rawUnit || typeof rawUnit !== 'object') {
    return null;
  }

  const candidate = rawUnit as Record<string, unknown>;
  const url = typeof candidate.url === 'string' ? candidate.url : null;

  if (!url) {
    return null;
  }

  const kindValue = candidate.kind;
  const kind: 'image' | 'unknown' = kindValue === 'image' || kindValue === 'unknown' ? kindValue : 'unknown';

  return {
    index: typeof candidate.index === 'number' ? candidate.index : fallbackIndex,
    url,
    filename: typeof candidate.filename === 'string' ? candidate.filename : null,
    kind,
    confidence: typeof candidate.confidence === 'number' ? candidate.confidence : null,
    isLikelyPage: typeof candidate.isLikelyPage === 'boolean' ? candidate.isLikelyPage : kind === 'image',
    rejectionReason: typeof candidate.rejectionReason === 'string' ? candidate.rejectionReason : null,
    batchKey: typeof candidate.batchKey === 'string' ? candidate.batchKey : null,
    requestOrder: typeof candidate.requestOrder === 'number' ? candidate.requestOrder : null,
    responseOrder: typeof candidate.responseOrder === 'number' ? candidate.responseOrder : null,
    resourceType: typeof candidate.resourceType === 'string' ? candidate.resourceType : null,
  };
}

function normalizeRemoteManifest(rawManifest: unknown): ChapterManifest | null {
  if (!rawManifest || typeof rawManifest !== 'object') {
    return null;
  }

  const candidate = rawManifest as Record<string, unknown>;
  const source = candidate.source;
  const targetUrl = candidate.targetUrl;
  const unitsRaw = Array.isArray(candidate.units) ? candidate.units : [];

  if (source !== 'comicwalker' || typeof targetUrl !== 'string') {
    return null;
  }

  const units = unitsRaw
    .map((unit, index) => normalizeUnit(unit, index + 1))
    .filter((unit): unit is ReaderUnit => unit !== null)
    .sort((left, right) => left.index - right.index);

  const validPageCount = units.filter((unit) => unit.isLikelyPage).length;
  const rejectedCount = units.length - validPageCount;

  return {
    source,
    targetUrl,
    seriesId: typeof candidate.seriesId === 'string' ? candidate.seriesId : null,
    comicId: typeof candidate.comicId === 'string' ? candidate.comicId : null,
    episodeId: typeof candidate.episodeId === 'string' ? candidate.episodeId : null,
    playerType: typeof candidate.playerType === 'string' ? candidate.playerType : null,
    frameCount: typeof candidate.frameCount === 'number' ? candidate.frameCount : null,
    capturedCount: typeof candidate.capturedCount === 'number' ? candidate.capturedCount : units.length,
    validPageCount:
      typeof candidate.validPageCount === 'number' ? candidate.validPageCount : validPageCount,
    rejectedCount:
      typeof candidate.rejectedCount === 'number' ? candidate.rejectedCount : rejectedCount,
    isComplete: typeof candidate.isComplete === 'boolean' ? candidate.isComplete : false,
    dominantBatchKey: typeof candidate.dominantBatchKey === 'string' ? candidate.dominantBatchKey : null,
    dominantBatchSize: typeof candidate.dominantBatchSize === 'number' ? candidate.dominantBatchSize : null,
    units,
  };
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

async function fetchJson(path: string): Promise<unknown | null> {
  const response = await fetch(path, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as unknown;
}

export async function loadManifest(episodeId: string): Promise<ChapterManifest | null> {
  const normalizedEpisodeId = episodeId.trim();

  if (!normalizedEpisodeId) {
    return null;
  }

  const remotePayload = await fetchJson(`/manifests/${encodeURIComponent(normalizedEpisodeId)}.json`);
  const remoteManifest = normalizeRemoteManifest(remotePayload);
  if (remoteManifest) {
    return remoteManifest;
  }

  const capturedPayload = await fetchJson(`/captured/${encodeURIComponent(normalizedEpisodeId)}/manifest-lite.json`);
  return normalizeCapturedManifest(capturedPayload, normalizedEpisodeId);
}
