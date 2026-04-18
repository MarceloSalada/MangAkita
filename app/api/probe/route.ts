import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { NextResponse } from 'next/server';

const execFileAsync = promisify(execFile);

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

function readManifestIfExists(episodeId: string | null) {
  if (!episodeId) {
    return null;
  }

  const manifestPath = path.resolve(process.cwd(), 'public', 'manifests', `${episodeId}.json`);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; execute?: boolean };
    const requestedUrl = body.url?.trim() ?? '';
    const shouldExecute = body.execute !== false;

    if (!requestedUrl) {
      return NextResponse.json({ error: 'A URL do episódio é obrigatória.' }, { status: 400 });
    }

    if (!isComicWalkerUrl(requestedUrl)) {
      return NextResponse.json({ error: 'URL inválida para Comic Walker.' }, { status: 400 });
    }

    const normalizedUrl = normalizeComicWalkerUrl(requestedUrl);
    const episodeId = extractEpisodeId(normalizedUrl);
    const seriesId = extractSeriesId(normalizedUrl);
    const manifestBefore = readManifestIfExists(episodeId);

    let execution = {
      attempted: false,
      executed: false,
      mode: 'validation-only',
      detail: 'A API validou a URL, mas não tentou executar o probe.',
      stdout: '',
      stderr: '',
    };

    if (shouldExecute && episodeId) {
      execution.attempted = true;
      execution.mode = 'local-probe';

      try {
        const result = await execFileAsync(
          process.execPath,
          [path.resolve(process.cwd(), 'tools', 'comicwalker-probe.mjs'), normalizedUrl],
          {
            cwd: process.cwd(),
            timeout: 120000,
            maxBuffer: 1024 * 1024,
          },
        );

        execution.executed = true;
        execution.detail = 'O probe local foi executado e o manifesto foi atualizado no workspace atual.';
        execution.stdout = result.stdout ?? '';
        execution.stderr = result.stderr ?? '';
      } catch (error) {
        execution.executed = false;
        execution.detail =
          'A URL foi validada, mas o ambiente atual não conseguiu executar o probe local. Isso pode acontecer em ambientes sem Playwright/Chromium prontos para execução.';
        execution.stderr = error instanceof Error ? error.message : String(error);
      }
    }

    const manifestAfter = readManifestIfExists(episodeId);

    return NextResponse.json({
      source: 'comicwalker',
      requestedUrl,
      normalizedUrl,
      seriesId,
      comicId: seriesId,
      episodeId,
      diagnosisSummary: execution.executed
        ? 'O probe local foi executado e o manifesto do episódio foi reconstruído ou atualizado.'
        : 'A URL foi validada para o fluxo Comic Walker-first.',
      nextRequiredStep: execution.executed
        ? 'Inspecionar o manifesto em /audit e validar a qualidade das páginas promovidas.'
        : 'Executar o probe em um ambiente local com Playwright/Chromium para gerar ou atualizar public/manifests/<episodeId>.json.',
      readerHref: episodeId ? `/reader?episodeId=${encodeURIComponent(episodeId)}` : '/reader',
      auditHref: episodeId ? `/audit?episodeId=${encodeURIComponent(episodeId)}` : '/audit',
      manifestApiHref: episodeId ? `/api/manifest/${encodeURIComponent(episodeId)}` : null,
      execution,
      manifestBefore,
      manifestAfter,
    });
  } catch {
    return NextResponse.json({ error: 'Falha ao preparar ou executar o probe.' }, { status: 500 });
  }
}
