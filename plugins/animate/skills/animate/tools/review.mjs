#!/usr/bin/env node
// Review pass for pieces/<name>/renders/final.mp4
//   1. per-shot contact sheets (every 0.25s); beside the reference images listed in piece.json, those side-by-sides
//      go to references/_review/<piece>/ (they hold reference pixels; references/ stays gitignored)
//      (vertical pieces get the phone-UI safe zones drawn in red)
//   2. cut timing: every TIMELINE cut vs its beat grid (8ths, or 16ths inside [TIMELINE.fastFrom, fastTo)), confirmed by pixel difference
//   3. pacing summary, on-2s montage check, flat-frame scan, loop check
//   4. narration (if TIMELINE.narration): words per second per line, and whether each stressed word lands on a cut
//   5. story arc (if TIMELINE.acts): per-act cut rate, motion and loudness (mix + music stem), checked against the
//      arc rules for the roles journey / peak / silence / gift / goodbye
//   6. anchor (if TIMELINE.anchor and window.anchorAt(t)): how often the protagonist sits on its screen spot
//   7. text (tools/textcheck.mjs): strings cut off by the frame, overlapping other text, or under the phone UI
//   8. sound (if renders/audio.wav): the loudest 100ms window, the silence before it, integrated loudness (LUFS), true peak
//   9. dead beats: stretches longer than review.deadMax (default 3s) where the picture barely changes; review/phone.jpg
//      (one frame a second at 360px wide: read it at phone size)
// A supplied track's grid: TIMELINE.gridOffset (the first beat) shifts the 8th/16th grid; cuts pass within half a frame.
// --format 1:1 reviews another format's render (renders/final-<w>x<h>.mp4 -> review-<w>x<h>/)
//
// The beat grid comes from TIMELINE.bpm (default 100): 8ths = 30/bpm s, 16ths = 15/bpm s.
//
// piece.json -> review.refs: { "<shot id>": ["ref-000.0s.jpg", "pieces/other-piece/review/shot01-sheet.jpg"] }
//   a path with a slash resolves from where you run the tool (the project); a bare name is looked for in
//   references/, references/stills/ and every references/<look>/ folder
//
// usage: node tools/review.mjs pieces/<name> [--format 1:1]
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GPU_ARGS, gpuReport } from './gpu.mjs';
import { textCheck, printTextCheck } from './textcheck.mjs';

const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();

const REPO = process.cwd();   // reference images resolve from where you run the tool
if (!process.argv[2]) { console.error('usage: node tools/review.mjs pieces/<name>'); process.exit(2); }
const ROOT = path.resolve(process.argv[2]);
const FORMAT = process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] : null;
let REVIEW = path.join(ROOT, 'review');
let VIDEO = path.join(ROOT, 'renders', 'final.mp4');

const PIECE = JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8'));
// a voice-over piece (piece.json "voice"): the story arc and the payoff window are judged on the score alone
// (renders/audio-score.wav, written by export.mjs before the voice goes on top): a voice is louder than any hit, and
// NARRATION checks it. Integrated loudness and true peak stay on the delivered mix (renders/audio.wav).
const SCORE_WAV = path.join(ROOT, 'renders', 'audio-score.wav');
const SOUND_WAV = PIECE.voice && fs.existsSync(SCORE_WAV) ? SCORE_WAV : path.join(ROOT, 'renders', 'audio.wav');
const REF_FOR = PIECE.review?.refs || {};
const REFDIR = path.join(REPO, 'references');
const refPath = (n) => {
  if (path.isAbsolute(n)) return n;
  if (n.includes('/')) return path.join(REPO, n);
  const dirs = [REFDIR, ...(fs.existsSync(REFDIR) ? fs.readdirSync(REFDIR).map((d) => path.join(REFDIR, d)).filter((d) => fs.statSync(d).isDirectory()) : [])];
  return dirs.map((d) => path.join(d, n)).find((f) => fs.existsSync(f)) || path.join(REFDIR, n);
};

// ---- read TIMELINE + frame->shot mapping straight from index.html
const PAGE_URL = pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1' + (FORMAT ? `&format=${encodeURIComponent(FORMAT)}` : '');
let browser = await chromium.launch();
let page = await browser.newPage();
await page.goto(PAGE_URL);
await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
// WebGL pieces (TIMELINE.gpu) re-open on the real GPU: the anchor pass renders hundreds of frames
if (await page.evaluate(() => !!window.TIMELINE.gpu)) {
  await browser.close();
  browser = await chromium.launch({ args: GPU_ARGS });
  page = await browser.newPage();
  await gpuReport(page);
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
}
const info = await page.evaluate(() => {
  const T = window.TIMELINE;
  // protagonist screen position per frame; renderFrame first so camera state is current
  let anchor = null;
  if (T.anchor && typeof window.anchorAt === 'function') {
    anchor = [];
    for (let f = Math.round(T.anchor.t0 * T.fps); f < Math.round(T.anchor.t1 * T.fps); f++) {
      window.renderFrame(f / T.fps);
      const p = window.anchorAt(f / T.fps);
      anchor.push(p == null ? null : Array.isArray(p) ? p : [p.x, p.y]);
    }
  }
  return {
    T,
    anchor,
    shotOf: Array.from({ length: T.frames }, (_, f) => shotAtFrame(f).id),
    cutFrames: T.cuts.map((c) => { let f = 0; while (f < T.frames && !past(f / T.fps, c)) f++; return f; }),
  };
});
const TXT = await textCheck(page, { safe: info.T.height > info.T.width ? info.T.safe || PIECE.review?.safe || { top: 240, bottom: 420, right: 140 } : null });
await browser.close();
const { T } = info;
// another format than the main one: its own render and review folder
if (FORMAT && FORMAT !== (PIECE.formats || [])[0]) { const suf = `-${T.width}x${T.height}`; VIDEO = path.join(ROOT, 'renders', `final${suf}.mp4`); REVIEW = path.join(ROOT, `review${suf}`); }
fs.mkdirSync(REVIEW, { recursive: true });
if (!fs.existsSync(VIDEO)) { console.error('no render at', VIDEO, '- run export.mjs first'); process.exit(1); }
const FW = T.width || 1080, FH = T.height || 1080, VERTICAL = FH > FW;
const SAFE = T.safe || PIECE.review?.safe || { top: 240, bottom: 420, right: 140 };

// ---- decode final.mp4 to small grayscale frames for pixel-difference measurements
const SW = 96, SH = Math.round((96 * FH) / FW / 2) * 2, PX = SW * SH;
const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 }).stdout;
const nFrames = raw.length / PX;
const frameDiff = (fa, fb) => { let d = 0; for (let i = 0; i < PX; i++) d += Math.abs(raw[fa * PX + i] - raw[fb * PX + i]); return d / PX; };
const diff = [0];
for (let f = 1; f < nFrames; f++) diff.push(frameDiff(f - 1, f));
const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

// ---- contact sheets beside references
const FONTFILE = ['C:/Windows/Fonts/consolab.ttf', '/System/Library/Fonts/Menlo.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'].find((f) => fs.existsSync(f));
const font = FONTFILE ? `fontfile='${FONTFILE.replace(':', '\\:')}'` : "font='monospace'";
const cellW = VERTICAL ? 270 : 360, cellH = Math.round((cellW * FH) / FW / 2) * 2, cols = 4;
const labelSize = Math.round(((VERTICAL ? 60 : 40) * FW) / 1080);
const safeBoxes = VERTICAL
  ? `drawbox=x=0:y=0:w=iw:h=${SAFE.top}:color=red@0.22:t=fill,drawbox=x=0:y=ih-${SAFE.bottom}:w=iw:h=${SAFE.bottom}:color=red@0.22:t=fill,drawbox=x=iw-${SAFE.right}:y=${SAFE.top}:w=${SAFE.right}:h=ih-${SAFE.top + SAFE.bottom}:color=red@0.22:t=fill,`
  : '';
for (const shot of T.shots) {
  const f0 = Math.round(shot.t0 * T.fps), f1 = Math.round(shot.t1 * T.fps) - 1;
  const picks = [];
  for (let k = 0; shot.t0 + k * 0.25 < shot.t1 - 1e-6; k++) picks.push(Math.min(f1, Math.max(f0, Math.round((shot.t0 + k * 0.25) * T.fps))));
  const uniq = [...new Set(picks)], rows = Math.ceil(uniq.length / cols);
  const tag = `shot${String(shot.id).padStart(2, '0')}`;
  const sheet = path.join(REVIEW, `${tag}-sheet.jpg`);
  const sel = uniq.map((f) => `eq(n\\,${f})`).join('+');
  let r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(T.fps), '-start_number', '0', '-i', path.join(ROOT, 'frames', 'f%04d.png'),
    '-vf', `${safeBoxes}drawtext=${font}:text='%{pts\\:hms}  f%{n}':x=14:y=14:fontsize=${labelSize}:fontcolor=yellow:box=1:boxcolor=black@0.65:boxborderw=6,select='${sel}',scale=${cellW}:${cellH},tile=${cols}x${rows}`,
    '-frames:v', '1', '-q:v', '3', sheet], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('sheet failed for shot ' + shot.id);
  const refs = (REF_FOR[shot.id] || []).map(refPath).filter((p) => fs.existsSync(p));
  const sheetW = cellW * cols, sheetH = cellH * rows;
  if (refs.length) {
    // the side-by-side holds reference pixels: it goes in the (gitignored) references/ folder, never in the piece
    const VSREF = path.join(REFDIR, '_review', path.basename(ROOT)); fs.mkdirSync(VSREF, { recursive: true });
    const out = path.join(VSREF, `${tag}-vs-ref.jpg`);
    const probeH = refs.map((p) => {
      const o = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p]).stdout.toString().trim().split(',').map(Number);
      return Math.round((540 * o[1]) / o[0] / 2) * 2;
    });
    const h = Math.max(sheetH, probeH.reduce((a, b) => a + b, 0));
    const scaled = refs.map((_, i) => `[${i + 1}:v]scale=540:${probeH[i]}[r${i}]`).join(';');
    const stack = refs.length > 1 ? `${refs.map((_, i) => `[r${i}]`).join('')}vstack=inputs=${refs.length}` : '[r0]null';
    r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', sheet, ...refs.flatMap((p) => ['-i', p]), '-filter_complex',
      `[0:v]pad=${sheetW}:${h}:0:0:color=0x202020[s];${scaled};${stack},pad=540:${h}:0:0:color=0x202020,drawtext=${font}:text='REFERENCE':x=12:y=12:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.7[refs];[s][refs]hstack=inputs=2`,
      '-frames:v', '1', '-q:v', '3', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('side-by-side failed for shot ' + shot.id);
  }
  console.log(`shot ${shot.id} (${shot.title}): ${uniq.length} frames [${uniq.join(',')}] -> review/${tag}-sheet.jpg${refs.length ? ` + references/_review/${path.basename(ROOT)}/${tag}-vs-ref.jpg` : ''}`);
}

// ---- cut timing
const irisEnds = (T.cues?.irisClose || []).map(([, e]) => e);
const E8 = 30 / (T.bpm || 100), E16 = E8 / 2, OFF = T.gridOffset || 0;   // OFF: a supplied track's first beat
const gridFor = (c) => (T.fastFrom != null && c >= T.fastFrom - 1e-6 && (T.fastTo == null || c < T.fastTo - 1e-6) ? E16 : E8);   // 16ths inside [fastFrom, fastTo)
console.log(`\nCUTS vs beat grid @ ${T.bpm || 100} BPM, ${T.fps}fps (8ths = ${+E8.toFixed(4)}s${T.fastFrom != null ? `; 16ths = ${+E16.toFixed(4)}s allowed from ${T.fastFrom}s${T.fastTo != null ? ` to ${T.fastTo}s` : ''}` : ''})`);
console.log(' #   cut t     grid  grid#   nominal f  cut f   cut f t     err(f)  Δ@cut  peak(±2f)          shot change           result');
let allPass = true;
T.cuts.forEach((c, i) => {
  const fc = info.cutFrames[i], nominal = c * T.fps, err = fc - nominal, g = gridFor(c), gi = (c - OFF) / g;
  let peak = fc, best = -1;
  for (let f = Math.max(1, fc - 2); f <= Math.min(nFrames - 1, fc + 2); f++) if (diff[f] > best) { best = diff[f]; peak = f; }
  const peakNote = Math.abs(peak - fc) <= 1 ? `f${peak} ok` : irisEnds.some((e) => Math.abs(e - c) < 1e-6) ? `f${peak} (iris fills first)` : `f${peak} CHECK`;
  const shotChange = fc > 0 && info.shotOf[fc] !== info.shotOf[fc - 1] ? `shot ${info.shotOf[fc - 1]} -> ${info.shotOf[fc]}` : 'in-shot cut';
  const pass = Math.abs(err) <= 1 && Math.abs(gi - Math.round(gi)) * g * T.fps <= 0.5 + 1e-6;   // on the grid within half a frame
  allPass = allPass && pass;
  console.log(`${String(i + 1).padStart(2)}  ${c.toFixed(3).padStart(7)}s  ${g === E16 ? '16th' : ' 8th'}  ${Math.round(gi).toString().padStart(4)}   ${nominal.toFixed(1).padStart(8)}  ${String(fc).padStart(5)}   ${(fc / T.fps).toFixed(4)}s  ${(err >= 0 ? '+' : '') + err.toFixed(1)}   ${diff[fc].toFixed(1).padStart(5)}  ${peakNote.padEnd(18)} ${shotChange.padEnd(20)}  ${pass ? 'PASS' : 'FAIL'}`);
});
console.log(`all cuts on grid within 1 frame: ${allPass ? 'PASS' : 'FAIL'}`);
if (T.morphs?.length) { const ok = T.morphs.every((m) => Math.abs((m - OFF) / E8 - Math.round((m - OFF) / E8)) * E8 * T.fps <= 0.5 + 1e-6); console.log(`MORPHS: ${T.morphs.length} shape-morph bridges at ${T.morphs.join(', ')}s, ${ok ? 'all' : 'NOT all'} centred on the 8th grid: ${ok ? 'PASS' : 'FAIL'}`); }

// ---- pacing
const loopT = T.loop || T.frames / T.fps;
const last5 = T.cuts.filter((c) => c >= loopT - 5).length;
const shotLens = [0, ...T.cuts, loopT].map((c, i, a) => (i ? c - a[i - 1] : null)).filter((x) => x != null);
const montages = T.cues?.montage ? (Array.isArray(T.cues.montage[0]) ? T.cues.montage : [T.cues.montage]) : [];
const steps = montages.reduce((n, [a, b]) => n + Math.floor(((b - a) * T.fps) / 2), 0);
console.log(`\nPACING: ${T.cuts.length} hard cuts (${last5} in the last 5s), mean segment ${avg(shotLens).toFixed(2)}s, shortest ${Math.min(...shotLens).toFixed(2)}s, plus ${steps} on-2s montage steps`);

// ---- on-2s montage check
for (const [a, b] of montages) {
  const m0 = Math.round(a * T.fps), m1 = Math.round(b * T.fps) - 1;
  let held = 0, moving = 0; const within = [], across = [];
  for (let f = m0 + 1; f < m1; f++) {
    const d = diff[f + 1];
    if (Math.floor((f + 1) / 2) === Math.floor(f / 2)) { within.push(d); if (d < 1.5) held++; } else { across.push(d); if (d > 3) moving++; }
  }
  console.log(`MONTAGE ON 2s (frames ${m0}-${m1}): held pairs mean diff ${avg(within).toFixed(2)} (${held}/${within.length} < 1.5), steps mean diff ${avg(across).toFixed(2)} (${moving}/${across.length} > 3)`);
}

// ---- blank / broken frame scan
const blank = [];
for (let f = 0; f < nFrames; f++) {
  let mn = 255, mx = 0; const o = f * PX;
  for (let i = 0; i < PX; i++) { const v = raw[o + i]; if (v < mn) mn = v; if (v > mx) mx = v; }
  if (mx - mn < 6) blank.push(f);
}
console.log(`FLAT FRAMES (contrast < 6/255): ${blank.length ? blank.join(', ') : 'none'}`);

// ---- loop check
console.log(`LOOP: diff(last=${nFrames - 1}, first=0) = ${frameDiff(nFrames - 1, 0).toFixed(2)}; typical consecutive diff in the first 40 frames = ${avg(diff.slice(1, Math.min(40, nFrames))).toFixed(2)} (info: F4/F6 loop pixel-exactly and F4 checks it; other formats return to the opening image, changed)`);

// ---- narration
if (T.narration && T.narration.length) {
  console.log('\nNARRATION (voice-over added outside; checks density and word hits)');
  console.log(' #   t0-t1          words  wps   shot  line');
  const boundaries = [...new Set([...T.cuts, ...T.shots.map((s) => s.t0)])].map((c) => ({ c, f: Math.round(c * T.fps) }));
  let densityOk = true, hitsOk = true, prevEnd = -1;
  T.narration.forEach((n, i) => {
    const words = n.text.trim().split(/\s+/).length, wps = words / (n.t1 - n.t0);
    const ok = wps <= 3.5 && n.t0 >= prevEnd && n.t1 <= loopT;
    densityOk = densityOk && ok; prevEnd = n.t1;
    console.log(`${String(i + 1).padStart(2)}  ${n.t0.toFixed(2)}-${n.t1.toFixed(2)}s  ${String(words).padStart(5)}  ${wps.toFixed(2)}  ${String(info.shotOf[Math.min(T.frames - 1, Math.round(n.t0 * T.fps))]).padStart(4)}  "${n.text}"${ok ? '' : '  <-- too dense / overlapping'}`);
    for (const h of n.hits || []) {
      const hf = h.t * T.fps, near = boundaries.reduce((a, b) => (Math.abs(b.f - hf) < Math.abs(a.f - hf) ? b : a));
      const d = near.f - hf, pass = Math.abs(d) <= 2;
      hitsOk = hitsOk && pass;
      console.log(`      hit "${h.word}" @ ${h.t.toFixed(2)}s -> nearest cut ${near.c.toFixed(2)}s (f${near.f}), ${(d >= 0 ? '+' : '') + d.toFixed(1)} frames  ${pass ? 'PASS' : 'FAIL'}`);
    }
  });
  const totalWords = T.narration.reduce((n, l) => n + l.text.trim().split(/\s+/).length, 0);
  console.log(`narration: ${totalWords} words, density ${densityOk ? 'PASS' : 'FAIL'} (<= 3.5 words/s, no overlaps), word hits ${hitsOk ? 'PASS' : 'FAIL'} (<= 2 frames from a cut)`);
}

// ---- story arc: does the picture pace and the sound follow the acts?
if (T.acts && T.acts.length) {
  const SR = 8000, WIN = SR / 10; // 100ms loudness windows
  const levels = (file) => {
    if (!fs.existsSync(file)) return null;
    const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 }).stdout;
    const db = [];
    for (let o = 0; o + WIN * 2 <= pcm.length; o += WIN * 2) {
      let s = 0;
      for (let i = 0; i < WIN; i++) { const v = pcm.readInt16LE(o + i * 2) / 32768; s += v * v; }
      db.push(10 * Math.log10(s / WIN + 1e-12));
    }
    return db;
  };
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : -120; };
  const mix = levels(SOUND_WAV), music = levels(path.join(ROOT, 'renders', 'stem-music.wav'));
  const rows = T.acts.map((a) => {
    const w0 = Math.round(a.t0 * 10), w1 = Math.round(a.t1 * 10), f0 = Math.round(a.t0 * T.fps), f1 = Math.round(a.t1 * T.fps);
    const cuts = T.cuts.filter((c) => c >= a.t0 - 1e-6 && c < a.t1 - 1e-6).length;
    return {
      ...a, cuts, cps: cuts / (a.t1 - a.t0), motion: avg(diff.slice(f0 + 1, f1)),
      med: mix ? pct(mix.slice(w0, w1), 0.5) : null, p90: mix ? pct(mix.slice(w0, w1), 0.9) : null,
      mus: music ? pct(music.slice(w0, w1), 0.5) : null,
    };
  });
  const f1 = (v) => (v == null ? '   -  ' : v.toFixed(1).padStart(6));
  console.log('\nSTORY ARC (loudness in dBFS over 100ms windows: median / 90th percentile; music = music stem median)');
  console.log(' act          role       t0-t1         cuts  cuts/s  motion   mix med  mix p90  music');
  for (const r of rows) console.log(` ${r.name.padEnd(12)} ${(r.role || '').padEnd(9)}  ${r.t0.toFixed(2)}-${r.t1.toFixed(2)}s  ${String(r.cuts).padStart(5)}  ${r.cps.toFixed(2).padStart(6)}  ${r.motion.toFixed(1).padStart(6)}   ${f1(r.med)}   ${f1(r.p90)}  ${f1(r.mus)}`);
  const role = (n) => rows.find((r) => r.role === n);
  const [journey, peak, silence, gift, goodbye] = ['journey', 'peak', 'silence', 'gift', 'goodbye'].map(role);
  const rules = [];
  const rule = (ok, text) => rules.push([ok, text]);
  if (gift && mix) {
    const others = rows.filter((r) => r !== gift);
    rule(others.every((r) => gift.p90 > r.p90), `gift is the loudest act (p90 ${gift.p90.toFixed(1)} vs next ${Math.max(...others.map((r) => r.p90)).toFixed(1)})`);
  }
  if (gift && peak && mix) rule(gift.p90 >= peak.p90 + 1, `gift p90 >= peak p90 + 1 dB (${gift.p90.toFixed(1)} vs ${peak.p90.toFixed(1)}): the busiest moment is not the loudest`);
  if (silence && peak && mix) rule(silence.med <= peak.med - 15, `silence median <= peak median - 15 dB (${silence.med.toFixed(1)} vs ${peak.med.toFixed(1)})`);
  if (journey && gift && music && T.narration?.length) rule(journey.mus >= gift.mus - 8, `journey music stays present under the voice: median >= gift - 8 dB (${journey.mus.toFixed(1)} vs ${gift.mus.toFixed(1)})`);
  if (peak && T.cuts.length && !T.morphs?.length) rule(rows.every((r) => r === peak || peak.cps > r.cps), `peak has the highest cut rate (${peak.cps.toFixed(2)}/s)`);
  else if (peak) console.log(`  info  no cut-rate rule (no hard cuts, or eras joined by morphs): peak motion ${peak.motion.toFixed(1)} vs max other ${Math.max(...rows.filter((r) => r !== peak).map((r) => r.motion)).toFixed(1)} (pixel motion includes noise/boil, so it is not a rule here)`);
  if (gift) rule(gift.cps <= 0.5, `gift is held: <= 0.5 cuts/s (${gift.cps.toFixed(2)})`);
  if (goodbye && gift && mix) rule(goodbye.med <= gift.med - 6, `goodbye decays: median <= gift median - 6 dB (${goodbye.med.toFixed(1)} vs ${gift.med.toFixed(1)})`);
  for (const [ok, text] of rules) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${text}`);
  console.log(`story arc: ${rules.every(([ok]) => ok) ? 'PASS' : 'FAIL'} (${rules.filter(([ok]) => ok).length}/${rules.length} rules)`);
}

// ---- anchor: the protagonist holds its screen spot while the world changes around it
if (info.anchor) {
  const A = T.anchor, tol = A.tolerance ?? 40;
  const offs = info.anchor.map((p) => (p ? Math.hypot(p[0] - A.x, p[1] - A.y) : null));
  const present = offs.filter((d) => d != null), within = present.filter((d) => d <= tol).length;
  const share = within / offs.length;
  console.log(`\nANCHOR (${A.t0}-${A.t1}s, target ${A.x},${A.y} +-${tol}px): ${within}/${offs.length} frames on the spot (${(share * 100).toFixed(0)}%), ${offs.length - present.length} frames absent, max offset ${present.length ? Math.max(...present).toFixed(0) : '-'}px`);
  console.log(`anchor: ${share >= (A.minShare ?? 0.95) ? 'PASS' : 'FAIL'} (needs >= ${((A.minShare ?? 0.95) * 100).toFixed(0)}%)`);
}
// ---- format checks (grammar/FORMATS.md): the provable checks on the format's card
if (T.format === 'F4') {
  const SR = 8000, WIN = SR / 10;
  const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'renders', 'audio.wav'), '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 }).stdout;
  const db = [];
  for (let o = 0; o + WIN * 2 <= pcm.length; o += WIN * 2) { let s = 0; for (let i = 0; i < WIN; i++) { const v = pcm.readInt16LE(o + i * 2) / 32768; s += v * v; } db.push(10 * Math.log10(s / WIN + 1e-12)); }
  const beat = 60 / (T.bpm || 100), e8 = beat / 2;
  const onGrid = T.cuts.filter((c) => Math.abs(c / e8 - Math.round(c / e8)) < 1e-6).length / T.cuts.length;
  const rush = T.cues?.rush || [], rushOk = rush.length === 4 && rush.every((r, i) => !i || Math.abs(r - rush[i - 1] - beat) < 1e-6) && rush.every((r) => T.cuts.includes(r) || T.shots.some((s) => s.t0 === r));
  const L = db.indexOf(Math.max(...db)), gift = (T.acts || []).find((a) => a.role === 'gift');
  let run = 0, best = 0;
  for (let w = Math.max(0, L - 20); w < L; w++) { run = db[w] <= -40 ? run + 1 : 0; best = Math.max(best, run); }
  const loopDiff = frameDiff(nFrames - 1, 0), typical = avg(diff.slice(1, Math.min(40, nFrames)));
  const fc = [
    [onGrid >= 0.8, `cuts on the ${T.bpm} BPM 8th grid: ${(onGrid * 100).toFixed(0)}% (needs >= 80%)`],
    [loopDiff <= typical, `flash-forward loop: last-vs-first diff ${loopDiff.toFixed(2)} <= typical ${typical.toFixed(2)}`],
    [rushOk, `rush: ${rush.length} cuts one beat apart (${rush.join(', ')})`],
    [best >= 4, `silence before the payoff: ${(best / 10).toFixed(1)}s at <= -40 dBFS in the 2s before the loudest window (needs >= 0.4s)`],
    [!!gift && L / 10 >= gift.t0 && L / 10 < gift.t1, `loudest 100ms window at ${(L / 10).toFixed(1)}s (${db[L].toFixed(1)} dBFS) falls in the payoff act ${gift ? gift.t0 + '-' + gift.t1 + 's' : '-'}`],
  ];
  console.log('\nFORMAT F4 (mission) checks, grammar/FORMATS.md');
  for (const [ok, text] of fc) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${text}`);
  console.log(`format F4: ${fc.every(([ok]) => ok) ? 'PASS' : 'FAIL'} (${fc.filter(([ok]) => ok).length}/${fc.length})`);
}
if (T.format === 'F2') {
  const SR = 8000, WIN = SR / 10;
  const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'renders', 'audio.wav'), '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 }).stdout;
  const db = [];
  for (let o = 0; o + WIN * 2 <= pcm.length; o += WIN * 2) { let s = 0; for (let i = 0; i < WIN; i++) { const v = pcm.readInt16LE(o + i * 2) / 32768; s += v * v; } db.push(10 * Math.log10(s / WIN + 1e-12)); }
  const e8 = 30 / (T.bpm || 100), k = SW / FW;
  // hard cuts: coarse 8x8-px cells of the 96-wide frames; a cut changes most cells at once
  const CB = 8, cw = Math.floor(SW / CB), ch = Math.floor(SH / CB);
  const cells = (f) => { const c = new Float32Array(cw * ch); for (let y = 0; y < ch * CB; y++) for (let x = 0; x < cw * CB; x++) c[Math.floor(y / CB) * cw + Math.floor(x / CB)] += raw[f * PX + y * SW + x] / (CB * CB); return c; };
  let prev = cells(0), hard = [], maxShare = 0;
  for (let f = 1; f < nFrames; f++) { const cur = cells(f); let n = 0; for (let i = 0; i < cur.length; i++) if (Math.abs(cur[i] - prev[i]) > 40) n++; const sh = n / cur.length; maxShare = Math.max(maxShare, sh); if (sh > 0.5) hard.push(f); prev = cur; }
  // the stage: pixels outside the screen and text boxes barely change from frame to frame
  const ign = (T.stage?.ignore || []).map(([x, y, w, h]) => [x * k, y * k, (x + w) * k, (y + h) * k]);
  const mask = []; for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (!ign.some(([a, b, c, d]) => x >= a - 1 && x <= c + 1 && y >= b - 1 && y <= d + 1)) mask.push(y * SW + x);
  let still = 0; for (let f = 1; f < nFrames; f++) { let d = 0; for (const i of mask) d += Math.abs(raw[f * PX + i] - raw[(f - 1) * PX + i]); if (d / mask.length < 2) still++; }
  // the counter: ink in its box
  const [cx0, cy0, cw0, ch0] = (T.stage?.counter || [0, 0, 0, 0]).map((v) => Math.round(v * k));
  let present = 0; for (let f = 0; f < nFrames; f++) { let mn = 255; for (let y = cy0; y < cy0 + ch0; y++) for (let x = cx0; x < cx0 + cw0; x++) mn = Math.min(mn, raw[f * PX + y * SW + x]); if (mn < 110) present++; }
  const morphs = T.morphs || [], onGrid = morphs.every((m) => Math.abs(m / e8 - Math.round(m / e8)) < 1e-6);
  const L = db.indexOf(Math.max(...db)), gift = (T.acts || []).find((a) => a.role === 'gift');
  let run = 0, best = 0;
  for (let w = Math.max(0, L - 20); w < L; w++) { run = db[w] <= -40 ? run + 1 : 0; best = Math.max(best, run); }
  const fc = [
    [T.cuts.length === 0 && hard.length === 0, `no hard cuts: ${T.cuts.length} listed, ${hard.length} frames change > 50% of coarse cells${hard.length ? ' (' + hard.slice(0, 8).join(', ') + ')' : ''} (max ${(maxShare * 100).toFixed(0)}%)`],
    [still / (nFrames - 1) >= 0.85, `the stage holds: ${(100 * still / (nFrames - 1)).toFixed(0)}% of frames with the stage (outside the screen and text) still (needs >= 85%)`],
    [morphs.length >= 4 && onGrid, `morph bridges: ${morphs.length} (${morphs.join(', ')}s), ${onGrid ? 'all' : 'not all'} on the ${T.bpm} BPM 8th grid (needs >= 4)`],
    [present / nFrames >= 0.8, `counter present: ${(100 * present / nFrames).toFixed(0)}% of frames (needs >= 80%)`],
    [best >= 4, `silence before the payoff: ${(best / 10).toFixed(1)}s at <= -40 dBFS in the 2s before the loudest window (needs >= 0.4s)`],
    [!!gift && L / 10 >= gift.t0 && L / 10 < gift.t1, `loudest 100ms window at ${(L / 10).toFixed(1)}s (${db[L].toFixed(1)} dBFS) falls in the payoff act ${gift ? gift.t0 + '-' + gift.t1 + 's' : '-'}`],
  ];
  console.log('\nFORMAT F2 (fixed-stage chronology) checks, grammar/FORMATS.md');
  for (const [ok, text] of fc) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${text}`);
  console.log(`format F2: ${fc.every(([ok]) => ok) ? 'PASS' : 'FAIL'} (${fc.filter(([ok]) => ok).length}/${fc.length})`);
}
// ---- text: cut off, overlapping, under the phone UI (every string drawn, traced to screen)
printTextCheck(TXT, PIECE.review?.textIgnore || []);

// ---- sound: the payoff numbers every piece reports (craft.md -> Sound), whatever the format
const WAV = path.join(ROOT, 'renders', 'audio.wav');
if (fs.existsSync(WAV)) {
  const SR = 8000, WIN = SR / 10;
  const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', SOUND_WAV, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 }).stdout;
  const db = [];
  for (let o = 0; o + WIN * 2 <= pcm.length; o += WIN * 2) { let q = 0; for (let i = 0; i < WIN; i++) { const v = pcm.readInt16LE(o + i * 2) / 32768; q += v * v; } db.push(10 * Math.log10(q / WIN + 1e-12)); }
  const L = db.indexOf(Math.max(...db));
  let run = 0, best = 0, bestEnd = L;
  for (let w = Math.max(0, L - 20); w < L; w++) { run = db[w] <= -40 ? run + 1 : 0; if (run > best) { best = run; bestEnd = w; } }
  const eb = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', WAV, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const num = (re) => { const m = eb.match(re); return m ? Number(m[1]) : null; };
  const I = num(/Integrated loudness:[\s\S]*?I:\s+(-?[\d.]+) LUFS/), LRA = num(/Loudness range:[\s\S]*?LRA:\s+(-?[\d.]+) LU/), TP = num(/True peak:[\s\S]*?Peak:\s+(-?[\d.]+) dBFS/);
  const gift = (T.acts || []).find((a) => a.role === 'gift');
  console.log(SOUND_WAV === SCORE_WAV ? '\nSOUND (the payoff window on the score without the voice: renders/audio-score.wav; loudness on the mix)' : '\nSOUND (mix: renders/audio.wav)');
  console.log(`  loudest 100ms window: ${(L / 10).toFixed(1)}s (${db[L].toFixed(1)} dBFS)${gift ? ` - ${L / 10 >= gift.t0 && L / 10 < gift.t1 ? 'in' : 'NOT in'} the payoff act ${gift.t0}-${gift.t1}s` : ''}`);
  console.log(`  silence before it: ${(best / 10).toFixed(1)}s at <= -40 dBFS${best ? ` ending ${((bestEnd + 1) / 10).toFixed(1)}s` : ''} in the 2s before (craft.md wants 0.5-4s when the story has a turn)`);
  console.log(`  loudness: ${I != null ? I.toFixed(1) + ' LUFS integrated' : 'n/a'}, range ${LRA != null ? LRA.toFixed(1) + ' LU' : 'n/a'}, true peak ${TP != null ? TP.toFixed(1) + ' dBFS' : 'n/a'} (phone target about -16 to -14 LUFS, peak <= -1)`);
}
// ---- dead beats: something new should happen every 2-4s; flag stretches where the picture barely changes
{
  const step = Math.max(1, Math.round(T.fps / 4)), lag = Math.round(T.fps / 2), pts = [];
  for (let f = lag; f < nFrames; f += step) pts.push([f, frameDiff(f, f - lag)]);
  const sorted = pts.map((p) => p[1]).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 0;
  const thr = Math.max(0.8, 0.25 * med), deadMax = PIECE.review?.deadMax ?? 3.0;
  const held = (T.acts || []).filter((a) => a.role === 'silence');
  const runs = []; let r0 = null;
  for (const [f, d] of [...pts, [nFrames, 1e9]]) {
    const t = f / T.fps, still = d < thr && !held.some((a) => t >= a.t0 && t < a.t1);
    if (still && r0 == null) r0 = t; else if (!still && r0 != null) { if (t - r0 >= deadMax) runs.push([r0, t]); r0 = null; }
  }
  console.log(`\nDEAD BEATS (the picture's change over 0.5s, every ${(step / T.fps).toFixed(2)}s; median ${med.toFixed(2)}, "still" below ${thr.toFixed(2)}; silence acts are exempt)`);
  for (const [a, b] of runs) console.log(`  WARN  ${a.toFixed(2)}-${b.toFixed(2)}s: ${(b - a).toFixed(1)}s with nothing new on screen (deadMax ${deadMax}s) — add a move, a reveal or a cut`);
  console.log(`dead beats: ${runs.length ? 'WARN' : 'PASS'} (${runs.length} stretch${runs.length === 1 ? '' : 'es'} over ${deadMax}s)`);
}
// ---- the phone sheet: one frame a second at 360px wide, the size people watch at
{
  const cols = 6, rows = Math.ceil(nFrames / T.fps / cols), out = path.join(REVIEW, 'phone.jpg');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', VIDEO, '-vf', `fps=1,scale=360:-2,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', out]);
  console.log(r.status === 0 ? `PHONE SHEET: ${path.relative(ROOT, out)} (one frame a second at 360px wide — read every caption at this size)` : 'phone sheet failed');
}
console.log(`\nvideo: ${FW}x${FH}, ${nFrames} frames decoded`);
