// Regression test: the export mux must not truncate the audio.
//
// Bug: export.mjs muxed with `-frames:v N`; ffmpeg could finish the output when
// the video reached its frame count, leaving the audio stream short of the video.
//
// This test (1) asserts the mux command in export.mjs carries no `-frames:v`,
// and (2) functionally muxes a small synthetic piece exactly the way export.mjs
// does and checks the audio track covers the full video at several frame rates.
//
// Run: node tools/test/mux-audio-length.test.mjs   (needs ffmpeg + ffprobe on PATH)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXPORT = path.join(here, '..', 'export.mjs');

const has = (bin) => spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0;
if (!has('ffmpeg') || !has('ffprobe')) {
  console.log('SKIP: ffmpeg/ffprobe not on PATH');
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = 1;
};

// 1. the mux args must not carry -frames:v (the image sequence bounds the video itself)
const src = fs.readFileSync(EXPORT, 'utf8');
const argsStart = src.indexOf("const args = ['-y', '-hide_banner', '-loglevel', 'error',");
const argsEnd = src.indexOf("const r = spawnSync('ffmpeg', args", argsStart);
const muxArgsBlock = argsStart >= 0 && argsEnd > argsStart ? src.slice(argsStart, argsEnd) : '';
check('export.mjs mux args are found and omit -frames:v', !!muxArgsBlock && !muxArgsBlock.includes("'-frames:v'"));

// 2. functional: replicate the export mux on synthetic pieces
const run = (bin, args) => {
  const r = spawnSync(bin, args, { stdio: 'pipe' });
  if (r.status !== 0) throw new Error(`${bin} failed: ${r.stderr}`);
};
const durations = (file) => {
  const out = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,duration', '-of', 'csv=p=0', file]).stdout.toString();
  const d = {};
  for (const line of out.trim().split(/\r?\n/)) {
    const [kind, duration] = line.split(',');
    if (kind === 'video' || kind === 'audio') d[kind] = Number(duration);
  }
  return d;
};

// same arg shape as export.mjs's mux (post-fix): image sequence + wav, no -frames:v
const muxArgs = (fps, wav, out) => [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', String(fps), '-i', path.join('fr', 'f%04d.png'),
  '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-movflags', '+faststart', out,
];

for (const [fps, secs] of [[24, 8], [30, 5], [25, 7]]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mux-test-'));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    fs.mkdirSync('fr');
    run('ffmpeg', ['-f', 'lavfi', '-i', `color=c=gray:s=96x54:r=${fps}:d=${secs}`, '-start_number', '1', path.join('fr', 'f%04d.png')]);
    run('ffmpeg', ['-f', 'lavfi', '-i', `sine=frequency=440:duration=${secs},pan=stereo|c0=c0|c1=c0`, '-ar', '48000', 'in.wav']);
    run('ffmpeg', muxArgs(fps, 'in.wav', 'out.mp4'));
    const d = durations('out.mp4');
    // AAC framing/priming can wobble a stream duration by ~50ms; allow one video frame more than that
    const tol = 0.05 + 1 / fps;
    check(`${fps}fps/${secs}s: video is full length`, Math.abs(d.video - secs) <= 1 / fps + 0.01, `video=${d.video}s`);
    check(`${fps}fps/${secs}s: audio is not truncated`, Math.abs(d.audio - secs) <= tol, `audio=${d.audio}s`);
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

process.exit(failed);
