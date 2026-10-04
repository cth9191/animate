#!/usr/bin/env node
// Deterministic exporter for pieces/<name>/index.html
//   frames:   Playwright calls window.renderFrame(i/fps) and saves the canvas as PNG
//   audio:    window.renderAudioWav() renders the score in an OfflineAudioContext
//   stems:    window.renderAudioStems() (optional) -> { music: b64wav, sfx: b64wav, ... }
//   mux:      ffmpeg -> renders/final.mp4
//   captions: TIMELINE.narration (optional) -> renders/narration.srt + renders/final-captions.mp4
//             (a preview for reading the script against the picture; the real voice-over is added outside)
//
// Frame size comes from TIMELINE.width / TIMELINE.height (defaults to 1080x1080).
//
// usage: node tools/export.mjs pieces/<name> [--from N] [--to N] [--workers 4] [--no-audio] [--no-mux] [--no-captions] [--only-audio] [--share] [--gpu]
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GPU_ARGS, gpuReport } from './gpu.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {
    const root = execSync('npm root -g').toString().trim();
    return require(path.join(root, 'playwright'));
  }
}
const { chromium } = loadPlaywright();

const USAGE = 'usage: node tools/export.mjs pieces/<name> [--from N] [--to N] [--workers 4] [--no-audio] [--no-mux] [--no-captions] [--only-audio] [--share] [--gpu]';
const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) { console.error(USAGE); process.exit(2); }
const ROOT = path.resolve(argv[0]);
const FRAMES = path.join(ROOT, 'frames');
const RENDERS = path.join(ROOT, 'renders');
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes('--' + name);

const workers = parseInt(opt('workers', '4'), 10);
const onlyAudio = flag('only-audio');
const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1';

fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(RENDERS, { recursive: true });
const BASE_ARGS = ['--autoplay-policy=no-user-gesture-required'];
// WebGL pieces (TIMELINE.gpu or --gpu) render on the real GPU (tools/gpu.mjs: ANGLE/D3D11 on Windows); without one Chromium falls back to software
let browser = await chromium.launch({ args: BASE_ARGS });

// read the frame size before sizing the real viewport
const probe = await browser.newPage();
await probe.goto(url);
await probe.waitForFunction(() => window.TIMELINE);
const meta = await probe.evaluate(() => {
  const T = window.TIMELINE;
  return { frames: T.frames, fps: T.fps, width: T.width || 1080, height: T.height || 1080, narration: T.narration || null, gpu: !!T.gpu };
});
await probe.close();
if (meta.gpu || flag('gpu')) {
  await browser.close();
  browser = await chromium.launch({ args: [...BASE_ARGS, ...GPU_ARGS] });
  const gp = await browser.newPage(); await gpuReport(gp); await gp.close();
}

const context = await browser.newContext({ viewport: { width: meta.width, height: meta.height }, deviceScaleFactor: 1 });
async function openPage() {
  const page = await context.newPage();
  page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof window.renderFrame === 'function' && window.TIMELINE);
  return page;
}

const first = await openPage();
const from = parseInt(opt('from', '0'), 10);
const to = Math.min(parseInt(opt('to', String(meta.frames - 1)), 10), meta.frames - 1);
console.log(`index.html: ${meta.width}x${meta.height}, ${meta.frames} frames @ ${meta.fps}fps (${(meta.frames / meta.fps).toFixed(4)}s)`);

if (!onlyAudio) {
  const pages = [first];
  for (let i = 1; i < workers; i++) pages.push(await openPage());
  const queue = []; for (let i = from; i <= to; i++) queue.push(i);
  const t0 = Date.now(); let done = 0;
  await Promise.all(pages.map(async (page) => {
    while (queue.length) {
      const i = queue.shift();
      const b64 = await page.evaluate((fi) => {
        window.renderFrame(fi / window.TIMELINE.fps);
        return document.getElementById('c').toDataURL('image/png').split(',')[1];
      }, i);
      fs.writeFileSync(path.join(FRAMES, `f${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
      if (++done % 24 === 0) console.log(`  ${done}/${to - from + 1} frames  ${((Date.now() - t0) / done).toFixed(0)}ms/frame`);
    }
  }));
  console.log(`frames ${from}..${to} written in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

const wavPath = path.join(RENDERS, 'audio.wav');
if (!flag('no-audio')) {
  let t0 = Date.now();
  const b64 = await first.evaluate(async () => await window.renderAudioWav());
  fs.writeFileSync(wavPath, Buffer.from(b64, 'base64'));
  console.log(`audio.wav written (${(fs.statSync(wavPath).size / 1e6).toFixed(2)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  t0 = Date.now();
  const stems = await first.evaluate(async () => (typeof window.renderAudioStems === 'function' ? await window.renderAudioStems() : null));
  if (stems) {
    for (const [name, data] of Object.entries(stems)) fs.writeFileSync(path.join(RENDERS, `stem-${name}.wav`), Buffer.from(data, 'base64'));
    console.log(`stems written: ${Object.keys(stems).map((n) => `stem-${n}.wav`).join(', ')} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
await browser.close();

const full = from === 0 && to === meta.frames - 1;
if (!flag('no-mux') && !onlyAudio && full) {
  const out = path.join(RENDERS, opt('out', 'final.mp4'));
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(meta.fps), '-i', path.join(FRAMES, 'f%04d.png'),
    '-i', wavPath, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(meta.fps),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out];
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  console.log('wrote', out);

  if (meta.narration && meta.narration.length && !flag('no-captions')) {
    const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
    const srt = meta.narration.map((n, i) => `${i + 1}\n${ts(n.t0)} --> ${ts(n.t1)}\n${n.text}\n`).join('\n');
    fs.writeFileSync(path.join(RENDERS, 'narration.srt'), srt);
    // libass scales subtitle units to PlayResY=288, so margins/sizes are in 288ths of the frame height
    const unit = meta.height / 288, vertical = meta.height > meta.width;
    const marginV = Math.round((vertical ? 470 : 70) / unit), fontSize = Math.round((vertical ? 64 : 46) / unit);
    const style = `Fontname=${process.platform === 'win32' ? 'Consolas' : process.platform === 'darwin' ? 'Menlo' : 'DejaVu Sans Mono'},Fontsize=${fontSize},PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,Alignment=2,MarginV=${marginV}`;
    const r2 = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'final.mp4',
      '-vf', `subtitles=narration.srt:force_style='${style}'`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', 'final-captions.mp4'],
    { cwd: RENDERS, stdio: 'inherit' });
    if (r2.status !== 0) { console.error('caption burn failed'); process.exit(1); }
    console.log('wrote', path.join(RENDERS, 'final-captions.mp4'), '(narration preview)');
  }
}
// --only-audio: swap the new score into the existing master without re-rendering frames
if (onlyAudio && !flag('no-mux') && fs.existsSync(path.join(RENDERS, 'final.mp4'))) {
  const tmp = path.join(RENDERS, 'final-remux.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(RENDERS, 'final.mp4'), '-i', wavPath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('remux failed'); process.exit(1); }
  fs.renameSync(tmp, path.join(RENDERS, 'final.mp4'));
  console.log('remuxed the new audio into', path.join(RENDERS, 'final.mp4'));
}
// --share: a smaller encode for sending to a phone (CRF 24)
if (flag('share') && fs.existsSync(path.join(RENDERS, 'final.mp4'))) {
  const out = path.join(RENDERS, 'share.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(RENDERS, 'final.mp4'), '-c:v', 'libx264', '-crf', '24', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('share encode failed'); process.exit(1); }
  console.log('wrote', out);
}
