#!/usr/bin/env node
// Render one frame of a piece to a PNG (a style's sample.png, a frame to compare against a reference).
//   usage: node tools/still.mjs <piece dir | index.html> <seconds> <out.png> [--scale 0.5]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2);
const si = args.indexOf('--scale'), scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 1;
const [src, sec, out] = args;
if (!src || sec == null || !out) { console.error('usage: node tools/still.mjs <piece dir | index.html> <seconds> <out.png> [--scale 0.5]'); process.exit(2); }
const file = src.endsWith('.html') ? src : path.join(src, 'index.html');
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1');
await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
await page.evaluate(() => document.fonts.ready);
const url = await page.evaluate(([t, k]) => {
  const T = window.TIMELINE, c = document.createElement('canvas'); c.width = T.width; c.height = T.height;
  window.renderFrame(Math.round(t * T.fps) / T.fps, c);
  if (k === 1) return c.toDataURL('image/png');
  const s = document.createElement('canvas'); s.width = Math.round(T.width * k); s.height = Math.round(T.height * k);
  const g = s.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, s.width, s.height); return s.toDataURL('image/png');
}, [Number(sec), scale]);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('still', out, `t=${sec}s`, `scale ${scale}`);
await browser.close();
