import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_EPISODE_ID = 'KC_0085660000200011_E';

type ManifestUnit = {
  isLikelyPage?: boolean;
  rejectionReason?: string | null;
};

type ManifestShape = {
  episodeId?: string | null;
  targetUrl?: string;
  capturedCount?: number;
  validPageCount?: number;
  rejectedCount?: number;
  isComplete?: boolean;
  units?: ManifestUnit[];
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
  topRejectionReasons: string[];
};

function normalizeEpisodeId(episodeId?: string | null) {
  const trimmed = episodeId?.trim();
  return trimmed || DEFAULT_EPISODE_ID;
}

function readCurrentManifest(episodeId: string): ManifestShape | null {
  const manifestPath = path.resolve(process.cwd(), 'public', 'manifests', `${episodeId}.json`);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ManifestShape;
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
  const topRejectionReasons = summarizeRejectionReasons(manifest?.units);

  return {
    projectName: 'MangAkita',
    currentStage: manifest
      ? `Manifesto carregado para ${manifest.episodeId ?? normalizedEpisodeId}; ${validPageCount} página(s) válidas e ${rejectedCount} unidade(s) rejeitadas neste episódio.`
      : `Manifesto ainda não disponível para ${normalizedEpisodeId}; o próximo objetivo operacional é gerar e auditar um manifesto real.`,
    completedFindings: [
      'A nova base Comic Walker-first já está no ar.',
      'O reader já renderiza apenas unidades promovidas como páginas válidas.',
      'A auditoria do manifesto já expõe páginas válidas e unidades rejeitadas.',
      `Manifesto do episódio consultado disponível: ${manifest ? 'sim' : 'não'}.`,
    ],
    openQuestions: [
      'Existe um endpoint JSON do viewer com a lista ordenada de páginas reais?',
      'O score atual do probe já separa bem páginas reais de assets em todos os episódios?',
      'Quais regras adicionais devem promover ou rejeitar candidatos no manifesto?',
    ],
    blockedBy: [
      'A qualidade final ainda depende do ambiente conseguir executar o probe com Playwright/Chromium.',
      'O ranking atual ainda pode precisar de mais sinais além de nome, path e coerência de lote.',
    ],
    nextPhaseName: 'comicwalker-manifest-hardening',
    nextPhaseEntryPoints: ['/import', '/reader', '/audit', '/status'],
    manifestEpisodeId: manifest?.episodeId ?? normalizedEpisodeId,
    manifestAvailable: Boolean(manifest),
    capturedCount,
    validPageCount,
    rejectedCount,
    isComplete,
    topRejectionReasons,
  };
}
