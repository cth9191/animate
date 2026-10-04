#!/usr/bin/env node
// Beat map of a supplied music track -> <piece>/beats.json, which tools/build.mjs injects as BEATS.
//   usage: node tools/beats.mjs <track.wav|mp3|m4a> <piece dir | out.json> [--start 0] [--dur 30] [--bpm 70-180 | --bpm 100]
//   If the user knows the track's BPM, pass it: detection is right on most music with a beat, not on every track.
//   --start/--dur: the part of the track the piece uses (export.mjs takes the same window from piece.json "music")
// Prints and writes: bpm, offset (the first beat, seconds into the used window), beats[], downbeats[] (bar starts),
// hits[] (the strongest onsets: where the big moments go), loudest (the loudest 100ms) and quiet[] (drops).
// Method (no dependencies): ffmpeg decode -> spectral-flux onset strength -> tempo by autocorrelation with a
// prior around 120 BPM -> beat phase by the strongest onset comb -> bar phase by the low-band energy.
// Constant tempo is assumed (most pop, electronic and library music); check the printed grid against a listen.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const START = Number(opt('--start', 0)), DUR = opt('--dur', null), BPM_ARG = String(opt('--bpm', '70-180'));
// --bpm 70-180 searches a range; --bpm 100 (a known tempo) only refines it (+-2%) and finds the phase
const [BMIN, BMAX] = BPM_ARG.includes('-') ? BPM_ARG.split('-').map(Number) : [Number(BPM_ARG), Number(BPM_ARG)];
const [src, dest] = args;
if (!src || !dest) { console.error('usage: node tools/beats.mjs <track> <piece dir | out.json> [--start 0] [--dur 30] [--bpm 70-180]'); process.exit(2); }
const SR = 22050, HOP = 512, N = 1024, FPS_O = SR / HOP;   // onset frames per second ~43
const ff = ['-v', 'error', '-ss', String(START), ...(DUR ? ['-t', String(DUR)] : []), '-i', src, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'];
const raw = spawnSync('ffmpeg', ff, { maxBuffer: 1 << 30 }).stdout;
if (!raw || !raw.length) { console.error('could not decode', src); process.exit(1); }
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);

// ---- FFT (radix-2, in place)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
// ---- onset strength (log-magnitude spectral flux), low-band flux for downbeats, RMS per 100ms
const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const nF = Math.max(0, Math.floor((x.length - N) / HOP)), onset = new Float32Array(nF), low = new Float32Array(nF);
let prev = new Float32Array(N / 2);
const lowBin = Math.round(150 / (SR / N));
for (let f = 0; f < nF; f++) {
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = x[f * HOP + i] * win[i];
  fft(re, im);
  const mag = new Float32Array(N / 2); let fl = 0, lf = 0;
  for (let k = 1; k < N / 2; k++) { mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k])); const d = mag[k] - prev[k]; if (d > 0) { fl += d; if (k <= lowBin) lf += d; } }
  onset[f] = fl; low[f] = lf; prev = mag;
}
// normalise: subtract a local mean so slow swells don't read as onsets
const smooth = (a, r) => { const o = new Float32Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i > 2 * r) s -= a[i - 2 * r - 1]; o[i] = s / Math.min(i + 1, 2 * r + 1); } return o; };
const loc = smooth(onset, 8), env = onset.map((v, i) => Math.max(0, v - (loc[Math.min(onset.length - 1, i + 8)] || 0)));
// ---- tempo candidates: peaks of the onset autocorrelation, plus each one's metrical relatives
const acAt = (bpm) => { const lag = 60 / bpm * FPS_O; let sum = 0; for (let i = Math.ceil(lag); i < env.length; i++) { const j = i - lag, j0 = Math.floor(j), fr = j - j0; sum += env[i] * (env[j0] * (1 - fr) + env[j0 + 1] * fr); } return sum / (env.length - lag); };
const grid = []; for (let b = BMIN; b <= BMAX; b += 0.5) grid.push([b, acAt(b)]);
const peaksAc = grid.filter(([, v], i) => i > 0 && i < grid.length - 1 && v >= grid[i - 1][1] && v >= grid[i + 1][1]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([b]) => b);
const cands = new Set(peaksAc.length ? [] : [Math.round((BMIN + BMAX) / 2 * 4) / 4]);
for (const b of peaksAc) for (const r of [1, 2, 0.5, 1.5, 2 / 3, 4 / 3, 0.75]) { const c = b * r; if (c >= BMIN && c <= BMAX) cands.add(Math.round(c * 4) / 4); }
// ---- each candidate refined (tempo +-2%, every phase) by its beat comb over the whole track: each tooth takes the
// strongest onset within +-1 frame. A real beat lines up all the way through; a wrong one drifts off.
const near = (t) => { const i = Math.round(t * FPS_O); return Math.max(env[i - 1] || 0, env[i] || 0, env[i + 1] || 0); };
const comb = (per, o) => { let s2 = 0, n = 0; for (let t = o; t < env.length / FPS_O; t += per) { s2 += near(t); n++; } return s2 / Math.max(1, n); };
const prior = (b) => Math.exp(-0.5 * (Math.log2(b / 120) / 0.6) ** 2);   // tempo prior around 120 BPM
const scored = [...cands].map((b0) => {
  let bestC = null;
  const RW = BPM_ARG.includes("-") ? 0.02 : 0.002;   // a known tempo is trusted to 0.2%
  for (let b = b0 * (1 - RW); b <= b0 * (1 + RW) + 1e-9; b += 0.02) { const per = 60 / b; for (let o = 0; o < per; o += 1 / FPS_O / 2) { const sc = comb(per, o); if (!bestC || sc > bestC.s) bestC = { bpm: b, o, s: sc }; } }
  return { ...bestC, score: bestC.s * prior(bestC.bpm) };
}).sort((a, b) => b.score - a.score);
const ph = scored[0];
const bpm = ph.bpm, period = 60 / bpm;
// onset frame f is centred half a window after it starts: report times at the centre
const LAT = N / 2 / SR;
ph.o = (ph.o + LAT) % period;
const dur = x.length / SR, beats = [];
for (let t = ph.o; t < dur - 1e-6; t += period) beats.push(+t.toFixed(3));
// ---- bars: of the 4 beat phases, the one with the most low-band (kick) energy starts the bar
let bar = 0, bs = -1;
for (let k = 0; k < 4; k++) { let s = 0; for (let i = k; i < beats.length; i += 4) s += low[Math.round((beats[i] - LAT) * FPS_O)] || 0; if (s > bs) { bs = s; bar = k; } }
const downbeats = beats.filter((_, i) => i % 4 === bar);
// ---- hits: the strongest onset peaks, at least 0.4s apart
const mean = env.reduce((a, b) => a + b, 0) / env.length, sd = Math.sqrt(env.reduce((a, b) => a + (b - mean) ** 2, 0) / env.length);
const peaks = [];
for (let i = 1; i < env.length - 1; i++) if (env[i] > env[i - 1] && env[i] >= env[i + 1] && env[i] > mean + 2.5 * sd) peaks.push([i / FPS_O + LAT, env[i]]);
peaks.sort((a, b) => b[1] - a[1]);
const hits = []; for (const [t] of peaks) if (hits.every((h) => Math.abs(h - t) > 0.4)) hits.push(t);
hits.sort((a, b) => a - b);
// ---- loudness per 100ms: the loudest moment and the drops (>= 0.5s at 15 dB under the median)
const W1 = SR / 10, db = [];
for (let o = 0; o + W1 <= x.length; o += W1) { let s = 0; for (let i = 0; i < W1; i++) s += x[o + i] ** 2; db.push(10 * Math.log10(s / W1 + 1e-12)); }
const med = [...db].sort((a, b) => a - b)[Math.floor(db.length / 2)], L = db.indexOf(Math.max(...db));
const quiet = []; let q0 = -1;
db.forEach((v, i) => { if (v < med - 15) { if (q0 < 0) q0 = i; } else { if (q0 >= 0 && i - q0 >= 5) quiet.push([+(q0 / 10).toFixed(1), +(i / 10).toFixed(1)]); q0 = -1; } });
const out = { source: path.basename(src), start: START, duration: +dur.toFixed(3), bpm: +bpm.toFixed(2), offset: +ph.o.toFixed(3), period: +period.toFixed(4),
  beats, downbeats, hits: hits.map((t) => +t.toFixed(3)), loudest: { t: +(L / 10).toFixed(1), db: +db[L].toFixed(1) }, quiet };
const file = dest.endsWith('.json') ? dest : path.join(dest, 'beats.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`${out.source}: ${out.duration}s used from ${START}s; ${out.bpm} BPM (beat ${out.period}s = ${(out.period * 24).toFixed(2)} frames at 24fps), first beat ${out.offset}s, ${beats.length} beats, ${downbeats.length} bars (first at ${downbeats[0]}s)`);
console.log(`hits (the strongest onsets): ${out.hits.slice(0, 12).join(', ')}${out.hits.length > 12 ? ' …' : ''}`);
console.log(`loudest 100ms: ${out.loudest.t}s (${out.loudest.db} dBFS); drops: ${quiet.length ? quiet.map(([a, b]) => `${a}-${b}s`).join(', ') : 'none'}`);
console.log(`other tempos it considered: ${scored.slice(1, 4).map((c) => `${c.bpm.toFixed(1)} (${(c.score / scored[0].score * 100).toFixed(0)}%)`).join(', ')} — if the grid feels wrong, rerun with --bpm <lo>-<hi> around the right one`);
console.log(`-> ${file}`);
