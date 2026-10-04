// =====================================================================
//  styles/math/kit.js — a manim-style math explainer look: a near-black stage, manim's palette, serif
//  LaTeX-like type that is Written on (outline, then fill, lagged per glyph), manim's `smooth` sigmoid,
//  ShowCreation sweeps, Transform between equations and shapes, axes / number planes / graphs, a tracking
//  dot with a live decimal readout, Flash, braces and arrows, and a pi-shaped hero with eyes.
//  Built on kit/core.js (RNG, clamp, lerp, ev, subPath, pathLen, ellipsePts, toScreen, fillAll, DEFER, SPARK_AT).
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Motion is on 1s (STYLE.ones = true).
//  Names here are distinct from core's on purpose: core's `smooth(a, b, x)` is a smoothstep, manim's is `smoothM(u)`.
// =====================================================================

// ---- palette: manim's colour constants (value = what the colour usually means in a piece)
const MC = {
  bg: '#0E0E10',                                      // the stage: near-black, never pure #000 in a gradient
  white: '#FFFFFF', greyA: '#DDDDDD', grey: '#BBBBBB', greyC: '#888888', greyD: '#444444', greyE: '#222222',
  blue: '#58C4DD', blueD: '#29ABCA', blueE: '#1C758A', // BLUE_C / BLUE_D (number-plane lines) / BLUE_E
  teal: '#5CD0B3', green: '#83C167', yellow: '#F7D96F', yellowP: '#FFFF00', gold: '#F0AC5F',
  red: '#FC6255', maroon: '#C55F73', purple: '#9A72AC', pink: '#D147BD', orange: '#FF862F',
  pi: '#2E86AB', piD: '#1C5A75',                       // the hero's body and its edge
};
// fonts: local system fonts only (Windows, then TeX fonts if installed, then macOS / Linux serifs)
const MATH_SERIF = 'Cambria, "Cambria Math", "Latin Modern Roman", "CMU Serif", "STIX Two Text", "Times New Roman", Georgia, serif';
const MATH_MONO = 'Consolas, Menlo, "DejaVu Sans Mono", "Courier New", monospace';

// ---- easing: manim's rate functions
const sigM = (x) => 1 / (1 + Math.exp(-x));
const smoothM = (u) => { u = clamp(u); return (sigM(10 * (u - 0.5)) - sigM(-5)) / (sigM(5) - sigM(-5)); };   // manim `smooth`
const thereBack = (u) => smoothM(u < 0.5 ? 2 * u : 2 - 2 * u);                                                  // manim `there_and_back`
const runS = (t0, d = 1) => smoothM((TT - t0) / d);   // progress of a play(..., run_time=d) that starts at t0
// LaggedStart: sub-progress of item i of n when the whole group has progress p (lag = how much the starts spread)
const lagged = (p, i, n, lag = 0.5) => { if (n <= 1) return clamp(p); const span = 1 / (1 + lag * (n - 1)); return clamp((p - i * lag * span) / span); };
// keyframed value [[t, v], ...], smooth between keys (absolute times on TT)
function keysM(ks, t = TT) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], smoothM((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])));
  return ks[ks.length - 1][1];
}
const rgbaM = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const fmtNum = (v, d = 2) => (v < -0.5 * 10 ** -d ? '−' : '') + Math.abs(v).toFixed(d);   // a true minus sign

// ---- text: one glyph drawn mid-Write (pi 0..1: the outline draws on over the first half, the fill fades in over the second)
function writeGlyph(ch, x, y, size, c, pi, alpha = 1) {
  if (pi <= 0 || alpha <= 0) return;
  const dashP = smoothM(pi * 2), fillA = smoothM(pi * 2 - 1);
  if (fillA < 1) {
    ctx.globalAlpha = alpha * (1 - fillA * 0.85);
    ctx.setLineDash([dashP * size * 4, 99999]); ctx.lineWidth = Math.max(1.2, size * 0.022); ctx.strokeStyle = c;
    ctx.strokeText(ch, x, y); ctx.setLineDash([]);
  }
  if (fillA > 0) { ctx.globalAlpha = alpha * fillA; ctx.fillStyle = c; ctx.fillText(ch, x, y); }
  ctx.globalAlpha = 1;
}
const fontM = (size, o = {}) => `${o.it ? 'italic ' : ''}${o.bold ? '700 ' : ''}${size}px ${o.font || MATH_SERIF}`;
function textW(str, size, o = {}) { ctx.save(); ctx.font = fontM(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// manim Write. segs: a string or [{ s, c, it }]. p: 0..1 progress (use runS). o: color, align, alpha, lag, it, font
function writeText(segs, x, y, size, p, o = {}) {
  if (typeof segs === 'string') segs = [{ s: segs, c: o.color || MC.white }];
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const chars = []; let tw = 0;
  for (const sg of segs) { const f = fontM(size, { ...o, it: sg.it ?? o.it }); ctx.font = f; for (const ch of sg.s) { const w = ctx.measureText(ch).width; chars.push({ ch, c: sg.c || o.color || MC.white, f, x: tw }); tw += w; } }
  // kerning-free per-glyph advance keeps Write's per-glyph timing simple; fine at display sizes
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - tw : x - tw / 2, alpha = o.alpha ?? 1, L = o.lag ?? 1.4;
  if (p > 0 && alpha > 0) {
    const vis = chars.filter((c) => c.ch !== ' '), n = vis.length;
    vis.forEach((c, i) => { ctx.font = c.f; writeGlyph(c.ch, x0 + c.x, y, size, c.c, clamp(p * (1 + L) - (L * i) / Math.max(1, n - 1)), alpha); });
  }
  ctx.restore();
  return tw;
}
// plain (already written) text
function mText(segs, x, y, size, o = {}) { return writeText(segs, x, y, size, (o.alpha ?? 1) > 0 ? 1 : 0, o); }

// ---- typesetting: a tiny TeX. A formula is a list of tokens:
//   '+', '=', '−', '<', '×', '·' ...          operators (upright, spaced like TeX's binary / relation spacing)
//   mv('a', MC.red, { sup: '2', id: 'a' })    an italic variable  (mn(...) is the upright version: digits, cos, sin)
//   { frac: [numTokens, denTokens], c, id }   a fraction with a bar
//   { sp: 0.3 }                               extra space, in ems
// Every token has an id (default: its text + the occurrence); transformTex matches tokens by id.
const mv = (s, c = MC.white, o = {}) => ({ s, c, it: true, ...o });
const mn = (s, c = MC.white, o = {}) => ({ s, c, it: false, ...o });
const OPS = '+=−-<>×·≈∝≤≥';
function texLayout(toks, size) {
  const items = [], seen = {}; let x = 0, top = -size * 0.75, bot = size * 0.25;
  const add = (ch, gx, gy, gs, c, it, id) => { ctx.font = fontM(gs, { it }); const w = ctx.measureText(ch).width; items.push({ ch, x: gx, y: gy, size: gs, c, it, id, w }); return w; };
  ctx.save();
  for (let t of toks) {
    if (typeof t === 'string') t = { s: t, it: false, op: OPS.includes(t) };
    if (t.sp != null) { x += t.sp * size; continue; }
    const base = t.frac ? 'frac' : t.s, id = t.id ?? (base + '#' + (seen[base] = (seen[base] ?? -1) + 1));
    const c = t.c || MC.white;
    if (t.frac) {
      const fs = size * 0.8, num = texLayout(t.frac[0], fs), den = texLayout(t.frac[1], fs), bw = Math.max(num.w, den.w) + size * 0.24, axis = -size * 0.27;
      x += size * 0.08;
      for (const g of num.items) items.push({ ...g, x: x + (bw - num.w) / 2 + g.x, y: axis - size * 0.2 + g.y, id });
      items.push({ bar: true, x, x1: x + bw, y: axis, c, id, w: bw, size });
      for (const g of den.items) items.push({ ...g, x: x + (bw - den.w) / 2 + g.x, y: axis + size * 0.2 + fs * 0.72 + g.y, id });
      top = Math.min(top, axis - size * 0.2 + num.top); bot = Math.max(bot, axis + size * 0.2 + fs * 0.72 + den.bot);
      x += bw + size * 0.08; continue;
    }
    const pad = t.op ? size * 0.22 : 0;
    x += pad;
    x += add(t.s, x, 0, size, c, t.it, id) + (t.it ? size * 0.04 : 0);
    let adv = 0;   // a superscript and a subscript stack on the same spot
    if (t.sup) { adv = Math.max(adv, add(t.sup, x, -size * 0.42, size * 0.6, t.supC || c, false, id)); top = Math.min(top, -size * 1.05); }
    if (t.sub) { adv = Math.max(adv, add(t.sub, x, size * 0.2, size * 0.6, t.subC || c, false, id)); bot = Math.max(bot, size * 0.4); }
    x += (adv ? adv + size * 0.03 : 0) + pad;
  }
  ctx.restore();
  return { items, w: x, top, bot };
}
// Write a formula at (x, y) (baseline; centred unless o.align). Returns the layout in screen-space (items carry absolute x, y).
function writeTex(toks, x, y, size, p, o = {}) {
  const L = texLayout(toks, size), x0 = o.align === 'left' ? x : o.align === 'right' ? x - L.w : x - L.w / 2;
  const alpha = o.alpha ?? 1, lag = o.lag ?? 1.2, n = L.items.length;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  L.items.forEach((g, i) => {
    const pi = clamp(p * (1 + lag) - (lag * i) / Math.max(1, n - 1));
    if (g.bar) { const u = smoothM(pi * 1.6); if (u > 0 && alpha > 0) { ctx.globalAlpha = alpha; ctx.strokeStyle = g.c; ctx.lineWidth = Math.max(2, g.size * 0.045); ctx.beginPath(); ctx.moveTo(x0 + g.x, y + g.y); ctx.lineTo(x0 + lerp(g.x, g.x1, u), y + g.y); ctx.stroke(); } }
    else { ctx.font = fontM(g.size, { it: g.it }); writeGlyph(g.ch, x0 + g.x, y + g.y, g.size, g.c, pi, alpha * (o.dim?.[g.id] ?? 1)); }
  });
  ctx.restore();
  return { ...L, x0, y, items: L.items.map((g) => ({ ...g, x: x0 + g.x, y: y + g.y })) };
}
// the screen box of the tokens with id `id` in a layout from writeTex (for braces, flashes, arrows to a term)
function texBox(lay, id) {
  const its = lay.items.filter((g) => g.id === id); if (!its.length) return null;
  const x0 = Math.min(...its.map((g) => g.x)), x1 = Math.max(...its.map((g) => g.x + g.w));
  const y0 = Math.min(...its.map((g) => g.y - (g.bar ? 2 : g.size * 0.72))), y1 = Math.max(...its.map((g) => g.y + (g.bar ? 2 : g.size * 0.22)));
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
// Transform one formula into another (manim TransformMatchingTex): tokens with the same id glide from their place in A
// to their place in B (colour and size blend); a group whose text differs cross-fades while it moves; the rest fade.
function transformTex(A, B, x, y, size, u, o = {}) {
  const LA = texLayout(A, size), LB = texLayout(B, size), alpha = o.alpha ?? 1;
  const xa = o.align === 'left' ? x : x - LA.w / 2, xb = o.align === 'left' ? x : x - LB.w / 2, s = smoothM(u);
  const groups = (L) => { const m = {}; for (const g of L.items) (m[g.id] = m[g.id] || []).push(g); return m; };
  const GA = groups(LA), GB = groups(LB);
  const ctr = (gs, x0) => { const b = bbox(gs.map((g) => [x0 + g.x + (g.w || 0) / 2, y + g.y])); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; };
  const text = (gs) => gs.map((g) => (g.bar ? '/' : g.ch)).join('');
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineCap = 'round';
  const draw = (g, dx, dy, c, a) => {
    if (a <= 0.003) return;
    ctx.globalAlpha = a * alpha;
    if (g.bar) { ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, g.size * 0.045); ctx.beginPath(); ctx.moveTo(g.x + dx, g.y + dy); ctx.lineTo(g.x1 + dx, g.y + dy); ctx.stroke(); }
    else { ctx.font = fontM(g.size, { it: g.it }); ctx.fillStyle = c; ctx.fillText(g.ch, g.x + dx, g.y + dy); }
  };
  for (const id of new Set([...Object.keys(GA), ...Object.keys(GB)])) {
    const a = GA[id], b = GB[id];
    if (a && b) {
      const ca = ctr(a, xa), cb = ctr(b, xb);
      if (text(a) === text(b)) a.forEach((g, i) => draw(g, lerp(xa, xb + b[i].x - g.x, s), y + lerp(0, b[i].y - g.y, s), mixHex(g.c, b[i].c, s), 1));
      else {
        a.forEach((g) => draw(g, xa + (cb[0] - ca[0]) * s, y + (cb[1] - ca[1]) * s, g.c, 1 - clamp(s * 1.6)));
        b.forEach((g) => draw(g, xb + (ca[0] - cb[0]) * (1 - s), y + (ca[1] - cb[1]) * (1 - s), g.c, clamp(s * 1.6 - 0.6)));
      }
    } else if (a) a.forEach((g) => draw(g, xa, y, g.c, 1 - clamp(s * 2)));
    else b.forEach((g) => draw(g, xb, y, g.c, clamp(s * 2 - 1)));
  }
  ctx.restore();
}

// ---- strokes and marks (screen or world coords: whatever ctx's transform is)
// a line segment drawn on from (x1, y1): p 0..1
function segLine(x1, y1, x2, y2, c, w = 4, p = 1, al = 1) {
  if (p <= 0 || al <= 0) return;
  ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); ctx.stroke(); ctx.restore();
}
// ShowCreation of any outline: the stroke sweeps along P; with o.fill the fill then fades up (manim DrawBorderThenFill).
// o: c, w, closed, fill (final fill alpha), fillC, al, dash
function showCreation(P, p, o = {}) {
  if (p <= 0 || P.length < 2) return;
  const c = o.c || MC.white, al = o.al ?? 1, closed = !!o.closed;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.fill && p > 0.5) { ctx.globalAlpha = al * o.fill * smoothM((p - 0.5) * 2); ctx.fillStyle = o.fillC || c; ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  const Q = subPath(closed ? [...P, P[0]] : P, clamp(o.fill ? p * 2 : p));
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = o.w ?? 4;
  ctx.beginPath(); Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.restore();
}
// a square standing on the segment (x1, y1) -> (x2, y2), on its left (side = -1: its right)
function squareOn(x1, y1, x2, y2, side = 1) { const dx = x2 - x1, dy = y2 - y1, nx = dy * side, ny = -dx * side; return [[x1, y1], [x2, y2], [x2 + nx, y2 + ny], [x1 + nx, y1 + ny]]; }
// the n x n unit cells inside a quad from squareOn, as thin lines (the counting proof's cells)
function cellGrid(Q, n, c, al = 0.5, w = 1.5) {
  if (al <= 0) return;
  ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const k = i / n;
    ctx.moveTo(lerp(Q[0][0], Q[1][0], k), lerp(Q[0][1], Q[1][1], k)); ctx.lineTo(lerp(Q[3][0], Q[2][0], k), lerp(Q[3][1], Q[2][1], k));
    ctx.moveTo(lerp(Q[0][0], Q[3][0], k), lerp(Q[0][1], Q[3][1], k)); ctx.lineTo(lerp(Q[1][0], Q[2][0], k), lerp(Q[1][1], Q[2][1], k));
  }
  ctx.stroke(); ctx.restore();
}
function mDot(x, y, r, c, al = 1) { if (al <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }
function glowAt(x, y, r, c, a) {
  if (a <= 0 || r <= 0) return;
  ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgbaM(c, a)); g.addColorStop(1, rgbaM(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
// an arrow drawn on: the shaft grows and the tip rides its end
function mArrow(x1, y1, x2, y2, c, w = 4, p = 1, al = 1) {
  if (p <= 0 || al <= 0) return;
  const a = Math.atan2(y2 - y1, x2 - x1), hs = 10 + w * 2.4, xe = lerp(x1, x2, p), ye = lerp(y1, y2, p);
  segLine(x1, y1, xe - Math.cos(a) * hs * 0.6, ye - Math.sin(a) * hs * 0.6, c, w, 1, al);
  ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(xe, ye);
  ctx.lineTo(xe - hs * Math.cos(a - 0.42), ye - hs * Math.sin(a - 0.42)); ctx.lineTo(xe - hs * Math.cos(a + 0.42), ye - hs * Math.sin(a + 0.42));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// a curly brace beside the segment (x1, y1) -> (x2, y2), bulging to its left (o.side = -1: its right), growing from the middle.
// o: c, w, h (depth), p, al, label (tokens), size, lp (label Write progress). Returns the tip point.
function mBrace(x1, y1, x2, y2, o = {}) {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), side = o.side ?? 1, h = o.h ?? 22, p = smoothM(o.p ?? 1), al = o.al ?? 1;
  const nx = Math.sin(a) * side, ny = -Math.cos(a) * side, tip = [(x1 + x2) / 2 + nx * h * 1.15, (y1 + y2) / 2 + ny * h * 1.15];
  if (p <= 0 || al <= 0) return tip;
  ctx.save(); ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); ctx.rotate(a); ctx.scale(p, side);
  ctx.globalAlpha = al; ctx.strokeStyle = o.c || MC.white; ctx.lineWidth = o.w ?? 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const m = L / 2;
  ctx.beginPath(); ctx.moveTo(-m, 0); ctx.quadraticCurveTo(-m, -h / 2, -m + 14, -h / 2); ctx.lineTo(-12, -h / 2); ctx.quadraticCurveTo(-2, -h / 2, 0, -h);
  ctx.quadraticCurveTo(2, -h / 2, 12, -h / 2); ctx.lineTo(m - 14, -h / 2); ctx.quadraticCurveTo(m, -h / 2, m, 0); ctx.stroke();
  ctx.restore();
  if (o.label) { const sz = o.size ?? 44; writeTex(o.label, tip[0] + nx * sz * 0.75, tip[1] + ny * sz * 0.75 + sz * 0.3, sz, o.lp ?? 1, { alpha: al }); }
  return tip;
}
// the little square that marks a right angle at corner (x, y) between unit directions d1 and d2
function rightAngle(x, y, d1, d2, s, c = MC.white, al = 1) {
  if (al <= 0) return;
  ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(x + d1[0] * s, y + d1[1] * s); ctx.lineTo(x + (d1[0] + d2[0]) * s, y + (d1[1] + d2[1]) * s); ctx.lineTo(x + d2[0] * s, y + d2[1] * s); ctx.stroke(); ctx.restore();
}
// an angle arc at (x, y) from screen angle a0 to a1, drawn on with p
function angleArc(x, y, r, a0, a1, c, p = 1, w = 4) { if (p > 0) showCreation(arcPts(x, y, r, a0, lerp(a0, a1, p), 28), 1, { c, w }); }
// manim Flash: 12 short lines burst outward and vanish. u: 0..1 over its run time (~0.4s)
function flashAt(x, y, u, c = MC.yellowP, r = 34, w = 4) {
  if (u <= 0 || u >= 1) return;
  const r0 = r + r * 1.3 * smoothM(u), r1 = r + r * 2.5 * smoothM(u * 1.4);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; segLine(x + r0 * Math.cos(a), y + r0 * Math.sin(a), x + r1 * Math.cos(a), y + r1 * Math.sin(a), c, w, 1, 1 - u); }
}
// manim Indicate: a there-and-back scale for a term (apply around its centre)
const indicateS = (u, k = 0.2) => 1 + k * thereBack(clamp(u));
// a straight-edged closed path (core's trace() rounds corners; squares and triangles want them sharp)
function polyPath(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

// ---- axes, planes, graphs
// axes2(o) draws a pair of axes and returns the mapper. o: at [ox, oy] (screen origin), u (px per unit) or ux / uy,
//   x [min, max], y [min, max], ext (how far the axes run past the range, in units), p (ShowCreation progress), c, w,
//   step (tick spacing), tick (half-length px), labels (font size or 0), dp (label decimals), tips, al
function axes2(o) {
  const [ox, oy] = o.at, ux = o.ux ?? o.u ?? 100, uy = o.uy ?? o.u ?? 100, [x0, x1] = o.x ?? [-1, 1], [y0, y1] = o.y ?? [-1, 1];
  const A = { ox, oy, ux, uy, x: [x0, x1], y: [y0, y1], to: (x, y) => [ox + x * ux, oy - y * uy] };
  const p = o.p ?? 1, al = o.al ?? 1, c = o.c || MC.grey, w = o.w ?? 3, step = o.step ?? 1, ext = o.ext ?? 0.25;
  if (p <= 0 || al <= 0) return A;
  const ex = lagged(p, 0, 2, 0.4), ey = lagged(p, 1, 2, 0.4);
  const [ax0, ay] = A.to(x0 - ext, 0), [ax1] = A.to(x1 + ext, 0), [axx, ay0] = A.to(0, y0 - ext), [, ay1] = A.to(0, y1 + ext);
  segLine(ax0, ay, ax1, ay, c, w, smoothM(ex), al); segLine(axx, ay0, axx, ay1, c, w, smoothM(ey), al);
  if (o.tips !== false) { if (ex > 0.98) mArrow(ax1 - 1, ay, ax1 + 14, ay, c, w, 1, al); if (ey > 0.98) mArrow(axx, ay1 + 1, axx, ay1 - 14, c, w, 1, al); }
  const ta = al * smoothM((p - 0.5) * 2); if (ta <= 0) return A;
  const tk = o.tick ?? 10, lab = o.labels ?? 0;
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) if (Math.abs(v) > 1e-9) { const [x, y] = A.to(v, 0); segLine(x, y - tk, x, y + tk, c, 2.5, 1, ta); if (lab) mText(fmtNum(v, o.dp ?? 0), x, y + tk + lab * 1.05, lab, { color: c, alpha: ta }); }
  for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) if (Math.abs(v) > 1e-9) { const [x, y] = A.to(0, v); segLine(x - tk, y, x + tk, y, c, 2.5, 1, ta); if (lab) mText(fmtNum(v, o.dp ?? 0), x - tk - lab * 0.35, y + lab * 0.35, lab, { color: c, alpha: ta, align: 'right' }); }
  return A;
}
// manim NumberPlane: faint BLUE_D lines on every unit, fainter ones between; p sweeps them in from the centre out
function numberPlane(A, o = {}) {
  const p = o.p ?? 1, al = o.al ?? 1, step = o.step ?? 1, sub = o.sub ?? 2; if (p <= 0 || al <= 0) return;
  const [x0, x1] = o.x ?? A.x, [y0, y1] = o.y ?? A.y;
  for (let k = 0; k <= sub * Math.ceil(Math.max(x1 - x0, y1 - y0) / step); k++) {
    const v = k * step / sub, major = k % sub === 0, a = al * (major ? 0.42 : 0.14) * smoothM(p * 2 - k / (sub * 8)), w = major ? 2 : 1.2;
    if (a <= 0) continue;
    for (const s of [1, -1]) {
      const vv = v * s; if (s < 0 && k === 0) continue;
      if (vv >= x0 && vv <= x1) { const [x, ya] = A.to(vv, y0), [, yb] = A.to(vv, y1); segLine(x, ya, x, yb, MC.blueD, w, 1, a); }
      if (vv >= y0 && vv <= y1) { const [xa, y] = A.to(x0, vv), [xb] = A.to(x1, vv); segLine(xa, y, xb, y, MC.blueD, w, 1, a); }
    }
  }
}
// graph of f over [x0, x1] on axes A, drawn on with p. o: c, w, n (samples), area (alpha of the fill down to y = 0), al
function graphM(A, f, x0, x1, p = 1, o = {}) {
  const n = o.n ?? 160, P = [];
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = f(x); if (Number.isFinite(y)) P.push(A.to(x, y)); }
  if (o.area && p > 0) {
    const m = Math.max(1, Math.round(P.length * clamp(p))), Q = P.slice(0, m);
    ctx.save(); ctx.globalAlpha = (o.al ?? 1) * o.area; ctx.fillStyle = o.c || MC.blue; ctx.beginPath(); ctx.moveTo(Q[0][0], A.oy);
    Q.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(Q[Q.length - 1][0], A.oy); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  showCreation(P, p, { c: o.c || MC.blue, w: o.w ?? 5, al: o.al ?? 1 });
  return P;
}

// ---- the tracking dot and its live readout (manim Dot + DecimalNumber with an updater)
function trackDot(x, y, c = MC.yellow, o = {}) { const al = o.al ?? 1, r = o.r ?? 12; glowAt(x, y, r * 3, c, 0.45 * al); mDot(x, y, r, c, al); }
// writes  <label> = <value>  with the number in colour; the number re-typesets every frame (a pure function of TT)
function readout(label, v, d, x, y, size, o = {}) {
  const toks = [...(typeof label === 'string' ? [mv(label, o.lc || MC.white)] : label), '=', mn(fmtNum(v, d), o.c || MC.yellow, { id: 'value' })];
  return writeTex(toks, x, y, size, o.p ?? 1, { align: o.align ?? 'left', alpha: o.al ?? 1 });
}
// a dashed drop line from a point to the x-axis (and/or y-axis) of axes A
function dropLines(A, x, y, o = {}) {
  const [px, py] = A.to(x, y), [, oy] = A.to(x, 0), [ox] = A.to(0, y), al = o.al ?? 0.8;
  ctx.save(); ctx.setLineDash([8, 8]);
  if (o.x !== false) segLine(px, py, px, oy, o.c || MC.grey, 2.5, 1, al);
  if (o.y) segLine(px, py, ox, py, o.c || MC.grey, 2.5, 1, al);
  ctx.restore();
}

// ---- the hero: a pi-shaped creature with two eyes (body = the letter pi). (x, y) = between its feet; s = 1 is ~150px tall.
// o: look [x, y] (a point it looks at, same coords), mood 'calm' | 'wow' | 'happy', hop (0..1 there-and-back), color, key, al
function piHero(x, y, s = 1, o = {}) {
  const al = o.al ?? 1; if (al <= 0 || s <= 0) return;
  const key = o.key ?? 'pi', mood = o.mood ?? 'calm', body = o.color || MC.pi, edge = o.edge || MC.piD;
  y -= 34 * s * thereBack(clamp(o.hop ?? 0));
  SPARK_AT = toScreen(x, y - 75 * s);
  const ph = (F + (hash('blink', key) % 47)) % 66, blink = ph < 5 ? thereBack(ph / 5) : 0;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  // legs: the left one curls outward, the right one kicks
  ctx.beginPath(); ctx.moveTo(-46, -96); ctx.lineTo(-14, -96); ctx.quadraticCurveTo(-12, -40, -24, -8); ctx.quadraticCurveTo(-36, 6, -58, -2); ctx.quadraticCurveTo(-42, -40, -46, -96); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -96); ctx.lineTo(42, -96); ctx.quadraticCurveTo(36, -40, 52, -12); ctx.quadraticCurveTo(58, 4, 32, 0); ctx.quadraticCurveTo(10, -30, 12, -96); ctx.fill(); ctx.stroke();
  // the bar
  ctx.beginPath(); ctx.moveTo(-66, -98); ctx.quadraticCurveTo(-68, -124, -44, -124); ctx.lineTo(52, -126); ctx.quadraticCurveTo(72, -126, 68, -108);
  ctx.quadraticCurveTo(64, -94, 48, -95); ctx.lineTo(-50, -92); ctx.quadraticCurveTo(-64, -90, -66, -98); ctx.fill(); ctx.stroke();
  // eyes sit on the bar; pupils look at o.look
  const er = mood === 'wow' ? 18 : 15, ey = -136 - (er - 15);
  let lx = 0, ly = 0;
  if (o.look) { const [sx, sy] = toScreen(x, y - 136 * s), [tx, ty] = toScreen(o.look[0], o.look[1]), d = Math.hypot(tx - sx, ty - sy) || 1; lx = (tx - sx) / d; ly = (ty - sy) / d; }
  for (const ex of [-14, 18]) {
    ctx.fillStyle = MC.white; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (1 - blink * 0.92), 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (blink < 0.5) {
      const pr = mood === 'wow' ? 6.5 : 7.5, px = ex + lx * (er - pr - 2), py = ey + ly * (er - pr - 2);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      ctx.fillStyle = MC.white; ctx.beginPath(); ctx.arc(px + 2.4, py - 2.4, 2.2, 0, TAU); ctx.fill();
    }
  }
  // mouth, on the bar
  ctx.strokeStyle = '#0b2430'; ctx.fillStyle = '#0b2430'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(4, -107, 6.5, 8, 0, 0, TAU); ctx.fill(); }
  else { const k = mood === 'happy' ? 7 : 3.5; ctx.beginPath(); ctx.moveTo(-8, -110); ctx.quadraticCurveTo(4, -110 + k * 1.6, 16, -110); ctx.stroke(); }
  ctx.restore();
}

// ---- captions and tags: drawn after the camera, at screen size (DEFER)
// a caption: a manim BackgroundRectangle (black, 75%) behind serif text that is Written on. segs: string or [{ s, c, it }]
function mathCard(segs, x, y, size, p, o = {}) {
  if (p <= 0) return;
  const str = typeof segs === 'string' ? segs : segs.map((s) => s.s).join(''), w = textW(str, size) + size * 0.9, h = size * 1.5;
  ctx.save(); ctx.globalAlpha = 0.75 * smoothM(p * 3); ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, y - h * 0.62, w, h); ctx.restore();
  writeText(segs, x, y + size * 0.05, size, p, { color: o.color || MC.white, lag: 1.0 });
}
const mathCaption = (segs) => { const f = () => mathCard(segs, CX, 1440, 50, runS(E0 + 0.45, 0.9)); if (DEFER) DEFER.push(f); else f(); };
// a small grey section tag, top left, with an underline that draws on
const mathTag = (str) => {
  const f = () => { const p = runS(E0 + 0.15, 0.7), w = textW(str, 40, { it: true }); writeText(str, 70, 300, 40, p, { align: 'left', it: true, color: MC.grey }); segLine(70, 318, 70 + w, 318, MC.greyD, 2.5, smoothM(p * 1.3 - 0.3)); };
  if (DEFER) DEFER.push(f); else f();
};

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
//    window: the old / new world seen through the bridge outline, rimmed in the bridge shape's own colour
//    blob:   the morphing shape as manim draws a Transform: a coloured stroke over a translucent fill
// =====================================================================
function rimOf(key) {   // the colour of the bridge shape a window key ('mA3' / 'mB3') belongs to
  const m = /^m([AB])(.+)$/.exec(key), br = m && typeof BRIDGES !== 'undefined' && BRIDGES.find((b) => String(b.tc) === m[2]);
  if (!br) return MC.white;
  const s = br[m[1]](); return s.spark ? STYLE.heroColor : s.c || MC.white;
}
const STYLE = {
  name: 'math',
  paper: MC.bg,
  ones: true,
  backdrop(c) { fillAll(c); },
  window(P, key, src) {
    ctx.save(); polyPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); polyPath(P); ctx.strokeStyle = rimOf(key); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  },
  blob(P, c, key) {
    ctx.save(); polyPath(P); ctx.globalAlpha = 0.32; ctx.fillStyle = c; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  },
  hero(x, y, r, o = {}) { piHero(x, y + r * 0.68, r / 110, { mood: o.mood, key: o.key }); },
  heroColor: MC.pi,
  heroPts: (x, y, r, n) => ellipsePts(x, y, r * 0.62, r * 0.7, 0, 96),
};
