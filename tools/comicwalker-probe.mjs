#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TARGET_URL =
  'https://comic-walker.com/detail/KC_008566_S/episodes/KC_0085660000200011_E';
const WAIT_AFTER_OPEN_MS = 10000;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function extractEpisodeId(targetUrl) {
  try {
    const url = new URL(targetUrl);
    const match = url.pathname.match(/\/episodes\/([^/?#]+)/i);
    return match?.[1] ?? 'unknown-episode';
  } catch {
    return 'unknown-episode';
  }
}

function extractSeriesId(targetUrl) {
  try {
    const url = new URL(targetUrl);
    const match = url.pathname.match(/\/detail\/([^/]+)\/episodes\//i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}

function isInterestingUrl(url) {
  const host = extractHostname(url);
  if (!host) return false;
  return (
    host === 'comic-walker.com' ||
    host.endsWith('.comic-walker.com') ||
    host.includes('comicwalker') ||
    host.includes('kadocomi') ||
    host.includes('amazonaws.com') ||
    host.includes('cloudfront.net')
  );
}

function classifyResponse(url, contentType) {
  if (url.startsWith('blob:')) return 'blob';
  if (contentType.includes('application/json')) return 'json';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('text/html')) return 'html';
  if (contentType.includes('javascript')) return 'script';
  return 'other';
}

function looksLikeComicPage(url) {
  const lower = url.toLowerCase();
  const filename = extractFilenameFromUrl(url)?.toLowerCase() ?? '';

  if (!lower.includes('cdn.comic-walker.com')) return false;
  if (!filename) return false;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) return false;
  if (filename.endsWith('.svg')) return false;
  if (lower.includes('/library/assets/')) return false;

  const blockedFragments = [
    'sprite',
    'dots',
    'logo',
    'icon',
    'badge',
    'promotion',
    'downloadcode',
    'appstore',
    'apppromotion',
    'applogo',
    'abj',
  ];

  if (blockedFragments.some((fragment) => filename.includes(fragment) || lower.includes(fragment))) {
    return false;
  }

  const likelyPagePatterns = [
    /^\d{6,}_[0-9_]+\.(jpg|jpeg|png|webp)$/i,
    /^\d{6,}-[0-9_]+\.(jpg|jpeg|png|webp)$/i,
    /^\d{6,}[a-z0-9_-]*\.(jpg|jpeg|png|webp)$/i,
  ];

  if (likelyPagePatterns.some((pattern) => pattern.test(filename))) {
    return true;
  }

  if (lower.includes('/integration/cdpf/resources/') && lower.includes('/resized/')) {
    return true;
  }

  return false;
}

function buildManifest({ targetUrl, responses }) {
  const episodeId = extractEpisodeId(targetUrl);
  const seriesId = extractSeriesId(targetUrl);

  const imageResponses = responses.filter(
    (item) => item.kind === 'image' && item.url && looksLikeComicPage(item.url),
  );

  const seen = new Set();
  const units = [];

  for (const item of imageResponses) {
    if (!item.url) continue;
    const filename = extractFilenameFromUrl(item.url);
    const key = `${filename ?? 'no-file'}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    units.push({
      index: units.length + 1,
      url: item.url,
      filename,
      kind: 'image',
    });
  }

  return {
    source: 'comicwalker',
    targetUrl,
    seriesId,
    comicId: seriesId,
    episodeId,
    playerType: 'image-sequence',
    frameCount: units.length || null,
    capturedCount: units.length,
    isComplete: units.length > 0,
    units,
  };
}

async function main(targetUrl) {
  const episodeId = extractEpisodeId(targetUrl);
  const debugDir = path.resolve(process.cwd(), 'debug', episodeId);
  const manifestDir = path.resolve(process.cwd(), 'public', 'manifests');
  ensureDirectory(debugDir);
  ensureDirectory(manifestDir);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const requests = [];
  const responses = [];
  const runtimeEvents = [];

  await page.exposeFunction('reportComicWalkerRuntimeEvent', (event) => {
    runtimeEvents.push({
      ...event,
      observedAt: new Date().toISOString(),
    });
  });

  await page.addInitScript(() => {
    const safeReport = (event) => {
      try {
        window.reportComicWalkerRuntimeEvent?.(event);
      } catch {}
    };

    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (object) {
      const blobUrl = originalCreateObjectURL.call(this, object);
      safeReport({
        type: 'blob-url-created',
        blobUrl,
        size: typeof object?.size === 'number' ? object.size : null,
        mimeType: object?.type || '',
      });
      return blobUrl;
    };

    if (typeof window.createImageBitmap === 'function') {
      const originalCreateImageBitmap = window.createImageBitmap;
      window.createImageBitmap = async function (...args) {
        const result = await originalCreateImageBitmap.apply(this, args);
        const source = args[0];
        safeReport({
          type: 'createImageBitmap',
          sourceType: source?.constructor?.name || typeof source,
          width: result?.width || null,
          height: result?.height || null,
          sourceSize: typeof source?.size === 'number' ? source.size : null,
          sourceMimeType: source?.type || '',
        });
        return result;
      };
    }
  });

  page.on('request', (request) => {
    const url = request.url();
    if (!isInterestingUrl(url)) return;
    requests.push({
      observedAt: new Date().toISOString(),
      url,
      hostname: extractHostname(url),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });

  page.on('response', async (response) => {
    const url = response.url();
    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    const kind = classifyResponse(url, contentType);
    if (!isInterestingUrl(url) && kind !== 'blob') return;

    let payloadExcerpt = null;
    let jsonKeys = [];

    try {
      if (kind === 'json') {
        const json = await response.json();
        jsonKeys = json && typeof json === 'object' ? Object.keys(json).slice(0, 20) : [];
        payloadExcerpt = JSON.stringify(json).slice(0, 2000);
      } else if (kind === 'html' || kind === 'script') {
        const text = await response.text();
        payloadExcerpt = text.slice(0, 2000);
      }
    } catch {
      payloadExcerpt = null;
    }

    responses.push({
      observedAt: new Date().toISOString(),
      url,
      hostname: extractHostname(url),
      status: response.status(),
      contentType,
      kind,
      jsonKeys,
      payloadExcerpt,
    });
  });

  try {
    console.log(`[ComicWalkerProbe] Abrindo ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 300)).catch(() => null);
    await page.waitForTimeout(WAIT_AFTER_OPEN_MS);
  } catch (error) {
    console.warn('[ComicWalkerProbe] A navegação falhou parcialmente, mas a saída será salva.');
    console.warn(error instanceof Error ? error.message : String(error));
  } finally {
    const manifest = buildManifest({ targetUrl, responses });
    const report = {
      targetUrl,
      timestamp: new Date().toISOString(),
      requestCount: requests.length,
      responseCount: responses.length,
      runtimeEventCount: runtimeEvents.length,
      requests,
      responses,
      runtimeEvents,
      manifestSummary: {
        source: manifest.source,
        comicId: manifest.comicId,
        seriesId: manifest.seriesId,
        episodeId: manifest.episodeId,
        playerType: manifest.playerType,
        frameCount: manifest.frameCount,
        capturedCount: manifest.capturedCount,
        isComplete: manifest.isComplete,
      },
    };

    const reportPath = path.join(debugDir, 'comicwalker-probe-report.json');
    const manifestPath = path.join(manifestDir, `${manifest.episodeId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`[ComicWalkerProbe] report: ${reportPath}`);
    console.log(`[ComicWalkerProbe] manifest: ${manifestPath}`);
    console.log(`[ComicWalkerProbe] captured images: ${manifest.capturedCount}`);
    console.log(`[ComicWalkerProbe] runtime events: ${runtimeEvents.length}`);

    if (browser.isConnected()) {
      await browser.close().catch(() => null);
    }
  }
}

const targetUrl = process.argv[2] || DEFAULT_TARGET_URL;
main(targetUrl).catch((error) => {
  console.error('[ComicWalkerProbe] Erro fatal:', error);
  process.exitCode = 1;
});
