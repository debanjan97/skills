#!/usr/bin/env node
// Capture every page image of one or more manga chapters into pages/<label>/NNN.<ext>.
//
// Opens a VISIBLE Chrome window (never headless) on a persistent profile, so
// the user can watch, pass any human check themselves, and keep their session
// between runs. Nothing here tries to get past bot checks: if a check shows,
// the script waits for the user to clear it in the window.
//
// Several chapters run at once, one tab each (--tabs, default 3). Pass --url and
// --label once per chapter, in matching order.
//
// Usage:
//   node scripts/capture.mjs --url <chapter url> --label c1050 [--url <url> --label c1051 ...]
//        [--selector '#imgs img'] [--tabs 3] [--min-width 500] [--wait 300]
import { chromium } from 'playwright-core';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', multiple: true },
    label: { type: 'string', multiple: true },
    'min-width': { type: 'string', default: '500' },
    wait: { type: 'string', default: '300' },
    tabs: { type: 'string', default: '3' },
    // CSS selector for the reader's page images, e.g. '#imgs img'; keeps comment and ad images out.
    selector: { type: 'string', default: 'img' },
    profile: { type: 'string', default: path.join(homedir(), 'anime-shorts', '.browser-profile') },
  },
});
const urls = args.url ?? [];
const labels = args.label ?? [];
if (!urls.length || urls.length !== labels.length) {
  console.error('usage: capture.mjs --url <chapter url> --label <c1050> [--url ... --label ...]  (one --label per --url)');
  process.exit(2);
}
const minWidth = Number(args['min-width']);
const LAZY_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-url'];

const context = await chromium.launchPersistentContext(args.profile, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 900 },
});

async function captureChapter(url, label) {
  const outDir = path.resolve('pages', label);
  await mkdir(outDir, { recursive: true });
  const page = await context.newPage();

  // Keep the original bytes of every image response, keyed by URL. This avoids
  // re-downloading (which many CDNs refuse without the reader's referer) and
  // avoids CORS limits on fetching from inside the page.
  const bodies = new Map();
  page.on('response', async (res) => {
    const type = res.headers()['content-type'] ?? '';
    if (!type.startsWith('image/')) return;
    try {
      bodies.set(res.url(), { buf: await res.body(), type });
    } catch {
      /* redirects and aborted loads carry no body */
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log(`[${label}] opened ${url}. If a check shows in its tab, clear it there.`);

  // Wait (polling) until the reader has rendered its image elements.
  const deadline = Date.now() + Number(args.wait) * 1000;
  for (;;) {
    const ready = await page
      .evaluate(([sel, custom]) => document.querySelectorAll(sel).length >= (custom ? 1 : 2), [args.selector, args.selector !== 'img'])
      .catch(() => false);
    if (ready) break;
    if (Date.now() > deadline) {
      await page.close();
      throw new Error(`[${label}] no chapter images appeared. Is this a chapter page? Is the reader in long-strip mode?`);
    }
    await page.waitForTimeout(1000);
  }

  // Lazy readers keep the real URL in a data attribute until the image scrolls
  // into view. Promote it so loading does not depend on scrolling, which Chrome
  // throttles in background tabs.
  const total = await page.evaluate(
    ([sel, attrs]) => {
      const els = [...document.querySelectorAll(sel)];
      for (const img of els) {
        for (const a of attrs) {
          const v = img.getAttribute(a);
          if (v && !v.startsWith('data:') && img.getAttribute('src') !== v) {
            img.setAttribute('src', v);
            break;
          }
        }
        img.loading = 'eager';
      }
      return els.length;
    },
    [args.selector, LAZY_ATTRS],
  );

  // Then wait for every image, one by one, scrolling each into view. A page that
  // has not loaded after 20s gets one retry with its tab in front.
  const missing = [];
  for (let i = 0; i < total; i += 1) {
    const loaded = (tmo) =>
      page
        .waitForFunction(
          ([sel, idx]) => {
            const img = document.querySelectorAll(sel)[idx];
            if (!img) return true;
            img.scrollIntoView({ block: 'center' });
            return img.complete && img.naturalWidth > 0;
          },
          [args.selector, i],
          { timeout: tmo, polling: 250 },
        )
        .then(() => true)
        .catch(() => false);
    if (!(await loaded(20000))) {
      await page.bringToFront();
      if (!(await loaded(20000))) missing.push(i + 1);
    }
  }

  const srcs = await page.evaluate(
    ([min, sel]) => {
      const out = [];
      for (const img of document.querySelectorAll(sel)) {
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith('data:')) continue;
        if (img.naturalWidth >= min && img.naturalHeight >= min * 0.6) out.push(src);
      }
      return [...new Set(out)];
    },
    [minWidth, args.selector],
  );

  const pages = [];
  let n = 0;
  for (const src of srcs) {
    n += 1;
    const base = String(n).padStart(3, '0');
    let hit = bodies.get(src);
    if (!hit) {
      const res = await context.request.get(src, { headers: { referer: page.url() } }).catch(() => null);
      if (res?.ok()) hit = { buf: await res.body(), type: res.headers()['content-type'] ?? 'image/jpeg' };
    }
    let file;
    if (hit) {
      const ext = hit.type.includes('png') ? 'png' : hit.type.includes('webp') ? 'webp' : 'jpg';
      file = `${base}.${ext}`;
      await writeFile(path.join(outDir, file), hit.buf);
    } else {
      // Last resort: screenshot the element at 2x. Lower quality, so flag it.
      file = `${base}.png`;
      const el = page.locator(`img[src="${src.replace(/"/g, '\\"')}"]`).first();
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: path.join(outDir, file), scale: 'device' });
    }
    pages.push({ n, file, src, screenshot: !hit });
  }
  await page.close();

  const shots = pages.filter((p) => p.screenshot).length;
  const note = missing.length ? `; ${missing.length} never loaded: reader images ${missing.join(', ')}` : '';
  console.log(`[${label}] saved ${pages.length} of ${total} reader images to ${outDir} (${shots} by screenshot${note}).`);
  return { label, url, pages, readerImages: total, missing };
}

// Run chapters through a small pool of tabs.
const jobs = urls.map((u, i) => [u, labels[i]]);
const results = [];
const failures = [];
const pool = Math.max(1, Number(args.tabs));
await Promise.all(
  Array.from({ length: Math.min(pool, jobs.length) }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      try {
        results.push(await captureChapter(...job));
      } catch (err) {
        failures.push(job[1]);
        console.error(String(err.message ?? err));
      }
    }
  }),
);

// One manifest write at the end, so parallel tabs never race on pages.json.
const manifestPath = path.resolve('pages', 'pages.json');
await mkdir(path.dirname(manifestPath), { recursive: true });
const all = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};
for (const r of results) {
  all[r.label] = { url: r.url, capturedAt: new Date().toISOString(), readerImages: r.readerImages, missing: r.missing, pages: r.pages };
}
await writeFile(manifestPath, JSON.stringify(all, null, 2));

await context.close();
if (failures.length) {
  console.error(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
