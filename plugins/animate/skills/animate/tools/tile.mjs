// test tile: render chosen frames into a grid (each 270x480) with the phone-UI safe zones drawn in red; print timings + determinism
// usage: PIECE=pieces/<name> node tools/tile.mjs out.png f0 f1 f2 ...   (frame numbers at TIMELINE.fps)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const [out, ...fr] = process.argv.slice(2);
const frames = fr.map(Number);
const URL = pathToFileURL(path.resolve(process.env.PIECE || (console.error("usage: PIECE=<piece dir> node tile.mjs out.png f0 f1 ..."), process.exit(2)), "index.html")).href + '?export=1';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
p.on('console', (m) => console.error('console:', m.type(), m.text()));
await p.goto(URL);
await p.waitForFunction(() => window.TIMELINE, null, { timeout: 30000 });
console.log('fonts ok:', await p.evaluate(() => window.FONTS_OK));
const res = await p.evaluate(async (frames) => {
  const cols = Math.min(6, frames.length), rows = Math.ceil(frames.length / cols), s = 0.25;
  const g = document.createElement('canvas'); g.width = cols * 270; g.height = rows * 480; const x = g.getContext('2d');
  const src = document.getElementById('c'); const ms = [];
  for (let i = 0; i < frames.length; i++) {
    const t0 = performance.now(); window.renderFrame(frames[i] / window.TIMELINE.fps); ms.push(performance.now() - t0);
    const cx = (i % cols) * 270, cy = Math.floor(i / cols) * 480;
    x.drawImage(src, cx, cy, 270, 480);
    x.fillStyle = 'rgba(255,0,0,0.18)'; x.fillRect(cx, cy + 1540 * s, 270, 380 * s); x.fillRect(cx + 950 * s, cy, 130 * s, 480);
    x.fillStyle = '#000'; x.fillRect(cx, cy, 44, 16); x.fillStyle = '#fff'; x.font = '12px monospace'; x.fillText('f' + frames[i], cx + 3, cy + 12);
  }
  // determinism: same t twice, compare pixels
  const fps = window.TIMELINE.fps; window.renderFrame(200 / fps); const a = src.toDataURL(); window.renderFrame(33 / fps); window.renderFrame(200 / fps); const b2 = src.toDataURL();
  return { png: g.toDataURL('image/png').split(',')[1], ms, det: a === b2 };
}, frames);
fs.writeFileSync(out, Buffer.from(res.png, 'base64'));
console.log('ms/frame', res.ms.map((v) => v.toFixed(0)).join(' '), '| deterministic:', res.det);
await b.close();
