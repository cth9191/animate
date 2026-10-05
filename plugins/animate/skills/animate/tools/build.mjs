#!/usr/bin/env node
// Assemble <piece>/index.html from the piece's src/ parts, this skill's kit/ and the piece's style kit, then check it.
//   usage: node tools/build.mjs <piece dir>
// Order comes from <piece>/piece.json "build" (the whole list) or "scenes" (replaces src/scenes.js only), default:
//   head, kit/core, style, scenes, bridges, kit/morph (the renderer), kit/board, kit/score-head, score, kit/score-tail
// Part names:
//   "kit/<file>"            this skill's kit/
//   "style"                 the kit.js of the style named by piece.json "style" (default "cut-paper")
//   "styles/<name>/<file>"  a file of a named style
//   anything else           relative to the piece dir
// A style is found in a styles/<name>/ folder beside the piece or above it, then in this skill's styles/
// (so a style made for one project, e.g. <project>/styles/my-look/, works for every piece in that project).
// Checks: the script compiles; the style defines STYLE; no data: URIs and no http(s) URLs in the code.
// Generated parts: <piece>/beats.json -> const BEATS (a supplied track's beat map); <piece>/voice.json -> const VOICE (voice-over timing); <piece>/assets/* -> const ASSETS
// (the user's own screenshots and logos, embedded; window.renderFrame appears once they're decoded).
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
// "scenes": ["src/era-01.js", ...] swaps src/scenes.js for several files in the default order (one per agent / era)
const parts = meta.build || (meta.scenes ? DEFAULT.flatMap((p) => (p === 'src/scenes.js' ? meta.scenes : [p])) : DEFAULT);
let out = '';
for (const p of parts) {
  const file = resolve(p);
  if (!fs.existsSync(file)) { console.error(`missing part: ${p} (${file})`); process.exit(1); }
  out += fs.readFileSync(file, 'utf8').replace(/\s*$/, '\n');
}
const m = out.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no <script> block found'); process.exit(1); }
if (!/\bconst STYLE\s*=/.test(m[1])) { console.error('no STYLE hooks: the style kit must define `const STYLE = { ... }` (see styles/cut-paper/kit.js)'); process.exit(1); }
// the code itself: no data: URIs, no URLs (the user's own assets are added below, from <piece>/assets/ only)
const bad = out.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /data:[a-z]+\/|https?:\/\//i.test(l));
if (bad.length) { console.error('forbidden (data: URI or http URL):', bad.slice(0, 5).map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`).join(' | ')); process.exit(1); }

// ---- generated parts, injected right after "use strict" (before the head's own code runs)
const inject = [];
// a supplied music track's beat map (tools/beats.mjs -> <piece>/beats.json): the head reads BEATS.bpm / BEATS.offset
const beatsFile = path.join(ROOT, 'beats.json');
if (fs.existsSync(beatsFile)) inject.push(`// ---- beats.json (tools/beats.mjs): the supplied track's tempo, beats, downbeats and hits\nconst BEATS = ${JSON.stringify(JSON.parse(fs.readFileSync(beatsFile, 'utf8')))};`);
// a voice-over's timing (tools/voice.mjs -> <piece>/voice.json): lines and word times the scenes cue on
const voiceFile = path.join(ROOT, 'voice.json');
if (fs.existsSync(voiceFile)) { const V = JSON.parse(fs.readFileSync(voiceFile, 'utf8')); V.lines.forEach((l) => delete l.take); inject.push(`// ---- voice.json (tools/voice.mjs): the voice-over's lines and word times
const VOICE = ${JSON.stringify(V)};`); }
// the user's own assets: screenshots and logos in <piece>/assets/, embedded so the piece stays one file and
// the canvas stays readable (an image loaded from a file:// URL would taint it and break every check)
const ASSET_DIR = path.join(ROOT, 'assets'), MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
const assetFiles = fs.existsSync(ASSET_DIR) ? fs.readdirSync(ASSET_DIR).filter((n) => MIME[n.split('.').pop().toLowerCase()]) : [];
let assetBytes = 0;
if (assetFiles.length) {
  const src = {};
  for (const n of assetFiles) { const b = fs.readFileSync(path.join(ASSET_DIR, n)); assetBytes += b.length; src[n] = `data:${MIME[n.split('.').pop().toLowerCase()]};base64,` + b.toString('base64'); }
  inject.push(`// ---- assets/ (embedded by tools/build.mjs): ${assetFiles.join(', ')}\nconst ASSETS = {};\nwindow.ASSETS_READY = Promise.all(Object.entries(${JSON.stringify(src)}).map(([k, u]) => { const i = new Image(); i.src = u; ASSETS[k] = i; return i.decode(); }));`);
}
if (inject.length) {
  const at = out.indexOf('"use strict";') >= 0 ? out.indexOf('"use strict";') + '"use strict";'.length : out.indexOf('<script>') + '<script>'.length;
  out = out.slice(0, at) + '\n' + inject.join('\n') + out.slice(at);
}
// with assets, tools wait until the images are decoded: window.renderFrame appears only then
if (assetFiles.length) {
  const end = out.lastIndexOf('</script>');
  out = out.slice(0, end) + `// ---- hold renderFrame until the assets are decoded (export, review and tile wait for it)\n{ const rf = window.renderFrame; window.renderFrame = undefined; window.ASSETS_READY.then(() => { window.renderFrame = rf; }); }\n` + out.slice(end);
}
const m2 = out.match(/<script>([\s\S]*)<\/script>/);
try { new vm.Script(m2[1], { filename: 'index.html' }); } catch (e) { console.error('syntax error:', e.message); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
const extras = [fs.existsSync(beatsFile) ? 'beats.json' : null, fs.existsSync(voiceFile) ? 'voice.json' : null, assetFiles.length ? `${assetFiles.length} asset(s), ${(assetBytes / 1e6).toFixed(1)} MB` : null].filter(Boolean);
if (assetBytes > 12e6) console.warn(`warning: ${(assetBytes / 1e6).toFixed(1)} MB of assets — resize screenshots to the size they're shown at`);
console.log(`built ${path.join(ROOT, 'index.html')}: ${out.split('\n').length} lines from ${parts.length} parts (style: ${styleName})${extras.length ? ' + ' + extras.join(' + ') : ''}; syntax ok; no external assets`);
