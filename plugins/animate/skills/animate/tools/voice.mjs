#!/usr/bin/env node
// Voice-over: place the script's lines on the timeline and time every word, so the picture can cue on the voice.
//   usage: node tools/voice.mjs pieces/<name> [--scratch] [--model small.en] [--rate 0]
// reads  <piece>/voice/script.json:
//   { "lead": 0.8, "tail": 1.5, "lines": [ { "id": "open", "text": "As it is spoken.", "file": "open.mp3", "after": 0.4 }, ... ] }
//   file   the line's audio, relative to <piece>/voice/: a text-to-speech take (e.g. the ElevenLabs MCP's download link,
//          saved there), or the user's own recording. One file per line, so pauses and re-takes stay per line.
//   after  the pause after the line (s); lead = silence before the first line, tail = after the last
// writes <piece>/voice/voice.wav (48 kHz mono, the lines with their pauses) and <piece>/voice.json:
//   { duration, lines: [ { id, text, t0, t1, words: [ { w, t0, t1 } ] } ] }; tools/build.mjs injects it as VOICE.
// Word times come from the audio itself (tools/voice_words.py, faster-whisper, local); without it they are estimated
// from the letters. --scratch makes any missing line with the OS's own speech (Windows SAPI, macOS say) so the picture
// can be timed before the real voice exists: swap the real takes in, run this again, rebuild — scenes that cue from
// VOICE move with it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
if (!argv[0] || argv[0].startsWith('--')) { console.error('usage: node tools/voice.mjs pieces/<name> [--scratch] [--model small.en] [--rate 0]'); process.exit(2); }
const ROOT = path.resolve(argv[0]), VDIR = path.join(ROOT, 'voice'), SR = 48000;
const S = JSON.parse(fs.readFileSync(path.join(VDIR, 'script.json'), 'utf8'));
const HERE = path.dirname(fileURLToPath(import.meta.url));

// --scratch: the OS's own voice for missing lines (timing only; never ship it)
function scratch(text, out) {
  if (process.platform === 'win32') {
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = ${Number(opt('--rate', 0))}; $s.SetOutputToWaveFile($env:VO_OUT); $s.Speak($env:VO_TEXT); $s.Dispose()`;
    return spawnSync('powershell', ['-NoProfile', '-Command', ps], { env: { ...process.env, VO_TEXT: text, VO_OUT: out } }).status === 0;
  }
  if (process.platform === 'darwin') return spawnSync('say', ['-o', out, '--data-format=LEI16@22050', text]).status === 0;
  return spawnSync('espeak', ['-w', out, text]).status === 0;
}

// decode a take to 48 kHz mono s16, trimmed of the silence around it
function decode(file) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02';
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-af', `${trim},areverse,${trim},areverse`, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error('could not decode', file, r.stderr.toString()); process.exit(1); }
  return r.stdout;
}

const lead = S.lead ?? 0.8, tail = S.tail ?? 1.5;
const parts = [], lines = [];
let t = lead;
for (const [i, L] of S.lines.entries()) {
  const id = L.id || `l${i + 1}`;
  let file = L.file ? path.join(VDIR, L.file) : path.join(VDIR, `${id}.wav`);
  if (!fs.existsSync(file)) {
    if (!argv.includes('--scratch')) { console.error(`missing take for line "${id}": ${file} (save the take there, or run with --scratch for a timing voice)`); process.exit(1); }
    file = path.join(VDIR, `${id}.scratch.wav`);
    if (!scratch(L.text, file)) { console.error('scratch voice failed for', id); process.exit(1); }
  }
  const pcm = decode(file), dur = pcm.length / 2 / SR;
  lines.push({ id, text: L.text, t0: +t.toFixed(3), t1: +(t + dur).toFixed(3), take: path.relative(ROOT, file).replace(/\\/g, '/') });
  parts.push([Math.round(t * SR), pcm]);
  t += dur + (L.after ?? 0.35);
}
const last = lines[lines.length - 1], total = last.t1 + tail;
const out = Buffer.alloc(Math.ceil(total * SR) * 2);
for (const [s0, pcm] of parts) pcm.copy(out, s0 * 2);
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + out.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28);
hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(out.length, 40);
const wav = path.join(VDIR, 'voice.wav');
fs.writeFileSync(wav, Buffer.concat([hdr, out]));

// ---- word times: what the recogniser heard, matched to the script's words line by line
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
let heard = null;
const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(HERE, 'voice_words.py'), wav, '--model', opt('--model', 'small.en')], { maxBuffer: 1 << 26 });
if (py.status === 0) { try { heard = JSON.parse(py.stdout.toString().trim().split('\n').pop()); } catch { heard = null; } }
if (!heard) console.warn('word times: faster-whisper unavailable (pip install faster-whisper) — estimating from the letters');
let matched = 0, totalWords = 0;
for (const L of lines) {
  const words = L.text.split(/\s+/).filter((w) => norm(w));
  totalWords += words.length;
  // estimate: spread the line's length over its words by letter count
  const lens = words.map((w) => norm(w).length + 1), sum = lens.reduce((a, b) => a + b, 0);
  let acc = L.t0;
  L.words = words.map((w, i) => { const d = (L.t1 - L.t0) * lens[i] / sum, o = { w, t0: +acc.toFixed(3), t1: +(acc + d).toFixed(3), est: true }; acc += d; return o; });
  if (!heard) continue;
  const H = heard.filter((h) => (h.t0 + h.t1) / 2 >= L.t0 - 0.15 && (h.t0 + h.t1) / 2 <= L.t1 + 0.15);
  // align script words to heard words (edit distance on normalised tokens), then take the times of the matches
  const a = words.map(norm), b = H.map((h) => norm(h.w)), n = a.length, m = b.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] === b[j - 1]) { Object.assign(L.words[i - 1], { t0: H[j - 1].t0, t1: H[j - 1].t1 }); delete L.words[i - 1].est; matched++; }
      i--; j--;
    } else if (D[i][j] === D[i - 1][j] + 1) i--; else j--;
  }
  // unmatched words: fill between their matched neighbours
  for (let i = 0; i < L.words.length; i++) if (L.words[i].est) {
    let j = i; while (j < L.words.length && L.words[j].est) j++;
    const s = i > 0 ? L.words[i - 1].t1 : L.t0, e = j < L.words.length ? L.words[j].t0 : L.t1, k = j - i;
    for (let q = 0; q < k; q++) Object.assign(L.words[i + q], { t0: +(s + (e - s) * q / k).toFixed(3), t1: +(s + (e - s) * (q + 1) / k).toFixed(3) });
    i = j - 1;
  }
}
const voice = { duration: +total.toFixed(3), lead, tail, lines };
fs.writeFileSync(path.join(ROOT, 'voice.json'), JSON.stringify(voice, null, 1));
console.log(`voice: ${lines.length} lines, ${totalWords} words, ${total.toFixed(2)}s (lead ${lead}s, tail ${tail}s); word times ${heard ? `${matched}/${totalWords} heard, the rest filled in` : 'estimated'}`);
for (const L of lines) console.log(`  ${L.id.padEnd(10)} ${L.t0.toFixed(2)}-${L.t1.toFixed(2)}s  ${(L.words.length / (L.t1 - L.t0)).toFixed(2)} w/s  ${L.take}  "${L.text}"`);
console.log(`wrote ${path.relative(process.cwd(), wav)} and ${path.relative(process.cwd(), path.join(ROOT, 'voice.json'))} (rebuild to inject VOICE)`);
