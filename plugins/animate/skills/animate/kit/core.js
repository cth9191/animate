// =====================================================================
//  kit/core.js — seeded RNG, math, easing, palette, geometry, the hand-drawn drawing kit
//  (wobble on the boil, ink, paint, hatch, pencil, stipple, grain), cameras, mono text.
//  Needs from the piece head: FPS, W, H. Render state: ctx, F (frame), B (boil = floor(F/2)).
// =====================================================================

// ---------------------------------------------------------------------
//  seeded RNG
// ---------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(...xs) {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    const s = String(x);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= 124; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function RNG(...xs) {
  const f = mulberry32(hash(...xs));
  return {
    f,
    r: (a, b) => a + (b - a) * f(),
    n: (amt) => (f() * 2 - 1) * amt,
    i: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(f() * arr.length)],
  };
}

// ---------------------------------------------------------------------
//  math
// ---------------------------------------------------------------------
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
// has absolute time t reached cut time c? (cuts snap to the nearest frame, like shot boundaries)
const past = (t, c) => Math.round(t * FPS + 1e-6) >= Math.round(c * FPS);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const EZ = {
  o2: (t) => 1 - (1 - clamp(t)) ** 2,
  o3: (t) => 1 - (1 - clamp(t)) ** 3,
  i2: (t) => clamp(t) ** 2,
  i3: (t) => clamp(t) ** 3,
  io: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; },
  back: (t) => { t = clamp(t) - 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; },
};

// ---------------------------------------------------------------------
//  render state
// ---------------------------------------------------------------------
let ctx = null;   // current 2d context
let F = 0;        // absolute frame index
let B = 0;        // boil index — reseeds every 2 frames (Math.floor(t*12))

const C = {
  ink: '#3a2417', cream: '#efe5cf', paper: '#f4ecd9', paperLine: 'rgba(90,130,190,0.32)',
  orange: '#e58a4e', orangeD: '#c3622e', orangeL: '#f4b27c', terra: '#d97757',
  rose: '#d98b8b', roseD: '#b0616a', roseL: '#efb9b0',
  wood: '#d6a466', woodD: '#a8773f', woodL: '#e9c48f',
  sky: '#9cc4d6', skyD: '#6f9fb8', skyL: '#c9e1ea',
  teal: '#3d9f96', tealL: '#86c9be',
  yellow: '#f0c55a', yellowL: '#f7dd92',
  green: '#5f9c5c', greenL: '#a3cf92',
  red: '#d4382c', redL: '#ea7a6c',
  skin: '#ebb68f', skinD: '#c7815d', skinL: '#f7d4b4',
  lav: 'rgba(104,112,214,0.7)', lavS: 'rgba(104,112,214,0.42)',
  navy: '#0c0d1c', navy2: '#15173a', peri: '#c8d0f0', periD: '#7c86c4', periS: 'rgba(150,164,230,0.20)',
  cyan: '#52d6c4', mag: '#e0368f', glow: '#5de37a', white: '#f4f6ff',
};
const RAINBOW = ['#f0d042', '#e050b8', '#46cde0', '#7ad866', '#a47ef0'];
const MONO = 'Consolas, "Cascadia Mono", Menlo, "DejaVu Sans Mono", "Courier New", monospace';   // Windows first, then macOS / Linux

// ---------------------------------------------------------------------
//  geometry
// ---------------------------------------------------------------------
function ellipsePts(cx, cy, rx, ry, rot = 0, n = 64, a0 = 0, a1 = TAU) {
  const P = [], c = Math.cos(rot), s = Math.sin(rot), full = Math.abs(a1 - a0 - TAU) < 1e-6;
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * i / (full ? n : n - 1);
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    P.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return P;
}
function rrectPts(x, y, w, h, r, n = 6) {
  r = Math.min(r, w / 2, h / 2);
  const P = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return P;
}
function arcPts(cx, cy, r, a0, a1, n = 18, sy = 1) {
  const P = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]); }
  return P;
}
function xform(P, tx, ty, rot = 0, sx = 1, sy = sx) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return P.map(([x, y]) => [tx + x * sx * c - y * sy * s, ty + x * sx * s + y * sy * c]);
}
function bbox(P, pad = 0) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
function resample(P, closed, step) {
  const out = [], n = P.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = P[i], b = P[(i + 1) % n], k = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  if (!closed) out.push(P[n - 1]);
  return out;
}
function pathLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]); return L; }
function subPath(P, frac) {
  let want = pathLen(P) * clamp(frac);
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const d = dist(P[i - 1], P[i]);
    if (want >= d) { out.push(P[i]); want -= d; }
    else { const k = want / (d || 1); out.push([lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)]); break; }
  }
  return out;
}
function pointAt(P, frac) { const S = subPath(P, frac); return S[S.length - 1]; }

// ---------------------------------------------------------------------
//  drawing kit — boil, sketchy lines, hatching, stipple, pencil, grain
// ---------------------------------------------------------------------
// smooth hand wobble along the normal; reseeded every boil step
function wobble(P, closed, amt, key, step = 7) {
  const Q = resample(P, closed, step), n = Q.length;
  const R = RNG('wob', key, B);
  const f1 = R.r(0.012, 0.03), f2 = R.r(0.05, 0.1), p1 = R.r(0, TAU), p2 = R.r(0, TAU);
  const sx = R.n(amt * 0.5), sy = R.n(amt * 0.5);
  const out = new Array(n); let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const o = amt * (0.75 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + nx / l * o + sx, Q[i][1] + ny / l * o + sy];
  }
  return out;
}
function trace(P, closed) {
  ctx.beginPath();
  const n = P.length; if (n < 2) return;
  if (closed) {
    ctx.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  } else {
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n - 1; i++) { const p = P[i], q = P[i + 1]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.lineTo(P[n - 1][0], P[n - 1][1]);
  }
}
// sketchy stroke. o: closed, color, w, amt, key, alpha, frac (write-on), double
function ink(P, o = {}) {
  const closed = !!o.closed, key = o.key ?? 'ink';
  let Q = o.raw ? P : wobble(P, closed, o.amt ?? 1.8, key);
  let cl = closed;
  if (o.frac != null && o.frac < 1) { if (o.frac <= 0) return Q; Q = subPath(closed ? [...Q, Q[0]] : Q, o.frac); cl = false; }
  ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.w ?? 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = o.alpha ?? 1;
  trace(Q, cl); ctx.stroke();
  if (o.double) {
    let Q2 = wobble(P, closed, (o.amt ?? 1.8) * 1.6 + 0.8, key + '~');
    if (!cl && closed) Q2 = subPath([...Q2, Q2[0]], o.frac ?? 1);
    ctx.lineWidth = (o.w ?? 3) * 0.4; ctx.globalAlpha = (o.alpha ?? 1) * 0.55; trace(Q2, cl); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return Q;
}
// filled shape + textures (clipped) + ink outline
function paint(P, o = {}) {
  const key = o.key || 'paint';
  const Q = o.raw ? P : wobble(P, true, o.amt ?? 1.6, key);
  ctx.save();
  trace(Q, true);
  if (o.fill) { ctx.globalAlpha = o.fillAl ?? 1; ctx.fillStyle = o.fill; ctx.fill(); ctx.globalAlpha = 1; }
  if (o.tex) { ctx.clip(); const bb = bbox(Q, 6); o.tex.forEach((t, i) => texture(bb, { key: key + ':' + i, ...t })); }
  ctx.restore();
  if (o.line !== false) {
    ctx.strokeStyle = o.line || C.ink; ctx.lineWidth = o.w ?? 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = o.lineAl ?? 1; trace(Q, true); ctx.stroke(); ctx.globalAlpha = 1;
  }
  return Q;
}
function texture(bb, t) {
  if (t.k === 'hatch') hatch(bb, t);
  else if (t.k === 'cross') { hatch(bb, t); hatch(bb, { ...t, a: (t.a ?? 0.7) + (t.a2 ?? 1.25), key: t.key + 'x' }); }
  else if (t.k === 'pencil') pencil(bb, t);
  else if (t.k === 'stipple') stipple(bb, t);
  else if (t.k === 'fn') t.fn(bb);
}
// parallel hatching inside current clip. t: a angle, gap, c, w, al, dash [min,max], skip, dens(x,y)
function hatch(bb, t) {
  const a = t.a ?? 0.7, gap = t.gap ?? 7, S = RNG('hs', t.key), R = RNG('hj', t.key, B);
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 4;
  const ca = Math.cos(a), sa = Math.sin(a), dens = t.dens, jit = t.jit ?? 0.9, dash = t.dash;
  ctx.beginPath();
  for (let d = -rad; d <= rad; d += gap) {
    const dd = d + S.n(gap * 0.3);
    let u = -rad + (dash ? S.r(0, dash[1]) : 0);
    while (u < rad) {
      const len = dash ? S.r(dash[0], dash[1]) : rad * 2, u2 = Math.min(rad, u + len);
      const mu = (u + u2) / 2, mx = cx + ca * mu - sa * dd, my = cy + sa * mu + ca * dd, p = S.f();
      if (!dens || p < dens(mx, my)) {
        const e1 = R.n(jit), e2 = R.n(jit);
        ctx.moveTo(cx + ca * u - sa * (dd + e1), cy + sa * u + ca * (dd + e1));
        ctx.lineTo(cx + ca * u2 - sa * (dd + e2), cy + sa * u2 + ca * (dd + e2));
      }
      u = u2 + (dash ? S.r(t.skip?.[0] ?? 3, t.skip?.[1] ?? 12) : 0);
    }
  }
  ctx.strokeStyle = t.c || C.ink; ctx.lineWidth = t.w ?? 1.2; ctx.globalAlpha = t.al ?? 0.5; ctx.lineCap = 'round';
  ctx.stroke(); ctx.globalAlpha = 1;
}
// colored-pencil diagonal strokes
function pencil(bb, t) {
  const S = RNG('ps', t.key), R = RNG('pj', t.key, B);
  const area = (bb.x1 - bb.x0) * (bb.y1 - bb.y0);
  const n = Math.min(t.max ?? 6000, t.n ?? Math.floor(area / (t.per ?? 700)));
  const a = t.a ?? -0.95, L = t.len ?? 14, dens = t.dens;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = S.r(bb.x0, bb.x1), y = S.r(bb.y0, bb.y1), p = S.f(), aa = a + S.n(0.22), l = L * (0.5 + S.f() * 0.7);
    if (dens && p > dens(x, y)) continue;
    const jx = R.n(1.1), jy = R.n(1.1), dx = Math.cos(aa) * l / 2, dy = Math.sin(aa) * l / 2;
    ctx.moveTo(x - dx + jx, y - dy + jy); ctx.lineTo(x + dx + jx, y + dy + jy);
  }
  ctx.strokeStyle = t.c; ctx.lineWidth = t.w ?? 1.4; ctx.globalAlpha = t.al ?? 0.45; ctx.lineCap = 'round';
  ctx.stroke(); ctx.globalAlpha = 1;
}
// square stipple dots
function stipple(bb, t) {
  const S = RNG('ss', t.key), R = RNG('sj', t.key, B);
  const n = t.n ?? 400, sz = t.s ?? 2.2, dens = t.dens, jit = t.jit ?? 0.8;
  ctx.fillStyle = t.c; ctx.globalAlpha = t.al ?? 1; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = S.r(bb.x0, bb.x1), y = S.r(bb.y0, bb.y1), p = S.f(), s = sz * (0.6 + S.f() * 0.8);
    if (dens && p > dens(x, y)) continue;
    ctx.rect(x + R.n(jit), y + R.n(jit), s, s);
  }
  ctx.fill(); ctx.globalAlpha = 1;
}
// screen-space paper grain, reseeded with the boil
function grain(o = {}) {
  ctx.save(); screen();
  const R = RNG('grain', B), n = o.n ?? 2600;
  ctx.fillStyle = o.dark || 'rgba(70,45,25,0.13)'; ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(R.r(0, W), R.r(0, H), 1.7, 1.7);
  ctx.fill();
  ctx.fillStyle = o.light || 'rgba(255,250,236,0.20)'; ctx.beginPath();
  for (let i = 0; i < n; i++) ctx.rect(R.r(0, W), R.r(0, H), 1.9, 1.9);
  ctx.fill();
  // a few paper fibres
  ctx.strokeStyle = 'rgba(80,55,35,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 90; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(6, 22); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  construction lines, rulers, sparks, bursts, rainbow contours
// ---------------------------------------------------------------------
function construct(cx, cy, r, o = {}) {
  const R = RNG('con', o.key ?? 'c', B);
  ctx.save();
  ctx.strokeStyle = o.c || C.lav; ctx.lineWidth = o.w ?? 1.4; ctx.globalAlpha = o.al ?? 1; ctx.lineCap = 'round';
  const a0 = (o.a0 ?? R.r(0, TAU)), sw = o.sweep ?? 1.05;
  ctx.beginPath(); ctx.ellipse(cx + R.n(1.2), cy + R.n(1.2), r, r * (o.sq ?? 1), o.rot ?? 0, a0, a0 + TAU * sw); ctx.stroke();
  if (o.cross) { const k = o.cross; ctx.beginPath(); ctx.moveTo(cx - k, cy); ctx.lineTo(cx + k, cy); ctx.moveTo(cx, cy - k); ctx.lineTo(cx, cy + k); ctx.stroke(); }
  if (o.ticks) {
    ctx.beginPath();
    for (let i = 0; i < o.ticks; i++) { const a = i / o.ticks * TAU + (o.rot ?? 0); ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6)); }
    ctx.stroke();
  }
  ctx.restore();
}
function cline(x1, y1, x2, y2, o = {}) {
  const R = RNG('cl', o.key ?? 'l', B);
  ctx.save(); ctx.strokeStyle = o.c || C.lavS; ctx.lineWidth = o.w ?? 1.2; ctx.globalAlpha = o.al ?? 1;
  ctx.beginPath(); ctx.moveTo(x1 + R.n(1), y1 + R.n(1)); ctx.lineTo(x2 + R.n(1), y2 + R.n(1)); ctx.stroke(); ctx.restore();
}
function ruler(x1, y1, x2, y2, o = {}) {
  const R = RNG('rul', o.key ?? 'r', B);
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  const frac = clamp(o.frac ?? 1), step = o.step ?? 16, tk = o.tick ?? 7, side = o.side ?? 1;
  ctx.save(); ctx.strokeStyle = o.c || C.periD; ctx.lineWidth = o.w ?? 1.5; ctx.globalAlpha = o.al ?? 1; ctx.lineCap = 'round';
  const jx = R.n(0.8), jy = R.n(0.8);
  ctx.beginPath(); ctx.moveTo(x1 + jx, y1 + jy); ctx.lineTo(x1 + ux * L * frac + jx, y1 + uy * L * frac + jy);
  const n = Math.floor(L * frac / step);
  for (let i = 0; i <= n; i++) {
    const k = i % 5 === 0 ? tk * 1.9 : tk, px = x1 + ux * i * step + jx, py = y1 + uy * i * step + jy;
    ctx.moveTo(px, py); ctx.lineTo(px + nx * k * side, py + ny * k * side);
  }
  ctx.moveTo(x1 - nx * tk * 1.6, y1 - ny * tk * 1.6); ctx.lineTo(x1 + nx * tk * 2.2, y1 + ny * tk * 2.2);
  if (frac >= 1) { ctx.moveTo(x2 - nx * tk * 1.6, y2 - ny * tk * 1.6); ctx.lineTo(x2 + nx * tk * 2.2, y2 + ny * tk * 2.2); }
  ctx.stroke(); ctx.restore();
}
// glowing radial spark (dark world)
function sparkBurst(cx, cy, r, o = {}) {
  if (r <= 0.5) return;
  const R = RNG('spk', o.key ?? 's', B), n = o.n ?? 18, rays = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R.n(0.14); rays.push([a, r * R.r(0.28, 0.5), r * R.r(0.72, 1.15)]); }
  const path = () => { ctx.beginPath(); for (const [a, r0, r1] of rays) { ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } };
  ctx.save(); ctx.lineCap = 'round';
  path(); ctx.strokeStyle = o.glow || 'rgba(82,214,196,0.22)'; ctx.lineWidth = (o.w ?? 2.4) * 3.4; ctx.stroke();
  path(); ctx.strokeStyle = o.c || '#8ff5e6'; ctx.lineWidth = o.w ?? 2.4; ctx.stroke();
  if (o.core !== false) {
    const cr = Math.max(2.5, r * (o.coreR ?? 0.15));
    ctx.beginPath(); ctx.arc(cx, cy, cr * 2.2, 0, TAU); ctx.fillStyle = 'rgba(190,215,255,0.16)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.periD; ctx.stroke();
  }
  if (o.specks) { ctx.fillStyle = o.c || '#8ff5e6'; for (let i = 0; i < o.specks; i++) { const a = R.r(0, TAU), d = r * R.r(0.2, 1.4); ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 2); } }
  ctx.restore();
}
// radial tick burst (warm world impact)
function burst(cx, cy, r0, r1, o = {}) {
  const R = RNG('bur', o.key ?? 'b', B), n = o.n ?? 12;
  ctx.save(); ctx.strokeStyle = o.c || C.ink; ctx.lineWidth = o.w ?? 3; ctx.lineCap = 'round'; ctx.globalAlpha = o.al ?? 1; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R.n(0.15) + (o.rot ?? 0), a1 = r0 * R.r(0.85, 1.1), b1 = r1 * R.r(0.75, 1.15);
    ctx.moveTo(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1); ctx.lineTo(cx + Math.cos(a) * b1, cy + Math.sin(a) * b1);
  }
  ctx.stroke(); ctx.restore();
}
function star4(x, y, s, c) {
  ctx.save(); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); ctx.restore();
}
// rainbow contour strokes around a moving part
function rainbow(P, o = {}) {
  const bb = bbox(P), cx = o.cx ?? (bb.x0 + bb.x1) / 2, cy = o.cy ?? (bb.y0 + bb.y1) / 2, n = o.n ?? 3;
  for (let i = 0; i < n; i++) {
    const S = RNG('rb', o.key, i, B), sc = 1 + (o.spread ?? 0.07) * (i + 1) + S.n(0.02);
    const Q = P.map(([x, y]) => [cx + (x - cx) * sc + S.n(o.drift ?? 3), cy + (y - cy) * sc + S.n(o.drift ?? 3)]);
    ink(Q, { closed: o.closed ?? true, color: RAINBOW[(i + (o.off ?? 0)) % RAINBOW.length], w: o.w ?? 1.6, amt: o.amt ?? 3.5, key: o.key + 'rb' + i, alpha: o.al ?? 0.85 });
  }
}
// hex cell grid inside current clip
function hexGrid(bb, size, o = {}) {
  const h = size * Math.sqrt(3), R = RNG('hex', o.key ?? 'h', B);
  ctx.save(); ctx.strokeStyle = o.c || C.periS; ctx.lineWidth = o.w ?? 1.2; ctx.globalAlpha = o.al ?? 1; ctx.beginPath();
  let row = 0;
  for (let y = bb.y0 - h; y < bb.y1 + h; y += h * 0.5, row++) {
    for (let x = bb.x0 - size * 3 + (row % 2) * size * 1.5; x < bb.x1 + size * 3; x += size * 3) {
      const jx = R.n(0.6), jy = R.n(0.6);
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU, b = (k + 1) / 6 * TAU;
        if (k === 0) ctx.moveTo(x + Math.cos(a) * size + jx, y + Math.sin(a) * size + jy);
        ctx.lineTo(x + Math.cos(b) * size + jx, y + Math.sin(b) * size + jy);
      }
    }
  }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  iris, camera, text
// ---------------------------------------------------------------------
// ragged hatched rim; dir=+1 strokes reach outward, -1 inward
function irisRim(cx, cy, r, dir, o = {}) {
  const R = RNG('irisR', o.key ?? 'i', B), n = Math.min(1600, Math.floor(r * TAU / 2.0));
  ctx.strokeStyle = o.c || '#0b0c17'; ctx.lineWidth = o.w ?? 1.6; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = R.r(0, TAU), L = R.r(3, 11) + (R.f() < 0.28 ? R.r(10, 34) : 0), sl = R.n(0.4);
    const r0 = r - dir * R.r(2, 6), r1 = r + dir * L, ax = Math.cos(a), ay = Math.sin(a);
    ctx.moveTo(cx + ax * r0, cy + ay * r0); ctx.lineTo(cx + ax * r1 - ay * L * sl, cy + ay * r1 + ax * L * sl);
  }
  ctx.stroke();
}
// iris into a black hole (screen space)
function irisHole(cx, cy, r, o = {}) {
  if (r <= 0.5) return;
  ctx.save(); screen();
  const col = o.c || '#0b0c17';
  const P = wobble(ellipsePts(cx, cy, r, r, 0, 140), true, Math.min(4, 0.6 + r * 0.02), 'ih' + (o.key ?? ''), 9);
  trace(P, true); ctx.fillStyle = col; ctx.fill();
  irisRim(cx, cy, r, +1, { c: col, key: o.key });
  if (o.inner) { ctx.save(); trace(P, true); ctx.clip(); o.inner(r); ctx.restore(); }
  ctx.restore();
}
// world point (cx,cy) lands at screen centre
function camera(cx, cy, zoom = 1, rot = 0, sx = 0, sy = 0) {
  const c = Math.cos(rot) * zoom, s = Math.sin(rot) * zoom;
  ctx.setTransform(c, s, -s, c, W / 2 + sx - (c * cx - s * cy), H / 2 + sy - (s * cx + c * cy));
}
function screen() { ctx.setTransform(1, 0, 0, 1, 0, 0); }
function toScreen(x, y) { const p = ctx.getTransform().transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; }
function fillAll(color) { ctx.save(); screen(); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// monospace text with per-glyph hand jitter
function monoText(str, x, y, size, color, o = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${size}px ${MONO}`; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  const cw = ctx.measureText('M').width, R = RNG('txt', o.key ?? str, B), jit = o.jit ?? 0.9;
  const n = Math.min(o.count ?? str.length, str.length);
  ctx.globalAlpha = o.al ?? 1;
  for (let i = 0; i < n; i++) {
    const ch = str[i]; if (ch === ' ') continue;
    ctx.save(); ctx.translate(x + i * cw + R.n(jit), y + R.n(jit)); ctx.rotate(R.n(0.045)); ctx.fillText(ch, 0, 0); ctx.restore();
  }
  ctx.restore();
  return cw;
}
function monoW(size) { ctx.save(); ctx.font = `700 ${size}px ${MONO}`; const w = ctx.measureText('M').width; ctx.restore(); return w; }

// single-stroke hand lettering (x-height 0.5, ascender 1.0, baseline 0)
const GLYPHS = {
  ' ': { w: 0.26, s: [] },
  c: { w: 0.5, s: [arcPts(0.26, -0.25, 0.25, -35 * DEG, -322 * DEG, 22)] },
  o: { w: 0.52, s: [arcPts(0.26, -0.25, 0.25, -95 * DEG, -460 * DEG, 30)] },
  a: { w: 0.54, s: [[...arcPts(0.25, -0.25, 0.235, -28 * DEG, -335 * DEG, 24)], [[0.49, -0.5], [0.49, -0.05], [0.55, 0.0]]] },
  d: { w: 0.56, s: [[...arcPts(0.25, -0.25, 0.235, -28 * DEG, -335 * DEG, 24)], [[0.49, -1.0], [0.49, -0.05], [0.56, 0.0]]] },
  l: { w: 0.24, s: [[[0.08, -1.0], [0.08, -0.1], [0.12, -0.01], [0.2, 0.0]]] },
  u: { w: 0.54, s: [[[0.03, -0.5], [0.03, -0.22], ...arcPts(0.255, -0.22, 0.225, 180 * DEG, 0, 14), [0.48, -0.5]], [[0.48, -0.5], [0.48, -0.04], [0.54, 0.0]]] },
  e: { w: 0.52, s: [[[0.03, -0.26], [0.5, -0.26], ...arcPts(0.265, -0.25, 0.245, -4 * DEG, -318 * DEG, 26)]] },
};
function handwrite(str, x, y, size, o = {}) {
  const strokes = []; let pen = 0;
  for (const ch of str) {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (const s of g.s) strokes.push(s.map(([u, v]) => [x + (pen + u) * size, y + v * size]));
    pen += g.w + 0.1;
  }
  const lens = strokes.map(pathLen), total = lens.reduce((a, b) => a + b, 0);
  let budget = clamp(o.frac ?? 1) * total;
  for (let i = 0; i < strokes.length && budget > 0; i++) {
    const f = Math.min(1, budget / lens[i]); budget -= lens[i];
    if (o.glow) ink(strokes[i], { color: o.glow, w: (o.w ?? size * 0.06) * 3, amt: o.amt ?? 1.0, key: 'hw' + i + str, frac: f });
    ink(strokes[i], { color: o.c, w: o.w ?? size * 0.06, amt: o.amt ?? 1.0, key: 'hw' + i + str, frac: f });
  }
  return pen * size;
}

// =====================================================================
// ---- small props and helpers
function drawPencil(tx, ty, ang, len, k = 1, key = 'pencil') {
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang); ctx.scale(k, k);
  paint([[46, -16], [len, -16], [len, 16], [46, 16]], {
    fill: C.yellow, key: key + 'b', w: 3,
    tex: [{ k: 'hatch', a: 0.05, gap: 5, c: '#a8741d', al: 0.55, w: 1.1, dash: [20, 90], dens: (x, y) => (y > 5 ? 1 : 0.08) }, { k: 'pencil', c: '#fff1b8', al: 0.5, a: 0.05, len: 30, per: 120, dens: (x, y) => (y < -4 ? 1 : 0.1) }],
  });
  ink([[50, -5], [len, -5]], { w: 1.6, key: key + 'f1', alpha: 0.7 });
  ink([[50, 6], [len, 6]], { w: 1.6, key: key + 'f2', alpha: 0.7 });
  paint([[1, 0], [46, -15], [46, 15]], { fill: '#efcf9f', key: key + 'c', w: 2.6, tex: [{ k: 'hatch', a: 1.2, gap: 4, al: 0.35, dens: (x, y) => (y > 2 ? 1 : 0.1) }] });
  paint([[0, 0], [15, -5], [15, 5]], { fill: '#3b3438', key: key + 't', w: 2 });
  paint([[len, -17], [len + 26, -17], [len + 26, 17], [len, 17]], { fill: '#bcb7ab', key: key + 'fe', w: 2.6, tex: [{ k: 'hatch', a: Math.PI / 2, gap: 5, al: 0.5 }] });
  paint(rrectPts(len + 24, -16, 34, 32, 10), { fill: '#e58f8c', key: key + 'e', w: 2.6, tex: [{ k: 'pencil', c: C.roseD, al: 0.5, per: 60 }] });
  ctx.restore();
}
// smoothstep of x between a and b (NOT manim's `smooth` rate function — the math style calls that smoothM)
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const mod = (a, n) => ((a % n) + n) % n;
function asterisk(x, y, r0, r1, n, rot, color, w) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rot; ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  time (set by the renderer): TT = absolute time on the motion step (on 2s unless STYLE.ones);
//  E0 = the current era's start; DEFER = overlay queue (captions drawn after the camera); SPARK_AT = the hero's screen spot
//  ev(t, d) = 0..1 progress of an event at t over d seconds; popS(t) = back-eased pop-in scale
// ---------------------------------------------------------------------
let TT = 0, E0 = 0, DEFER = null, SPARK_AT = null;
const ev = (t, d = 0.25) => clamp((TT - t) / d);
const popS = (t) => (TT < t ? 0 : EZ.back(clamp((TT - t) / 0.25)));

// ---------------------------------------------------------------------
//  springs: closed-form, so any frame can be drawn on its own (deterministic, no state)
//  springEase(t, k, d)       0 -> 1 over time t >= 0 (stiffness k, damping d): accelerates, overshoots a hair, settles
//  springMove(t0, a, b, p)   a value moving from a to b, starting at time t0 (p = a SPRING preset)
//  springTrack(keys, p)      a value with many targets: keys = [[t, value], ...] sorted by t. One spring per change,
//                            added up, so a target change mid-move stays continuous (cursors, widths, positions)
// ---------------------------------------------------------------------
const SPRING = {
  snappy: { k: 320, d: 30 },    // UI: buttons, toggles, leading edges
  smooth: { k: 170, d: 26 },    // cards, containers, the camera
  heavy: { k: 90, d: 19 },      // big type, logos, large objects
  playful: { k: 260, d: 14 },   // mascots, stickers: visible overshoot
};
function springEase(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
const springMove = (t0, a, b, p = SPRING.smooth) => a + (b - a) * springEase(TT - t0, p.k, p.d);
function springTrack(keys, p = SPRING.smooth) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * springEase(TT - keys[i][0], p.k, p.d);
  return v;
}

// ---------------------------------------------------------------------
//  layout for several formats (9:16, 1:1, 16:9, 4:5 from one piece): place things by fractions of the frame,
//  size them by UNIT (1 at 1080 on the short side). LX(0.5), LY(0.62), 120 * UNIT. PORTRAIT / WIDE pick layouts.
// ---------------------------------------------------------------------
const LX = (f) => f * W, LY = (f) => f * H, UNIT = Math.min(W, H) / 1080, PORTRAIT = H > W * 1.2, WIDE = W > H * 1.2;

// ---------------------------------------------------------------------
//  the user's own assets (screenshots, logos): files in <piece>/assets/ that tools/build.mjs embeds in the page.
//  asset('logo.png') -> the Image (or null); drawAsset(name, x, y, w, h, { fit: 'contain'|'cover', r, alpha })
//  Real product UI only: never redraw a product screen from imagination when a screenshot exists.
// ---------------------------------------------------------------------
const asset = (name) => (typeof ASSETS !== 'undefined' && ASSETS[name] && ASSETS[name].complete ? ASSETS[name] : null);
function drawAsset(name, x, y, w, h, o = {}) {
  const img = asset(name); if (!img) return false;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = (o.fit === 'cover' ? Math.max : Math.min)(w / iw, h / ih), dw = iw * s, dh = ih * s;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.r || o.fit === 'cover') { ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r || 0); ctx.clip(); }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore(); return true;
}
