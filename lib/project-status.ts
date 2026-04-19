import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_EPISODE_ID = 'KC_0085660000200011_E';

type ManifestUnit = {
  isLikelyPage?: boolean;
  rejectionReason?: string | null;
};

type ManifestShape = {
  source?: 'comicwalker' | 'captured-local';
  episodeId?: string | null;
  targetUrl?: string;
  capturedCount?: number;
  validPageCount?: number;
  rejectedCount?: number;
  isComplete?: boolean;
  dominantBatchKey?: string | null;
  dominantBatchSize?: number | null;
  units?: ManifestUnit[];
};

type CapturedManifestItem = {
  order?: unknown;
  tap?: unknown;
  fileName?: unknown;
  mime?: unknown;
};

export type ProjectStatusSummary = {
  projectName: string;
  currentStage: string;
  completedFindings: string[];
  openQuestions: string[];
  blockedBy: string[];
  nextPhaseName: string;
  nextPhaseEntryPoints: string[];
  manifestEpisodeId: string;
  manifestAvailable: boolean;
  capturedCount: number;
  validPageCount: number;
  rejectedCount: number;
  isComplete: boolean;
  dominantBatchKey: string | null;
  dominantBatchSize: number | null;
  topRejectionReasons: string[];
};

function normalizeEpisodeId(episodeId?: string | null) {
  const trimmed = episodeId?.trim();
  return trimmed || DEFAULT_EPISODE_ID;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCapturedManifest(rawManifest: unknown, episodeId: string): ManifestShape | null {
  if (!rawManifest || typeof rawManifest !== 'object') {
    return null;
  }

  const candidate = rawManifest as Record<string, unknown>;
  const itemsRaw = Array.isArray(candidate.items) ? candidate.items : [];

  const units = itemsRaw
    .map((item) => {
      const candidateItem = item as CapturedManifestItem;
      const fileName = readString(candidateItem.fileName);
      if (!fileName) {
        return null;
      }

      return {
        isLikelyPage: true,
        rejectionReason: null,
      } satisfies ManifestUnit;
    })
    .filter((unit): unit is ManifestUnit => unit !== null);

  if (units.length === 0) {
    return null;
  }

  const tapCounts = new Map<string, number>();
  for (const item of itemsRaw) {
    const tap = readNumber((item as CapturedManifestItem).tap);
    const key = tap !== null ? `tap-${tap}` : 'sem-lote';
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

  return {
    source: 'captured-local',
    episodeId,
    targetUrl: readString(candidate.targetUrl) ?? null ?? undefined,
    capturedCount: readNumber(candidate.savedCount) ?? units.length,
    validPageCount: units.length,
    rejectedCount: 0,
    isComplete: true,
    dominantBatchKey,
    dominantBatchSize,
    units,
  };
}

function readCurrentManifest(episodeId: string): ManifestShape | null {
  const remoteManifestPath = path.resolve(process.cwd(), 'public', 'manifests', `${episodeId}.json`);

  if (fs.existsSync(remoteManifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(remoteManifestPath, 'utf8')) as ManifestShape;
    } catch {
      return null;
    }
  }

  const capturedManifestPath = path.resolve(
    process.cwd(),
    'public',
    'captured',
    episodeId,
    'manifest-lite.json',
  );

  if (!fs.existsSync(capturedManifestPath)) {
    return null;
  }

  try {
    const rawManifest = JSON.parse(fs.readFileSync(capturedManifestPath, 'utf8')) as unknown;
    return normalizeCapturedManifest(rawManifest, episodeId);
  } catch {
    return null;
  }
}

function summarizeRejectionReasons(units: ManifestUnit[] | undefined): string[] {
  if (!units?.length) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const unit of units) {
    if (unit.isLikelyPage) {
      continue;
    }

    const reason = unit.rejectionReason || 'unknown-reason';
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => `${reason}: ${count}`);
}

export function getProjectStatusSummary(episodeId?: string | null): ProjectStatusSummary {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId);
  const manifest = readCurrentManifest(normalizedEpisodeId);
  const capturedCount = manifest?.capturedCount ?? 0;
  const validPageCount = manifest?.validPageCount ?? 0;
  const rejectedCount = manifest?.rejectedCount ?? 0;
  const isComplete = manifest?.isComplete ?? false;
  const dominantBatchKey = manifest?.dominantBatchKey ?? null;
  const dominantBatchSize = manifest?.dominantBatchSize ?? null;
  const topRejectionReasons = summarizeRejectionReasons(manifest?.units);
  const sourceLabel = manifest?.source === 'captured-local' ? 'captura local' : 'manifesto remoto';

  return {
    projectName: 'MangAkita',
    currentStage: manifest
      ? `Manifesto carregado para ${manifest.episodeId ?? normalizedEpisodeId} via ${sourceLabel}; ${validPageCount} página(s) válidas, ${rejectedCount} unidade(s) rejeitadas e lote dominante ${dominantBatchKey ?? 'indefinido'}.`
      : `Manifesto ainda não disponível para ${normalizedEpisodeId}; o próximo objetivo operacional é gerar e auditar um manifesto real.`,
    completedFindings: [
      'A nova base Comic Walker-first já está no ar.',
      'O reader já renderiza apenas unidades promovidas como páginas válidas.',
      'A auditoria do manifesto já expõe páginas válidas e unidades rejeitadas.',
      'O fallback local já consegue abrir manifest-lite.json salvo em public/captured/<episodeId>.',
      `Manifesto do episódio consultado disponível: ${manifest ? 'sim' : 'não'}.`,
    ],
    openQuestions: [
      'A sequência local já representa o capítulo todo ou ainda precisa de mais páginas capturadas?',
      'Quais critérios devem ordenar e limpar automaticamente páginas locais capturadas?',
      'Como automatizar a geração do manifesto local após importar arquivos válidos?',
    ],
    blockedBy: [
      'A qualidade final ainda depende da qualidade e da cobertura dos arquivos locais importados.',
      'O fluxo ainda precisa de automação para reduzir operações manuais entre captura, manifesto e reader.',
    ],
    nextPhaseName: 'captured-local-hardening',
    nextPhaseEntryPoints: ['/import', '/reader', '/audit', '/status'],
    manifestEpisodeId: manifest?.episodeId ?? normalizedEpisodeId,
    manifestAvailable: Boolean(manifest),
    capturedCount,
    validPageCount,
    rejectedCount,
    isComplete,
    dominantBatchKey,
    dominantBatchSize,
    topRejectionReasons,
  };
}
