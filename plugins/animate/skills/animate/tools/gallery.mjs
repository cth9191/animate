#!/usr/bin/env node
// Lay every style's sample.png side by side with its name — the intake gallery ("which of these, or show me a reference?").
//   usage: node tools/gallery.mjs <out.png> [extra styles dirs...]
// Reads this skill's styles/*/sample.png, then any extra styles/ folders given (e.g. a project's own styles/).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const [out, ...extra] = process.argv.slice(2);
if (!out) { console.error('usage: node tools/gallery.mjs <out.png> [extra styles dirs...]'); process.exit(2); }
const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['cut-paper', 'crosshatch', 'riso', 'sketchbook', 'math', 'pixel'];
const items = [];
for (const dir of [path.join(SKILL, 'styles'), ...extra.map((d) => path.resolve(d))]) {
  if (!fs.existsSync(dir)) continue;
  const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'sample.png')));
  names.sort((a, b) => ((ORDER.indexOf(a) + 1) || 99) - ((ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
  for (const n of names) if (!items.some((i) => i.name === n)) items.push({ name: n, url: 'data:image/png;base64,' + fs.readFileSync(path.join(dir, n, 'sample.png')).toString('base64') });
}
if (!items.length) { console.error('no styles/*/sample.png found'); process.exit(1); }
const browser = await chromium.launch(), page = await browser.newPage();
const png = await page.evaluate(async (items) => {
  const PW = 270, PH = 480, GAP = 24, LAB = 52, cols = Math.min(items.length, 4), rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas'); c.width = GAP + cols * (PW + GAP); c.height = GAP + rows * (PH + LAB + GAP);
  const g = c.getContext('2d'); g.fillStyle = '#1e1b19'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < items.length; i++) {
    const img = new Image(); img.src = items[i].url; await img.decode();
    const x = GAP + (i % cols) * (PW + GAP), y = GAP + Math.floor(i / cols) * (PH + LAB + GAP);
    g.imageSmoothingQuality = 'high'; g.drawImage(img, x, y, PW, PH);
    g.fillStyle = '#f0b27c'; g.font = '700 24px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; g.fillText(`${i + 1}`, x, y + PH + 34);
    g.fillStyle = '#efe5cf'; g.font = '600 24px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; g.fillText(items[i].name, x + 30, y + PH + 34);
  }
  return c.toDataURL('image/png').split(',')[1];
}, items);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log('gallery', out, items.map((i) => i.name).join(', '));
await browser.close();
