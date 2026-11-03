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
// formats:  --format 1:1 renders one other format (the page reads ?format=); --formats 9:16,1:1,16:9 renders each
//            (frames-<w>x<h>/ and renders/final-<w>x<h>.mp4 for every format but the piece's main one)
// blur:     --blur 4 averages 4 sub-frames per frame (a 180-degree shutter) — styles on 1s only (STYLE.ones)
// music:    piece.json "music": { "file": "audio/track.wav", "start": 0, "gain": 0, "fade": 0.5 } — the user's track
//           replaces the synthesized music; the score's sfx bus is mixed on top, then loudness to -14 LUFS
// voice:    piece.json "voice": { "file": "voice/voice.wav", "music": -14, "musicBetween": -4, "gain": 0 } — the voice-over (tools/voice.mjs)
//           (the score at "music" dB under each line, back up to "musicBetween" dB between lines: hits in the pauses keep their size)
//           over the score: the score at "music" dB, ducked a little more while the voice speaks, then -14 LUFS
//
// speed:    frames are JPEG (q 0.95, ~10x smaller and faster than PNG; the H.264 master is 4:2:0 anyway) — --png keeps them lossless;
//           one worker per CPU core (--workers N); canvas 2D stays in software (reading a GPU canvas back cost 14% more on a Ryzen 7 + RX 9070 XT)
//           and the browser uses the GPU only for WebGL pieces (TIMELINE.gpu) or --gpu;
//           ANIMATE_FRAMES=<dir> keeps the frames in <dir>/<piece>/ (off a synced folder like OneDrive: 1.4 GB an episode);
//           the score is re-rendered only when it changed (renders/.audio-sig); --force-audio re-renders it anyway;
//           --shots 3,7 redraws only those shots and re-encodes from the frames on disk (the fast way to fix one shot);
//           the master is encoded on the graphics card when ffmpeg has a working hardware encoder (NVENC, AMF, Quick Sync,
//           VideoToolbox), else libx264 — --cpu-encode forces libx264, --best uses libx264 -preset slow -crf 14
//
// --share-best encodes the share copy with libx264 -preset slower from the master, after the frames: the same size as the graphics
//           card's share with less grain lost (SSIM 0.956 vs 0.939 on a VHS piece), about two minutes for a 120s piece. For the final version.
//
// usage: node tools/export.mjs pieces/<name> [--share-best] [--from N] [--to N] [--shots 3,7] [--workers N] [--no-audio] [--force-audio] [--no-mux] [--no-captions] [--only-audio] [--share] [--gpu | --no-gpu] [--png] [--cpu-encode | --best] [--format F | --formats A,B] [--blur N]
import { createRequire } from 'node:module';
import { execSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
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

const USAGE = 'usage: node tools/export.mjs pieces/<name> [--from N] [--to N] [--shots 3,7] [--workers N] [--no-audio] [--force-audio] [--no-mux] [--no-captions] [--only-audio] [--share] [--gpu | --no-gpu] [--png] [--cpu-encode | --best] [--format F | --formats A,B] [--blur N]';
const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) { console.error(USAGE); process.exit(2); }
const ROOT = path.resolve(argv[0]);
const FRAMES = process.env.ANIMATE_FRAMES ? path.join(process.env.ANIMATE_FRAMES, path.basename(ROOT)) : path.join(ROOT, 'frames');
const RENDERS = path.join(ROOT, 'renders');
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const flag = (name) => argv.includes('--' + name);

// --formats a,b,c: run this exporter once per format, then stop
if (opt('formats')) {
  const list = opt('formats').split(','), rest = argv.slice(1).filter((a, i, A) => a !== '--formats' && A[i - 1] !== '--formats');
  for (const f of list) {
    console.log(`\n=== format ${f}`);
    const r = spawnSync(process.execPath, [process.argv[1], argv[0], ...rest, '--format', f], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
  process.exit(0);
}
const CORES = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const workers = parseInt(opt('workers', String(Math.max(2, Math.min(12, CORES)))), 10);
const EXT = flag('png') ? 'png' : 'jpg', MIME = EXT === 'png' ? 'image/png' : 'image/jpeg', QUALITY = 0.95;
// ---- the video encoder: the graphics card's when ffmpeg has one that works here, else libx264
function pickEncoder() {
  // CRF sets the quality; the preset only trades file size for speed — "faster" at CRF 16 looks the same as "medium", in about a third of the time
  const x264 = flag('best') ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14'] : ['-c:v', 'libx264', '-preset', 'faster', '-crf', '16'];
  if (flag('cpu-encode') || flag('best')) return { name: 'libx264', args: x264 };
  const list = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '';
  const cands = [
    ['h264_nvenc', ['-c:v', 'h264_nvenc', '-preset', 'p6', '-tune', 'hq', '-rc', 'vbr', '-cq', '17', '-b:v', '0']],
    ['h264_amf', ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cqp', '-qp_i', '16', '-qp_p', '18', '-qp_b', '20']],
    ['h264_qsv', ['-c:v', 'h264_qsv', '-preset', 'slower', '-global_quality', '18']],
    ['h264_videotoolbox', ['-c:v', 'h264_videotoolbox', '-q:v', '70']],
  ];
  for (const [name, args] of cands) {
    if (!list.includes(name)) continue;
    // listed is not enough (a build can list NVENC with no NVIDIA card): encode a few frames to be sure
    const t = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=256x256:d=0.2', ...args, '-pix_fmt', 'yuv420p', '-f', 'null', '-']);
    if (t.status === 0) return { name, args };
  }
  return { name: 'libx264', args: x264 };
}
const ENC = pickEncoder();
// the share copy: capped at 6 Mb/s, since grainy looks (film, tape, noise) otherwise balloon past what a phone or a chat upload takes
// (on the graphics card too when there is one: a bitrate target every hardware encoder understands)
const SHARE_ARGS = ENC.name === 'libx264' ? ['-c:v', 'libx264', '-preset', 'faster', '-crf', '24', '-maxrate', '6M', '-bufsize', '12M']
  : ['-c:v', ENC.name, '-b:v', '5M', '-maxrate', '6M', '-bufsize', '12M'];
if (flag('share-best')) SHARE_ARGS.splice(0, SHARE_ARGS.length, '-c:v', 'libx264', '-preset', 'slower', '-b:v', '5M', '-maxrate', '6M', '-bufsize', '12M');
const onlyAudio = flag('only-audio');
const FORMAT = opt('format', null), BLUR = Math.max(1, parseInt(opt('blur', '1'), 10));
const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1' + (FORMAT ? `&format=${encodeURIComponent(FORMAT)}` : '');
const PIECE_JSON = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};

fs.mkdirSync(RENDERS, { recursive: true });
// one export per piece at a time: two runs writing the same renders/ corrupt each other's files
const LOCK = path.join(RENDERS, '.export.lock');
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, 'utf8')); let alive = false; try { process.kill(pid, 0); alive = pid !== process.pid; } catch { alive = false; }
  if (alive) { console.error(`another export of this piece is running (pid ${pid}); wait for it, or delete ${LOCK} if it is gone`); process.exit(1); }
}
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => { try { if (fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.unlinkSync(LOCK); } catch {} });
const BASE_ARGS = ['--autoplay-policy=no-user-gesture-required'];
// WebGL pieces (TIMELINE.gpu or --gpu) render on the real GPU (tools/gpu.mjs: ANGLE/D3D11 on Windows); without one Chromium falls back to software
let browser = await chromium.launch({ args: BASE_ARGS });

// read the frame size before sizing the real viewport
const probe = await browser.newPage();
await probe.goto(url);
await probe.waitForFunction(() => window.TIMELINE);
const meta = await probe.evaluate(() => {
  const T = window.TIMELINE;
  return { frames: T.frames, fps: T.fps, width: T.width || 1080, height: T.height || 1080, narration: T.narration || null, gpu: !!T.gpu, aspect: T.aspect || null };
});
await probe.close();
// the GPU: for WebGL pieces (TIMELINE.gpu) or --gpu. Canvas 2D has to be read back for every frame, which costs more than the GPU saves.
const wantGpu = !flag('no-gpu') && (meta.gpu || flag('gpu'));
if (wantGpu) {
  await browser.close();
  browser = await chromium.launch({ args: [...BASE_ARGS, ...GPU_ARGS] });
  const gp = await browser.newPage(); const g = await gpuReport(gp); await gp.close();
  if (!g.ok && !meta.gpu && !flag('gpu')) { await browser.close(); browser = await chromium.launch({ args: BASE_ARGS }); }
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
// another format than the main one: its own frames folder and renders/<name>-<w>x<h>.mp4
const SUFFIX = FORMAT && FORMAT !== (PIECE_JSON.formats || [])[0] ? `-${meta.width}x${meta.height}` : '';   // the main format (piece.json "formats"[0]) keeps final.mp4
const FR = SUFFIX ? FRAMES + SUFFIX : FRAMES;
fs.mkdirSync(FR, { recursive: true });
// a piece that got shorter leaves its old tail frames behind, and ffmpeg's image sequence would join them on: remove them
// (and frames of the other format, so the encoder reads one sequence)
for (const n of fs.readdirSync(FR)) { const m = /^f(\d+)\.(png|jpg)$/.exec(n); if (m && (Number(m[1]) >= meta.frames || (m[2] !== EXT && !onlyAudio))) fs.unlinkSync(path.join(FR, n)); }
console.log(`workers: ${workers} (${CORES} cores) · frames: ${EXT.toUpperCase()} · encoder: ${ENC.name}`);
if (BLUR > 1 && !(await first.evaluate(() => typeof STYLE === 'object' && STYLE.ones))) console.warn(`warning: --blur ${BLUR} does nothing for a style on 2s (STYLE.ones is false): every sub-frame is the same drawing`);

// ---- the sound first (it is fast), so the video can be encoded with it while the frames are drawn
const wavPath = path.join(RENDERS, 'audio.wav'), sigPath = path.join(RENDERS, '.audio-sig');
// the sound depends on the score's code, its cues, the voice and the mix settings; if none of them changed, the last audio.wav stands
const audioSig = async () => {
  const T = await first.evaluate(() => JSON.stringify([buildScore.toString(), TIMELINE.narration, TIMELINE.cues, TIMELINE.shots, TIMELINE.acts, TIMELINE.duration]));
  const vo = PIECE_JSON.voice?.file ? path.resolve(ROOT, PIECE_JSON.voice.file) : null;
  // this file too: the voice-over mix and the limiter live here
  return createHash('sha1').update(T).update(JSON.stringify([PIECE_JSON.voice, PIECE_JSON.music])).update(vo && fs.existsSync(vo) ? fs.readFileSync(vo) : '').update(fs.readFileSync(process.argv[1])).digest('hex');
};
const sigNow = flag('no-audio') ? null : await audioSig();
const audioFresh = !flag('force-audio') && fs.existsSync(wavPath) && fs.existsSync(sigPath) && fs.readFileSync(sigPath, 'utf8') === sigNow;
if (audioFresh) console.log('audio: score, cues and voice unchanged, keeping renders/audio.wav');
if (!flag('no-audio') && !audioFresh) {
  // the score in one pass: the mix once, then its music and sfx stems side by side (kit/score-tail.js renderAudioAll);
  // older pieces without it fall back to the mix, then the stems
  const t0 = Date.now();
  const all = await first.evaluate(async () => (typeof window.renderAudioAll === 'function' ? await window.renderAudioAll() : null));
  if (all) {
    fs.writeFileSync(wavPath, Buffer.from(all.mix, 'base64'));
    for (const name of Object.keys(all).filter((n) => n !== 'mix')) fs.writeFileSync(path.join(RENDERS, `stem-${name}.wav`), Buffer.from(all[name], 'base64'));
    console.log(`audio.wav + stems (${Object.keys(all).filter((n) => n !== 'mix').join(', ')}) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } else {
    fs.writeFileSync(wavPath, Buffer.from(await first.evaluate(async () => await window.renderAudioWav()), 'base64'));
    const stems = await first.evaluate(async () => (typeof window.renderAudioStems === 'function' ? await window.renderAudioStems() : null));
    if (stems) for (const [name, data] of Object.entries(stems)) fs.writeFileSync(path.join(RENDERS, `stem-${name}.wav`), Buffer.from(data, 'base64'));
    console.log(`audio.wav${stems ? ' + stems' : ''} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  // the user's own track replaces the synthesized music: track window + the score's sfx stem, loudness-normalised
  const M = PIECE_JSON.music;
  if (M && M.file) {
    const track = path.resolve(ROOT, M.file), dur = meta.frames / meta.fps, fade = M.fade ?? 0.5, sfx = path.join(RENDERS, 'stem-sfx.wav');
    if (!fs.existsSync(track)) { console.error('music file not found:', track); process.exit(1); }
    const chain = `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${M.gain ?? 0}dB,afade=t=out:st=${Math.max(0, dur - fade)}:d=${fade}`;
    const inputs = ['-ss', String(M.start ?? 0), '-t', String(dur), '-i', track, ...(fs.existsSync(sfx) ? ['-i', sfx] : [])];
    const graph = fs.existsSync(sfx) ? `${chain}[m];[1:a]aresample=48000,aformat=channel_layouts=stereo[s];[m][s]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]` : `${chain},loudnorm=I=-14:TP=-1.5:LRA=11[o]`;
    let r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[o]', '-ar', '48000', '-t', String(dur), wavPath], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('music mix failed'); process.exit(1); }
    r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(M.start ?? 0), '-t', String(dur), '-i', track, '-filter_complex', `${chain}[o]`, '-map', '[o]', path.join(RENDERS, 'stem-music.wav')], { stdio: 'inherit' });
    console.log(`music: ${path.basename(track)} from ${M.start ?? 0}s, ${dur.toFixed(2)}s${fs.existsSync(sfx) ? ' + the score\'s sfx stem' : ''}, loudness -14 LUFS -> audio.wav`);
  }
  // the voice-over on top of whatever the score (or the track) became
  const V = PIECE_JSON.voice;
  if (V && V.file) {
    const vo = path.resolve(ROOT, V.file), dur = meta.frames / meta.fps, mixIn = path.join(RENDERS, 'audio-score.wav');
    if (!fs.existsSync(vo)) { console.error('voice file not found:', vo, '(run tools/voice.mjs)'); process.exit(1); }
    fs.copyFileSync(wavPath, mixIn);
    // the score sits at "music" dB under the voice and comes back up to "musicBetween" dB (default: the same) in the gaps,
    // so a hit in a pause before a line lands at full size; the level follows voice.json's lines with 0.2s ramps
    const lines = fs.existsSync(path.join(ROOT, 'voice.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'voice.json'), 'utf8')).lines : [];
    const under = V.music ?? -14, between = V.musicBetween ?? under, ramp = 0.2;
    const duck = lines.length && between !== under
      ? lines.map((l) => `min(clip((t-${(l.t0 - ramp).toFixed(3)})/${ramp},0,1),clip((${(l.t1 + ramp).toFixed(3)}-t)/${ramp},0,1))`).reduce((a, b) => `max(${a},${b})`)
      : null;
    const scoreVol = duck ? `volume='pow(10,(${between}+(${under - between})*${duck})/20)':eval=frame` : `volume=${under}dB`;
    const graph = `[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${V.gain ?? 0}dB,apad,asplit=2[v][k];` +
      `[0:a]aresample=48000,aformat=channel_layouts=stereo,${scoreVol}[s];` +
      `[s][k]sidechaincompress=threshold=0.02:ratio=4:attack=30:release=400[d];` +
      `[d][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=192000,alimiter=limit=0.79:attack=1:level=false,aresample=48000[o]`;   // loudnorm's ceiling is only a target: the limiter, run at 4x, holds the true peak too
    let r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', mixIn, '-i', vo, '-filter_complex', graph, '-map', '[o]', '-ar', '48000', '-t', String(dur), wavPath], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('voice mix failed'); process.exit(1); }
    r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', vo, '-af', 'apad', '-ar', '48000', '-ac', '2', '-t', String(dur), path.join(RENDERS, 'stem-voice.wav')], { stdio: 'inherit' });
    console.log(`voice: ${path.basename(vo)} over the score at ${V.music ?? -14} dB (ducked under the voice), loudness -14 LUFS -> audio.wav (the score alone: audio-score.wav)`);
  }
  fs.writeFileSync(sigPath, sigNow);
}

// --shots: only these shots' frames are drawn; the rest are the ones on disk, and the video is encoded from disk
const SHOTS = opt('shots') ? await first.evaluate((ids) => TIMELINE.shots.filter((s) => ids.includes(s.id)).map((s) => [Math.round(s.t0 * TIMELINE.fps), Math.round(s.t1 * TIMELINE.fps)]), opt('shots').split(',').map(Number)) : null;
const full = SHOTS || (from === 0 && to === meta.frames - 1);
// stream: every frame goes to ffmpeg the moment it (and all before it) is ready — no separate encoding pass afterwards.
// The master and (with --share) the share copy are encoded in that same pass. The frames are still written to frames/
// for tools/review.mjs and for --no-mux runs.
// Streaming pays off when the encoder doesn't fight the browser for the CPU: a hardware encoder, or cores to spare (6+).
// On a small CPU-only machine, drawing first and encoding after is as fast and keeps the drawing at full speed (--stream forces it).
const muxing = full && !onlyAudio && !flag('no-mux');
const stream = muxing && !SHOTS && (flag('stream') || ENC.name !== 'libx264' || CORES >= 6);
let encoder = null, streamedShare = false;
if (stream) {
  const audioIn = fs.existsSync(wavPath) && !flag('no-audio');
  const share = flag('share') && !flag('share-best');
  const encArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', EXT === 'png' ? 'png' : 'mjpeg', '-i', '-',
    ...(audioIn ? ['-i', wavPath] : []),
    '-map', '0:v:0', ...(audioIn ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k'] : []), ...ENC.args, '-pix_fmt', 'yuv420p', '-r', String(meta.fps), '-frames:v', String(meta.frames), '-movflags', '+faststart', path.join(RENDERS, opt('out', `final${SUFFIX}.mp4`)),
    ...(share ? ['-map', '0:v:0', ...(audioIn ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k'] : []), ...SHARE_ARGS, '-pix_fmt', 'yuv420p', '-r', String(meta.fps), '-frames:v', String(meta.frames), '-movflags', '+faststart', path.join(RENDERS, `share${SUFFIX}.mp4`)] : [])];
  encoder = spawn('ffmpeg', encArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  encoder.done = new Promise((res) => encoder.on('close', res));
  streamedShare = share;
}
// frames reach the encoder strictly in order, through one write chain
const ready = new Map(); let nextOut = from, chain = Promise.resolve();
function emit(i, buf) {
  if (!encoder) return;
  ready.set(i, buf);
  chain = chain.then(async () => {
    while (ready.has(nextOut)) { const b = ready.get(nextOut); ready.delete(nextOut); nextOut++; if (!encoder.stdin.write(b)) await new Promise((r) => encoder.stdin.once('drain', r)); }
  });
}

if (!onlyAudio) {
  const pages = [first];
  for (let i = 1; i < workers; i++) pages.push(await openPage());
  const queue = [];
  if (SHOTS) for (const [a, b] of SHOTS) for (let i = a; i < Math.min(b, meta.frames); i++) queue.push(i);
  else for (let i = from; i <= to; i++) queue.push(i);
  const total = queue.length;
  const t0 = Date.now(); let done = 0;
  await Promise.all(pages.map(async (page) => {
    while (queue.length) {
      const i = queue.shift();
      const b64 = await page.evaluate(([fi, n, mime, q]) => {
        const cv = document.getElementById('c'), fps = window.TIMELINE.fps;
        if (n <= 1) { window.renderFrame(fi / fps); return cv.toDataURL(mime, q).split(',')[1]; }
        // motion blur: n sub-frames across half the frame interval (a 180-degree shutter), averaged
        const g = cv.getContext('2d'), acc = new Float32Array(cv.width * cv.height * 4);
        for (let j = 0; j < n; j++) { window.renderFrame((fi + (j / n) * 0.5) / fps, cv, true); const d = g.getImageData(0, 0, cv.width, cv.height).data; for (let k = 0; k < d.length; k++) acc[k] += d[k]; }
        const out = g.createImageData(cv.width, cv.height); for (let k = 0; k < acc.length; k++) out.data[k] = Math.round(acc[k] / n);
        g.putImageData(out, 0, 0); return cv.toDataURL(mime, q).split(',')[1];
      }, [i, BLUR, MIME, QUALITY]);
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(path.join(FR, `f${String(i).padStart(4, '0')}.${EXT}`), buf);
      emit(i, buf);
      if (++done % 24 === 0) console.log(`  ${done}/${total} frames  ${((Date.now() - t0) / done).toFixed(0)}ms/frame`);
    }
  }));
  console.log(`${SHOTS ? `shots ${opt('shots')} (${total} frames)` : `frames ${from}..${to}`} written in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (encoder) {
    const te = Date.now();
    await chain; encoder.stdin.end();
    const code = await encoder.done;
    if (code !== 0) { console.error('ffmpeg (streamed encode) failed'); process.exit(1); }
    console.log(`wrote ${path.join(RENDERS, `final${SUFFIX}.mp4`)}${streamedShare ? ' + share' + SUFFIX + '.mp4' : ''} (${ENC.name}, encoded while drawing; ${((Date.now() - te) / 1000).toFixed(1)}s after the last frame)`);
  }
}

await browser.close();

// not streamed: encode the frames on disk now — the master and (with --share) the share copy in one pass
if (muxing && !stream) {
  const audioIn = fs.existsSync(wavPath) && !flag('no-audio'), share = flag('share') && !flag('share-best'), te = Date.now();
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(meta.fps), '-i', path.join(FR, `f%04d.${EXT}`), ...(audioIn ? ['-i', wavPath] : []),
    '-map', '0:v:0', ...(audioIn ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k'] : []), ...ENC.args, '-pix_fmt', 'yuv420p', '-r', String(meta.fps), '-frames:v', String(meta.frames), '-movflags', '+faststart', path.join(RENDERS, opt('out', `final${SUFFIX}.mp4`)),
    ...(share ? ['-map', '0:v:0', ...(audioIn ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k'] : []), ...SHARE_ARGS, '-pix_fmt', 'yuv420p', '-r', String(meta.fps), '-frames:v', String(meta.frames), '-movflags', '+faststart', path.join(RENDERS, `share${SUFFIX}.mp4`)] : [])],
  { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  streamedShare = share;
  console.log(`wrote ${path.join(RENDERS, `final${SUFFIX}.mp4`)}${share ? ' + share' + SUFFIX + '.mp4' : ''} (${ENC.name}, ${((Date.now() - te) / 1000).toFixed(1)}s)`);
}
if (muxing) {
  if (meta.narration && meta.narration.length && !flag('no-captions')) {
    const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
    const srt = meta.narration.map((n, i) => `${i + 1}\n${ts(n.t0)} --> ${ts(n.t1)}\n${n.text}\n`).join('\n');
    fs.writeFileSync(path.join(RENDERS, 'narration.srt'), srt);
    // libass scales subtitle units to PlayResY=288, so margins/sizes are in 288ths of the frame height
    const unit = meta.height / 288, vertical = meta.height > meta.width;
    const marginV = Math.round((vertical ? 470 : 70) / unit), fontSize = Math.round((vertical ? 64 : 46) / unit);
    const style = `Fontname=${process.platform === 'win32' ? 'Consolas' : process.platform === 'darwin' ? 'Menlo' : 'DejaVu Sans Mono'},Fontsize=${fontSize},PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=6,Shadow=0,Alignment=2,MarginV=${marginV}`;
    const r2 = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'final.mp4',
      '-vf', `subtitles=narration.srt:force_style='${style}'`, ...(ENC.name === 'libx264' ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'] : ENC.args), '-pix_fmt', 'yuv420p', '-c:a', 'copy', 'final-captions.mp4'],
    { cwd: RENDERS, stdio: 'inherit' });
    if (r2.status !== 0) { console.error('caption burn failed'); process.exit(1); }
    console.log('wrote', path.join(RENDERS, 'final-captions.mp4'), '(narration preview)');
  }
}
// --only-audio: swap the new score into the existing master without re-rendering frames
if (onlyAudio && !flag('no-mux') && fs.existsSync(path.join(RENDERS, `final${SUFFIX}.mp4`))) {
  const tmp = path.join(RENDERS, 'final-remux.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(RENDERS, `final${SUFFIX}.mp4`), '-i', wavPath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('remux failed'); process.exit(1); }
  fs.renameSync(tmp, path.join(RENDERS, `final${SUFFIX}.mp4`));
  console.log('remuxed the new audio into', path.join(RENDERS, `final${SUFFIX}.mp4`));
}
// --share: a smaller encode for sending to a phone (CRF 24) — already made in the streamed pass when there was one
if (flag('share') && !streamedShare && fs.existsSync(path.join(RENDERS, `final${SUFFIX}.mp4`))) {
  const out = path.join(RENDERS, `share${SUFFIX}.mp4`);
  // capped at 6 Mb/s: grainy looks (film, tape, noise) otherwise balloon past what a phone or a chat upload takes
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(RENDERS, `final${SUFFIX}.mp4`), ...SHARE_ARGS,
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('share encode failed'); process.exit(1); }
  console.log('wrote', out);
}
