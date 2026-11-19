#!/usr/bin/env node
// Open a series page in the visible Chrome profile, list chapter links matching
// --chapters, then open the first one and report how many reader images each
// candidate selector finds. Screenshots the first chapter's top to review/.
import { chromium } from 'playwright-core';
import { homedir } from 'node:os';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    series: { type: 'string' },
    chapters: { type: 'string' },
    profile: { type: 'string', default: path.join(homedir(), 'anime-shorts', '.browser-profile') },
  },
});
const wanted = args.chapters.split(',').map((s) => s.trim());

const context = await chromium.launchPersistentContext(args.profile, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(args.series, { waitUntil: 'domcontentloaded' });
console.log(`opened ${args.series}. If a check shows, clear it in the window.`);

// Wait (up to 5 min) for chapter links to appear, e.g. after a human check.
await page.waitForFunction(() => document.querySelectorAll('a[href*="/c"]').length > 5, null, { timeout: 300000 });

const links = await page.evaluate(() =>
  [...document.querySelectorAll('a')]
    .map((a) => ({ href: a.href, text: a.textContent.trim().replace(/\s+/g, ' ') }))
    .filter((l) => /\/c\d+(\.\d+)?$/.test(l.href)),
);
const found = {};
for (const ch of wanted) {
  const hit = links.find((l) => l.href.endsWith(`/c${ch}`));
  found[ch] = hit ?? null;
  console.log(`c${ch}: ${hit ? `${hit.href}  "${hit.text}"` : 'NOT FOUND'}`);
}

const first = found[wanted[0]];
if (first) {
  await page.goto(first.href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const counts = await page.evaluate(() => {
    const sels = ['#imgs img', '#imgs .wrap_img img', '.wrap_img img', 'img'];
    return Object.fromEntries(sels.map((s) => [s, document.querySelectorAll(s).length]));
  });
  console.log('selector counts on', first.href, JSON.stringify(counts));
  await mkdir('review', { recursive: true });
  await page.screenshot({ path: 'review/first-chapter.png' });
  const heading = await page.evaluate(() => document.title);
  console.log('page title:', heading);
}
await context.close();
