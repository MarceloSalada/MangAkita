#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TARGET_URL =
  'https://comic-walker.com/detail/KC_008566_S/episodes/KC_0085660000200011_E';

const WAIT_AFTER_OPEN_MS = 7000;
const TAP_WAIT_MS = 2500;
const MAX_TAPS = 36;
const STAGNANT_TAP_LIMIT = 6;
const MIN_BLOB_SIZE = 50_000;

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

function sniffExtensionFromBuffer(buffer, mime) {
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return 'bin';
}

function createEmptyManifest(targetUrl, episodeId) {
  return {
    source: 'captured-local',
    targetUrl,
    episodeId,
    savedCount: 0,
    tapsExecuted: 0,
    stagnantTapLimit: STAGNANT_TAP_LIMIT,
    maxTaps: MAX_TAPS,
    items: [],
  };
}

async function main(targetUrl) {
  const episodeId = extractEpisodeId(targetUrl);
  const outputDir = path.resolve(process.cwd(), 'public', 'captured', episodeId);
  ensureDirectory(outputDir);

  const manifestPath = path.join(outputDir, 'manifest-lite.json');
  const debugPath = path.join(outputDir, 'capture-debug.json');

  const manifest = createEmptyManifest(targetUrl, episodeId);
  const savedHashes = new Set();
  const savedItems = [];
  const captureEvents = [];
  let currentTap = 0;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-software-rasterizer'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  await page.exposeFunction('saveCapturedBlobFromPage', async (payload) => {
    if (!payload || typeof payload !== 'object') {
      return { saved: false, reason: 'invalid-payload' };
    }

    const dataUrl = typeof payload.dataUrl === 'string' ? payload.dataUrl : null;
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return { saved: false, reason: 'missing-data-url' };
    }

    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
    const mime = mimeMatch?.[1] ?? (typeof payload.mime === 'string' ? payload.mime : 'application/octet-stream');
    const base64 = dataUrl.split(',')[1] ?? '';
    if (!base64) {
      return { saved: false, reason: 'empty-base64' };
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length < MIN_BLOB_SIZE) {
      return { saved: false, reason: 'blob-too-small', size: buffer.length };
    }

    const hash = crypto.createHash('sha1').update(buffer).digest('hex');
    if (savedHashes.has(hash)) {
      return { saved: false, reason: 'duplicate-hash', hash, size: buffer.length };
    }

    const tap = Number.isFinite(payload.tap) ? Number(payload.tap) : currentTap;
    const order = savedItems.length + 1;
    const extension = sniffExtensionFromBuffer(buffer, mime);
    const fileName = `page_${String(order).padStart(3, '0')}_tap${String(tap).padStart(2, '0')}_${hash.slice(0, 12)}.${extension}`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const item = {
      order,
      tap,
      fileName,
      mime,
      size: buffer.length,
      hash,
      width: Number.isFinite(payload.width) ? Number(payload.width) : null,
      height: Number.isFinite(payload.height) ? Number(payload.height) : null,
      sourceType: typeof payload.sourceType === 'string' ? payload.sourceType : null,
    };

    savedHashes.add(hash);
    savedItems.push(item);
    manifest.savedCount = savedItems.length;
    manifest.items = savedItems;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`[Disk] Salvo | tap=${tap} | file=${fileName} | size=${buffer.length}`);
    return { saved: true, hash, fileName, size: buffer.length, order };
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[MangAkitaCapture]')) {
      console.log(`[PAGE] ${text}`);
    }
  });

  await page.addInitScript((minBlobSize) => {
    window.__mangakitaTap = 0;
    window.__mangakitaLastDraw = null;

    const safeSave = async (payload) => {
      try {
        return await window.saveCapturedBlobFromPage?.(payload);
      } catch (error) {
        console.log('[MangAkitaCapture] save-error', String(error));
        return null;
      }
    };

    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function createObjectURLPatched(obj) {
      const url = originalCreateObjectURL(obj);
      if (obj instanceof Blob && typeof obj.size === 'number' && obj.size >= minBlobSize) {
        const reader = new FileReader();
        const tap = window.__mangakitaTap ?? 0;
        const lastDraw = window.__mangakitaLastDraw ?? null;
        reader.onloadend = async () => {
          await safeSave({
            tap,
            dataUrl: typeof reader.result === 'string' ? reader.result : null,
            mime: obj.type || '',
            width: lastDraw?.width ?? null,
            height: lastDraw?.height ?? null,
            sourceType: lastDraw?.sourceType ?? null,
          });
        };
        reader.readAsDataURL(obj);
      }
      return url;
    };

    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function drawImagePatched(source, ...args) {
      const width = source?.naturalWidth || source?.videoWidth || source?.width || null;
      const height = source?.naturalHeight || source?.videoHeight || source?.height || null;
      const sourceType = source?.constructor?.name || typeof source;
      window.__mangakitaLastDraw = {
        width,
        height,
        sourceType,
        src: typeof source?.src === 'string' ? source.src : null,
      };
      return originalDrawImage.call(this, source, ...args);
    };
  }, MIN_BLOB_SIZE);

  async function detectBestCanvas() {
    return page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const ranked = canvases
        .map((canvas, index) => {
          const rect = canvas.getBoundingClientRect();
          const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
          const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
          const visibleArea = visibleWidth * visibleHeight;
          return {
            index,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            visibleArea,
          };
        })
        .filter((item) => item.width >= 200 && item.height >= 200)
        .sort((a, b) => b.visibleArea - a.visibleArea);

      return ranked[0] ?? null;
    });
  }

  async function tapCanvas(box, tapNumber) {
    const targetX = Math.round(box.x + box.width * 0.1);
    const targetY = Math.round(box.y + box.height * 0.5);
    await page.evaluate((nextTap) => {
      window.__mangakitaTap = nextTap;
    }, tapNumber);
    console.log(`=== TAP ${tapNumber} ===`);
    console.log(`[Tap] x=${targetX} y=${targetY}`);
    await page.touchscreen.tap(targetX, targetY);
    await page.waitForTimeout(TAP_WAIT_MS);
  }

  try {
    console.log(`[CaptureLocal] Abrindo ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(WAIT_AFTER_OPEN_MS);

    const canvasBox = await detectBestCanvas();
    if (!canvasBox) {
      throw new Error('Nenhum canvas útil foi encontrado para navegação.');
    }

    console.log(`[Canvas] index=${canvasBox.index} x=${canvasBox.x} y=${canvasBox.y} w=${canvasBox.width} h=${canvasBox.height}`);

    let stagnantTaps = 0;
    let previousSavedCount = savedItems.length;

    for (let tap = 1; tap <= MAX_TAPS; tap += 1) {
      currentTap = tap;
      await tapCanvas(canvasBox, tap);
      manifest.tapsExecuted = tap;

      const savedNow = savedItems.length - previousSavedCount;
      captureEvents.push({ tap, savedNow, savedTotal: savedItems.length, observedAt: new Date().toISOString() });
      console.log(`[Capture] tap=${tap} novos=${savedNow} total=${savedItems.length}`);

      if (savedNow <= 0) {
        stagnantTaps += 1;
      } else {
        stagnantTaps = 0;
      }

      previousSavedCount = savedItems.length;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      if (stagnantTaps >= STAGNANT_TAP_LIMIT) {
        console.log(`[Capture] Encerrando por estagnação após ${stagnantTaps} taps sem páginas novas.`);
        break;
      }
    }
  } finally {
    fs.writeFileSync(
      debugPath,
      JSON.stringify(
        {
          targetUrl,
          episodeId,
          savedCount: savedItems.length,
          tapsExecuted: manifest.tapsExecuted,
          stagnantTapLimit: STAGNANT_TAP_LIMIT,
          maxTaps: MAX_TAPS,
          events: captureEvents,
          items: savedItems,
        },
        null,
        2,
      ),
      'utf8',
    );

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[CaptureLocal] manifest-lite: ${manifestPath}`);
    console.log(`[CaptureLocal] debug: ${debugPath}`);
    console.log(`[CaptureLocal] savedCount: ${savedItems.length}`);

    if (browser.isConnected()) {
      await browser.close().catch(() => null);
    }
  }
}

const targetUrl = process.argv[2] || DEFAULT_TARGET_URL;
main(targetUrl).catch((error) => {
  console.error('[CaptureLocal] Erro fatal:', error);
  process.exitCode = 1;
});
