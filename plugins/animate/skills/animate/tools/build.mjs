#!/usr/bin/env node
// Assemble <piece>/index.html from the piece's src/ parts, this skill's kit/ and the piece's style kit, then check it.
//   usage: node tools/build.mjs <piece dir>
// Order comes from <piece>/piece.json "build", default:
//   head, kit/core, style, scenes, bridges, kit/morph (the renderer), kit/board, kit/score-head, score, kit/score-tail
// Part names:
//   "kit/<file>"            this skill's kit/
//   "style"                 the kit.js of the style named by piece.json "style" (default "cut-paper")
//   "styles/<name>/<file>"  a file of a named style
//   anything else           relative to the piece dir
// A style is found in a styles/<name>/ folder beside the piece or above it, then in this skill's styles/
// (so a style made for one project, e.g. <project>/styles/my-look/, works for every piece in that project).
// Checks: the script compiles; the style defines STYLE; no data: URIs and no http(s) URLs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT = ['src/head.html', 'kit/core.js', 'style', 'src/scenes.js', 'src/bridges.js', 'kit/morph.js', 'kit/board.js', 'kit/score-head.js', 'src/score.js', 'kit/score-tail.js'];
const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build.mjs <piece dir>'); process.exit(2); }
const ROOT = path.resolve(dir);
const meta = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};
const styleName = meta.style || 'cut-paper';
// a style's folder: the piece's own tree first (walking up), then the skill
function styleDir(name) {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const c = path.join(d, 'styles', name);
    if (fs.existsSync(path.join(c, 'kit.js'))) return c;
    if (path.dirname(d) === d) break;
  }
  const c = path.join(SKILL, 'styles', name);
  if (fs.existsSync(path.join(c, 'kit.js'))) return c;
  const have = fs.readdirSync(path.join(SKILL, 'styles')).filter((n) => fs.existsSync(path.join(SKILL, 'styles', n, 'kit.js')));
  console.error(`unknown style "${name}" (no styles/${name}/kit.js beside the piece or in the skill). Skill styles: ${have.join(', ')}`);
  process.exit(1);
}
function resolve(p) {
  if (p === 'style') return path.join(styleDir(styleName), 'kit.js');
  if (p === 'kit/paper.js') return path.join(SKILL, 'styles', 'cut-paper', 'kit.js');   // the v0.1 name
  if (p.startsWith('kit/')) return path.join(SKILL, 'kit', p.slice(4));
  const m = p.match(/^styles\/([^/]+)\/(.+)$/);
  if (m && !fs.existsSync(path.join(ROOT, p))) return path.join(styleDir(m[1]), m[2]);
  return path.join(ROOT, p);
}
const parts = meta.build || DEFAULT;
let out = '';
for (const p of parts) {
  const file = resolve(p);
  if (!fs.existsSync(file)) { console.error(`missing part: ${p} (${file})`); process.exit(1); }
  out += fs.readFileSync(file, 'utf8').replace(/\s*$/, '\n');
}
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
const m = out.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no <script> block found'); process.exit(1); }
try { new vm.Script(m[1], { filename: 'index.html' }); } catch (e) { console.error('syntax error:', e.message); process.exit(1); }
if (!/\bconst STYLE\s*=/.test(m[1])) { console.error('no STYLE hooks: the style kit must define `const STYLE = { ... }` (see styles/cut-paper/kit.js)'); process.exit(1); }
const bad = out.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /data:[a-z]+\/|https?:\/\//i.test(l));
if (bad.length) { console.error('forbidden (data: URI or http URL):', bad.slice(0, 5).map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`).join(' | ')); process.exit(1); }
console.log(`built ${path.join(ROOT, 'index.html')}: ${out.split('\n').length} lines from ${parts.length} parts (style: ${styleName}); syntax ok; no external assets`);
