#!/usr/bin/env node
// Put a reference still and a rendered frame side by side at the same height, with a 10% proportion grid,
// so a look is matched by proportions (element width as % of frame), line weight and palette — not pixels.
//   usage: node tools/compare.mjs <reference.png|jpg> <piece dir | index.html> <seconds> <out.png> [--crop x,y,w,h] [--auto-trim] [--crop-ours x,y,w,h] [--no-grid]
//   --crop       the reference region to compare (in reference pixels), e.g. one figure out of a page screenshot
//   --auto-trim  drop flat borders / letterboxing from the reference first (--crop then counts inside the trimmed picture)
//   --crop-ours  the region of our frame to compare (in frame pixels), so both palettes describe the same kind of area
// Prints both images' palettes (the 6 most common colours, quantised) so they can be compared as numbers.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const crop = opt('--crop'), cropOurs = opt('--crop-ours'), autoTrim = flag('--auto-trim'), noGrid = flag('--no-grid');
const [ref, src, sec, out] = args;
if (!ref || !src || sec == null || !out) { console.error('usage: node tools/compare.mjs <reference image> <piece dir | index.html> <seconds> <out.png> [--crop x,y,w,h] [--no-grid]'); process.exit(2); }
const file = src.endsWith('.html') ? src : path.join(src, 'index.html');
const mime = /\.jpe?g$/i.test(ref) ? 'image/jpeg' : 'image/png';
const refURL = `data:${mime};base64,` + fs.readFileSync(ref).toString('base64');   // tool-side only; never in a piece
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1');
await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
await page.evaluate(() => document.fonts.ready);
const res = await page.evaluate(async ([refURL, t, crop, grid, trim, cropOurs]) => {
  const T = window.TIMELINE, fr = document.createElement('canvas'); fr.width = T.width; fr.height = T.height;
  window.renderFrame(Math.round(t * T.fps) / T.fps, fr);
  const img = new Image(); img.src = refURL; await img.decode();
  let tx = 0, ty = 0, tw = img.width, th = img.height;
  if (trim) {   // flat borders: every pixel of a border line within 14 levels of the corner colour
    const c0 = document.createElement('canvas'); c0.width = img.width; c0.height = img.height; const g0 = c0.getContext('2d'); g0.drawImage(img, 0, 0);
    const d = g0.getImageData(0, 0, tw, th).data, W0 = tw, px = (x, y) => (y * W0 + x) * 4, k0 = [d[0], d[1], d[2]];
    const near = (i) => Math.abs(d[i] - k0[0]) + Math.abs(d[i + 1] - k0[1]) + Math.abs(d[i + 2] - k0[2]) < 42;
    const row = (y) => { for (let x = 0; x < W0; x += 2) if (!near(px(x, y))) return false; return true; }, col = (x) => { for (let y = 0; y < th; y += 2) if (!near(px(x, y))) return false; return true; };
    let y0 = 0, y1 = th - 1, x0 = 0, x1 = tw - 1;
    while (y0 < y1 && row(y0)) y0++; while (y1 > y0 && row(y1)) y1--; while (x0 < x1 && col(x0)) x0++; while (x1 > x0 && col(x1)) x1--;
    tx = x0; ty = y0; tw = x1 - x0 + 1; th = y1 - y0 + 1;
  }
  let [cx, cy, cw, ch] = crop ? crop.split(',').map(Number) : [0, 0, tw, th];
  cx += tx; cy += ty;
  const [ox, oy, ow, oh] = cropOurs ? cropOurs.split(',').map(Number) : [0, 0, T.width, T.height];
  const HH = 960, rw = Math.round(cw * HH / ch), fw = Math.round(ow * HH / oh), GAP = 24, HEAD = 44;
  const c = document.createElement('canvas'); c.width = rw + fw + GAP * 3; c.height = HH + HEAD + GAP; const g = c.getContext('2d');
  g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, cx, cy, cw, ch, GAP, HEAD, rw, HH);
  g.drawImage(fr, ox, oy, ow, oh, GAP * 2 + rw, HEAD, fw, HH);
  g.fillStyle = '#ddd'; g.font = '600 22px sans-serif';
  g.fillText('reference', GAP, 30); g.fillText(`ours · t=${t}s`, GAP * 2 + rw, 30);
  if (grid) {
    g.strokeStyle = 'rgba(255,0,80,0.35)'; g.lineWidth = 1; g.beginPath();
    for (const [x0, w] of [[GAP, rw], [GAP * 2 + rw, fw]]) for (let k = 1; k < 10; k++) {
      g.moveTo(x0 + w * k / 10 + 0.5, HEAD); g.lineTo(x0 + w * k / 10 + 0.5, HEAD + HH);
      g.moveTo(x0, HEAD + HH * k / 10 + 0.5); g.lineTo(x0 + w, HEAD + HH * k / 10 + 0.5);
    }
    g.stroke();
  }
  // palettes: the most common colours, quantised to 16 levels per channel
  const pal = (cv, x, y, w, h) => {
    const d = cv.getContext('2d').getImageData(x, y, w, h).data, m = new Map();
    for (let i = 0; i < d.length; i += 16) { const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); m.set(k, (m.get(k) || 0) + 1); }
    const n = d.length / 16;
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `rgb(${((k >> 8) & 15) * 16 + 8},${((k >> 4) & 15) * 16 + 8},${(k & 15) * 16 + 8}) ${(v / n * 100).toFixed(1)}%`);
  };
  const rc = document.createElement('canvas'); rc.width = cw; rc.height = ch; rc.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
  return { png: c.toDataURL('image/png').split(',')[1], ref: pal(rc, 0, 0, cw, ch), ours: pal(fr, ox, oy, ow, oh) };
}, [refURL, Number(sec), crop, !noGrid, autoTrim, cropOurs]);
fs.writeFileSync(out, Buffer.from(res.png, 'base64'));
console.log('compare', out);
console.log('palette ref :', res.ref.join(' · '));
console.log('palette ours:', res.ours.join(' · '));
await browser.close();
