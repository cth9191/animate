#!/usr/bin/env node
// Text check: every string the piece draws (fillText / strokeText), traced to screen space on sampled frames.
// Flags text that is cut off by the frame edge, text that overlaps other text, and text under the phone UI.
// A model reviewing contact sheets by eye misses these (a cropped label reads as "fine" at thumbnail size).
//   usage: node tools/textcheck.mjs <piece dir> [--every 6]       (also run by review.mjs)
// Deliberate crowding (a storm of chat bubbles flying past the edges) goes in piece.json:
//   "review": { "textIgnore": [[t0, t1, "why"]] }  -> issues inside those seconds print as OK (allowed), not FAIL.
// Frames inside morph bridges are skipped (the world is scaled through a window there on purpose).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export async function textCheck(page, o = {}) {
  return page.evaluate(async ({ every, safe }) => {
    const T = window.TIMELINE, W = T.width, H = T.height, P = CanvasRenderingContext2D.prototype;
    const rec = [];
    const wrap = (name) => {
      const orig = P[name];
      P[name] = function (str, x, y, maxW) {
        const s = String(str);
        if (s.trim() && this.canvas.width === W && this.canvas.height === H && this.globalAlpha > 0.05) {
          const m = this.measureText(s), w = maxW != null ? Math.min(m.width, maxW) : m.width;
          const al = this.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
          const asc = m.actualBoundingBoxAscent || 0, desc = m.actualBoundingBoxDescent || 0;
          const tf = this.getTransform(), pts = [[x0, y - asc], [x0 + w, y - asc], [x0 + w, y + desc], [x0, y + desc]].map(([px, py]) => [tf.a * px + tf.c * py + tf.e, tf.b * px + tf.d * py + tf.f]);
          const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
          rec.push({ s, q: pts, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
        }
        return orig.apply(this, arguments);
      };
      return () => { P[name] = orig; };
    };
    const undo = [wrap('fillText'), wrap('strokeText')];
    const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
    const clip = (P, Q) => {   // Sutherland-Hodgman: convex polygon P clipped by convex polygon Q
      const sgn = Math.sign((Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]) - (Q[1][1] - Q[0][1]) * (Q[2][0] - Q[0][0])) || 1;
      let out = P;
      for (let i = 0; i < Q.length && out.length; i++) {
        const A = Q[i], B = Q[(i + 1) % Q.length], inside = (p) => sgn * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= 0;
        const inp = out; out = [];
        for (let j = 0; j < inp.length; j++) {
          const cur = inp[j], prev = inp[(j + inp.length - 1) % inp.length];
          const hit = () => { const dx = cur[0] - prev[0], dy = cur[1] - prev[1], ex = B[0] - A[0], ey = B[1] - A[1], den = dx * ey - dy * ex; const t = den ? ((A[0] - prev[0]) * ey - (A[1] - prev[1]) * ex) / den : 0; return [prev[0] + t * dx, prev[1] + t * dy]; };
          if (inside(cur)) { if (!inside(prev)) out.push(hit()); out.push(cur); } else if (inside(prev)) out.push(hit());
        }
      }
      return out;
    };
    await document.fonts.ready;
    const bridges = typeof BRIDGES !== 'undefined' ? BRIDGES : [];
    const inBridge = (t) => bridges.some((r) => Math.abs(t - r.tc) < (r.d ?? 0.6) + 1e-6);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const issues = new Map(), add = (kind, text, t) => { const k = kind + '|' + text; const v = issues.get(k); if (v) { v.t1 = t; v.n++; } else issues.set(k, { kind, text, t0: t, t1: t, n: 1 }); };
    let frames = 0;
    // every Nth frame, plus the first and last frame of every shot (a 3-frame shot is never skipped)
    const fs = new Set(); for (let f = 0; f < T.frames; f += every) fs.add(f);
    for (const sh of T.shots || []) { const a = Math.round(sh.t0 * T.fps), b = Math.round(sh.t1 * T.fps) - 1; if (a < T.frames) fs.add(a); if (b >= a && b < T.frames) fs.add(b); }
    for (const f of [...fs].sort((x, y) => x - y)) {
      const t = f / T.fps; if (inBridge(t)) continue;
      rec.length = 0; window.renderFrame(t, cv); frames++;
      const seen = new Map();
      for (const b of rec) { const k = `${b.s}|${Math.round(b.x0)}|${Math.round(b.y0)}`; if (!seen.has(k)) seen.set(k, b); }
      const boxes = [...seen.values()].filter((b) => b.x1 - b.x0 > 2 && b.y1 - b.y0 > 2);
      for (const b of boxes) {
        const label = b.s.length > 40 ? b.s.slice(0, 40) + '…' : b.s;
        // single characters (a 'z' over a sleeping cat, a '?') are decoration a close-up may crop; words are not
        if (b.s.trim().length > 1 && (b.x0 < -3 || b.y0 < -3 || b.x1 > W + 3 || b.y1 > H + 3)) add('cut off by the frame edge', label, t);
        else if (safe && (b.y1 > H - safe.bottom + 2 || (b.x1 > W - safe.right + 2 && b.y1 > safe.top && b.y0 < H - safe.bottom)) && b.y0 > safe.top) add('under the phone UI (safe zone)', label, t);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.s === b.s || a.s.includes(b.s) || b.s.includes(a.s)) continue;
        if (Math.min(a.x1, b.x1) <= Math.max(a.x0, b.x0) || Math.min(a.y1, b.y1) <= Math.max(a.y0, b.y0)) continue;
        // the real (possibly rotated / skewed) text boxes, not their screen-aligned bounds
        const small = Math.min(area(a.q), area(b.q));
        if (area(clip(a.q, b.q)) > 0.25 * small) add('overlaps other text', `"${a.s.slice(0, 24)}" × "${b.s.slice(0, 24)}"`, t);
      }
    }
    undo.forEach((u) => u());
    return { frames, issues: [...issues.values()] };
  }, { every: o.every || 6, safe: o.safe ?? null });
}

export function printTextCheck(r, ignore = []) {
  const allowed = (i) => ignore.find(([a, b]) => i.t0 >= a - 1e-6 && i.t1 <= b + 1e-6);
  const ok = r.issues.filter(allowed), rest = r.issues.filter((i) => !allowed(i));
  const bad = rest.filter((i) => i.kind !== 'under the phone UI (safe zone)'), warn = rest.filter((i) => i.kind === 'under the phone UI (safe zone)');
  console.log(`\nTEXT (every string drawn, traced to screen; ${r.frames} frames sampled, morph windows skipped)`);
  for (const i of [...bad, ...warn]) console.log(`  ${bad.includes(i) ? 'FAIL' : 'WARN'}  ${i.kind}: ${i.text}  at ${i.t0.toFixed(2)}${i.t1 > i.t0 ? `–${i.t1.toFixed(2)}` : ''}s (${i.n} frames)`);
  for (const [a, b, why] of ignore) { const n = ok.filter((i) => i.t0 >= a - 1e-6 && i.t1 <= b + 1e-6).length; if (n) console.log(`  OK    ${n} issue(s) in ${a}–${b}s allowed by piece.json review.textIgnore: ${why || ''}`); }
  console.log(`text: ${bad.length ? 'FAIL' : 'PASS'} (${bad.length} cut-off/overlap, ${warn.length} in the safe zone)`);
  return !bad.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
  const args = process.argv.slice(2), ei = args.indexOf('--every'), every = ei >= 0 ? Number(args.splice(ei, 2)[1]) : 6;
  const fmtI = args.indexOf('--format'), format = fmtI >= 0 ? args.splice(fmtI, 2)[1] : null;
  if (!args[0]) { console.error('usage: node tools/textcheck.mjs <piece dir> [--every 6]'); process.exit(2); }
  const file = args[0].endsWith('.html') ? args[0] : path.join(args[0], 'index.html');
  const browser = await chromium.launch(), page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1' + (format ? `&format=${encodeURIComponent(format)}` : ''));
  await page.waitForFunction(() => window.TIMELINE && window.renderFrame);
  const safe = await page.evaluate(() => (window.TIMELINE.height > window.TIMELINE.width ? window.TIMELINE.safe || { top: 240, bottom: 420, right: 140 } : null));
  const pj = path.join(args[0].endsWith('.html') ? path.dirname(args[0]) : args[0], 'piece.json');
  const ignore = fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, 'utf8')).review?.textIgnore || [] : [];
  const ok = printTextCheck(await textCheck(page, { every, safe }), ignore);
  await browser.close();
  process.exit(ok ? 0 : 1);
}
