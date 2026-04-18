#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TARGET_URL = 'https://comic-walker.com/detail/KC_008566_S/episodes/KC_0085660000200011_E';

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

function extractFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}

function looksLikeComicPage(url) {
  const lower = url.toLowerCase();
  const filename = extractFilenameFromUrl(url)?.toLowerCase() ?? '';

  if (!lower.includes('comic-walker')) return false;
  if (!filename) return false;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) return false;
  if (filename.endsWith('.svg')) return false;

  const blockedFragments = ['sprite', 'dots', 'logo', 'icon', 'badge', 'promotion', 'appstore', 'abj'];
  if (blockedFragments.some((fragment) => filename.includes(fragment) || lower.includes(fragment))) {
    return false;
  }

  if (/^\d{6,}_[0-9_]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    return true;
  }

  return lower.includes('/resized/');
}

function buildManifest(targetUrl, responses) {
  const episodeId = extractEpisodeId(targetUrl);
  const seriesId = extractSeriesId(targetUrl);
  const units = responses
    .filter((url) => looksLikeComicPage(url))
    .map((url, index) => ({
      index: index + 1,
      url,
      filename: extractFilenameFromUrl(url),
      kind: 'image',
    }));

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

  const manifest = buildManifest(targetUrl, []);

  fs.writeFileSync(
    path.join(debugDir, 'comicwalker-probe-report.json'),
    JSON.stringify({ targetUrl, note: 'initial scaffold probe', manifestSummary: manifest }, null, 2),
    'utf8',
  );

  fs.writeFileSync(
    path.join(manifestDir, `${manifest.episodeId}.json`),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  console.log(`[MangAkita] scaffold probe manifest created for ${manifest.episodeId}`);
}

const targetUrl = process.argv[2] || DEFAULT_TARGET_URL;
main(targetUrl).catch((error) => {
  console.error('[MangAkita] probe error:', error);
  process.exitCode = 1;
});
