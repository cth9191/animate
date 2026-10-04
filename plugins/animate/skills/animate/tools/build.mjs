#!/usr/bin/env node
// Assemble <piece>/index.html from the piece's src/ parts and this skill's kit/, then check it.
//   usage: node tools/build.mjs <piece dir>
// Order comes from <piece>/piece.json "build" (paths starting with "kit/" resolve to the skill's kit),
// default: head, core, paper, scenes, bridges, morph, board, score-head, score, score-tail.
// Checks: the script compiles; no data: URIs and no http(s) URLs (everything is drawn and synthesized in code).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'kit');
const DEFAULT = ['src/head.html', 'kit/core.js', 'kit/paper.js', 'src/scenes.js', 'src/bridges.js', 'kit/morph.js', 'kit/board.js', 'kit/score-head.js', 'src/score.js', 'kit/score-tail.js'];
const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build.mjs <piece dir>'); process.exit(2); }
const ROOT = path.resolve(dir);
const meta = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};
const parts = meta.build || DEFAULT;
let out = '';
for (const p of parts) {
  const file = p.startsWith('kit/') ? path.join(KIT, p.slice(4)) : path.join(ROOT, p);
  if (!fs.existsSync(file)) { console.error(`missing part: ${p} (${file})`); process.exit(1); }
  out += fs.readFileSync(file, 'utf8').replace(/\s*$/, '\n');
}
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
const m = out.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no <script> block found'); process.exit(1); }
try { new vm.Script(m[1], { filename: 'index.html' }); } catch (e) { console.error('syntax error:', e.message); process.exit(1); }
const bad = out.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /data:[a-z]+\/|https?:\/\//i.test(l));
if (bad.length) { console.error('forbidden (data: URI or http URL):', bad.slice(0, 5).map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`).join(' | ')); process.exit(1); }
console.log(`built ${path.join(ROOT, 'index.html')}: ${out.split('\n').length} lines from ${parts.length} parts; syntax ok; no external assets`);
