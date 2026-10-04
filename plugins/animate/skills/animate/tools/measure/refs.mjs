#!/usr/bin/env node
// Measure reference stills before anything is drawn (new-style.md step 2):
//   - finds the picture inside screenshot letterboxing / flat borders and writes <name>.trim.png beside the original
//   - prints the size, aspect and content box, and the palette: the most common colours (16-level buckets; the mean of each)
//   - --points x,y;x,y samples the 5x5 median at points of the trimmed image (a flat area, a line, the accent)
//   - --accent lists the bright, saturated colours by hue family (neon tubes, inks on black: each is < 1% of the
//     pixels, so the plain palette shows only the ground), with each family's core (brightest) and halo colour
//   usage: node tools/measure/refs.mjs <image | folder> [more...] [--top 10] [--points 120,40;300,500]
// Everything written here contains reference pixels: keep it in the gitignored references/<look>/ folder.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const accent = args.includes('--accent') ? (args.splice(args.indexOf('--accent'), 1), true) : false;
const top = Number(opt('--top', 10)), points = (opt('--points', '') || '').split(';').filter(Boolean).map((p) => p.split(',').map(Number));
const files = args.flatMap((a) => (fs.existsSync(a) && fs.statSync(a).isDirectory()
  ? fs.readdirSync(a).filter((n) => /\.(png|jpe?g|webp)$/i.test(n) && !/\.trim\.png$|^cmp-/i.test(n)).map((n) => path.join(a, n)) : [a]));
if (!files.length) { console.error('usage: node tools/measure/refs.mjs <image | folder> [more...] [--top 10] [--points x,y;x,y]'); process.exit(2); }
const browser = await chromium.launch(), page = await browser.newPage();
for (const f of files) {
  const mime = /\.jpe?g$/i.test(f) ? 'image/jpeg' : /\.webp$/i.test(f) ? 'image/webp' : 'image/png';
  const r = await page.evaluate(async ([url, top, points, accent]) => {
    const img = new Image(); img.src = url; await img.decode();
    const W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, W, H).data;
    const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    // a border line is "flat" when every pixel is within 14 levels of the corner colour
    const corner = px(0, 0), near = (p) => Math.abs(p[0] - corner[0]) + Math.abs(p[1] - corner[1]) + Math.abs(p[2] - corner[2]) < 42;
    const rowFlat = (y) => { for (let x = 0; x < W; x += 2) if (!near(px(x, y))) return false; return true; };
    const colFlat = (x) => { for (let y = 0; y < H; y += 2) if (!near(px(x, y))) return false; return true; };
    let y0 = 0, y1 = H - 1, x0 = 0, x1 = W - 1;
    while (y0 < y1 && rowFlat(y0)) y0++; while (y1 > y0 && rowFlat(y1)) y1--;
    while (x0 < x1 && colFlat(x0)) x0++; while (x1 > x0 && colFlat(x1)) x1--;
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const t = document.createElement('canvas'); t.width = cw; t.height = ch; t.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    const td = t.getContext('2d').getImageData(0, 0, cw, ch).data, m = new Map();
    for (let i = 0; i < td.length; i += 8) { const k = ((td[i] >> 4) << 8) | ((td[i + 1] >> 4) << 4) | (td[i + 2] >> 4); const v = m.get(k) || [0, 0, 0, 0]; v[0] += td[i]; v[1] += td[i + 1]; v[2] += td[i + 2]; v[3]++; m.set(k, v); }
    const n = td.length / 8;
    const pal = [...m.values()].sort((a, b) => b[3] - a[3]).slice(0, top).map(([r, gg, b, k]) => { const rgb = [r / k, gg / k, b / k].map(Math.round); return { rgb, hex: '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''), share: k / n }; });
    const med = (x, y) => { const vs = [[], [], []]; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(cw - 1, Math.max(0, x + dx)), yy = Math.min(ch - 1, Math.max(0, y + dy)), i = (yy * cw + xx) * 4; for (let k = 0; k < 3; k++) vs[k].push(td[i + k]); } return vs.map((v) => v.sort((a, b) => a - b)[12]); };
    let acc = null;
    if (accent) {   // bright + saturated pixels, grouped into 12 hue families of 30 degrees
      const fam = Array.from({ length: 12 }, () => []); let nAcc = 0;
      for (let i = 0; i < td.length; i += 8) {
        const r = td[i], gg = td[i + 1], b = td[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
        if (mx < 120 || sat < 0.35) continue;
        let h = mx === mn ? 0 : mx === r ? ((gg - b) / (mx - mn)) % 6 : mx === gg ? (b - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4;
        h = ((h * 60) + 360) % 360; fam[Math.floor(h / 30) % 12].push([r, gg, b, 0.2126 * r + 0.7152 * gg + 0.0722 * b]); nAcc++;
      }
      const NAMES = ['red-orange', 'yellow', 'yellow-green', 'green', 'green ', 'green-cyan', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'pink-red'];   // 0-30, 30-60 ... degrees
      const medOf = (a) => [0, 1, 2].map((k) => a.map((p) => p[k]).sort((x, y) => x - y)[Math.floor(a.length / 2)]);
      acc = { share: nAcc / n, fams: fam.map((a, k) => ({ name: NAMES[k], n: a.length })).filter((f) => f.n > nAcc * 0.02).sort((a, b) => b.n - a.n).map((f) => {
        const a = fam[NAMES.indexOf(f.name)].sort((p, q) => q[3] - p[3]), cut = Math.max(1, Math.floor(a.length * 0.2));
        return { name: f.name, share: f.n / nAcc, core: medOf(a.slice(0, cut)), halo: medOf(a.slice(cut)) };
      }) };
    }
    return { W, H, box: [x0, y0, cw, ch], pal, acc, pts: points.map(([x, y]) => ({ x, y, rgb: med(x, y) })), png: t.toDataURL('image/png').split(',')[1] };
  }, [`data:${mime};base64,` + fs.readFileSync(f).toString('base64'), top, points, accent]);
  const out = f.replace(/\.[^.]+$/, '.trim.png');
  fs.writeFileSync(out, Buffer.from(r.png, 'base64'));
  const [x0, y0, cw, ch] = r.box;
  console.log(`\n${path.basename(f)}: ${r.W}x${r.H}; picture ${cw}x${ch} at ${x0},${y0} (aspect ${(cw / ch).toFixed(3)}${cw < ch ? ', portrait' : ', landscape'}) -> ${path.basename(out)}`);
  console.log('  palette (16 levels per channel, bucket means = exact colours):');
  for (const p of r.pal) console.log(`    ${p.hex}  rgb(${p.rgb.join(',')})  ${(p.share * 100).toFixed(1)}%`);
  for (const p of r.pts) console.log(`  point ${p.x},${p.y}: rgb(${p.rgb.join(',')})`);
  if (r.acc) {
    const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
    console.log(`  accents (${(r.acc.share * 100).toFixed(1)}% of the picture is bright + saturated), by hue family:`);
    for (const a of r.acc.fams) console.log(`    ${a.name.padEnd(12)} ${(a.share * 100).toFixed(0).padStart(3)}%  core ${hex(a.core)} rgb(${a.core.join(',')})  halo ${hex(a.halo)} rgb(${a.halo.join(',')})`);
  }
}
console.log('\nThin lines read lighter than they are in a screenshot (anti-aliasing): take line colours from the source when there is one.');
await browser.close();
