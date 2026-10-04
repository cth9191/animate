#!/usr/bin/env node
// Hash renderFrame output for chosen frames — to prove a kit or style change left a piece pixel-identical.
//   usage: node tools/framehash.mjs a/index.html [b/index.html] f0 f1 f2 ...
// With two files it compares them frame by frame (exit 1 on any difference).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2);
const files = args.filter((a) => /\.html?$/i.test(a)), frames = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!files.length || !frames.length) { console.error('usage: node tools/framehash.mjs a.html [b.html] f0 f1 ...'); process.exit(2); }
const browser = await chromium.launch();
async function hashes(file) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror', file, e.message));
  await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1');
  await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
  await page.evaluate(() => document.fonts.ready);
  const out = [];
  for (const f of frames) {
    const data = await page.evaluate((fr) => {
      const T = window.TIMELINE, c = document.createElement('canvas'); c.width = T.width; c.height = T.height;
      window.renderFrame(fr / T.fps, c); return c.toDataURL('image/png');
    }, f);
    out.push(crypto.createHash('md5').update(data).digest('hex').slice(0, 10));
  }
  await page.close();
  return out;
}
const H = [];
for (const f of files) H.push(await hashes(f));
let diff = 0;
frames.forEach((f, i) => {
  const row = H.map((h) => h[i]), same = row.every((v) => v === row[0]);
  if (!same) diff++;
  console.log(`f${f}  ${row.join('  ')}${files.length > 1 ? (same ? '  same' : '  DIFF') : ''}`);
});
if (files.length > 1) console.log(`${frames.length - diff}/${frames.length} frames identical`);
await browser.close();
process.exit(diff ? 1 : 0);
