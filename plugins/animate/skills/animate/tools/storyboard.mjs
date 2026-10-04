// Render a piece's storyboard (TIMELINE.board, drawn by kit/board.js) to a PNG, plus optional single panels at full size
// usage: node tools/storyboard.mjs <piece dir | index.html> [out.png] [panel numbers...]   (out defaults to <piece>/storyboard.png)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2), fmtI = args.indexOf('--format'), format = fmtI >= 0 ? args.splice(fmtI, 2)[1] : null, src = args.shift();
if (!src) { console.error('usage: node tools/storyboard.mjs <piece dir | index.html> [out.png] [panel numbers...]'); process.exit(2); }
const file = src.endsWith('.html') ? src : path.join(src, 'index.html');
const out = args[0] && args[0].endsWith('.png') ? args.shift() : path.join(path.dirname(file), 'storyboard.png');
const panels = args;
const browser = await chromium.launch(); const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1' + (format ? `&format=${encodeURIComponent(format)}` : ''));
await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
await page.evaluate(() => document.fonts.ready);
const t0 = Date.now();
const url = await page.evaluate(() => window.renderBoard().toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('board', out, (Date.now() - t0) + 'ms');
for (const n of panels) {
  const u = await page.evaluate((k) => { const c = document.createElement('canvas'); c.width = TIMELINE.width; c.height = TIMELINE.height; ctx = c.getContext('2d'); drawPanel(k, 1); return c.toDataURL('image/png'); }, Number(n) - 1);
  const p = out.replace(/\.png$/, `-p${n}.png`); fs.writeFileSync(p, Buffer.from(u.split(',')[1], 'base64')); console.log('panel', p);
}
await browser.close();
