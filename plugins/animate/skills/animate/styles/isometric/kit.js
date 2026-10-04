// =====================================================================
//  styles/isometric/kit.js — isometric line art: white ground, 2:1 dimetric objects drawn as
//  constant hairlines (grey silhouettes and edges, lighter inner lines), faces filled white so nearer
//  objects hide farther lines, rounded slabs with visible thickness, grids of repeated parts, and one
//  tiny dark accent. Motion on 1s with spring settles. Built on kit/core.js (RNG, EZ, rrectPts, ellipsePts,
//  resample, toScreen, TT / ev / DEFER / E0 / SPARK_AT). Studied from MIT-licensed isometric line figures.
//  Needs from the piece head: W, H, FPS, CX (caption centre x). Optional: `const ISO_DARK = true` for the dark ground.
//
//  Hidden lines are painter's order: draw back to front (smaller x + y first, lower z first in a stack).
//  Every primitive fills its faces white before stroking, so whatever is drawn later hides what is behind.
// =====================================================================

// ---- palette (light: measured from the references; dark: the same roles on a near-black ground)
const ISO_DARKMODE = typeof ISO_DARK !== 'undefined' && !!ISO_DARK;
const PAL = ISO_DARKMODE
  ? { paper: '#101014', face: '#101014', edge: '#8e8e9a', inner: '#34343c', accent: '#f4f4f6', text: '#b4b4be', textD: '#6a6a74' }
  : { paper: '#ffffff', face: '#ffffff', edge: '#a4a4ac', inner: '#e0e0e4', accent: '#232327', text: '#5c5c64', textD: '#9a9aa2' };
const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const ISOMONO = 'Consolas, Menlo, "DejaVu Sans Mono", monospace';
const HAIR = 2.0;   // px at 1080 wide (0.9px on a ~400px figure, scaled to a ~850px figure); constant at any zoom

// ---------------------------------------------------------------------
//  projection: 2:1 dimetric (edges slope 0.5 = 26.57 deg; camera 30 deg above the ground, 45 deg round)
//  x runs right-down, y runs left-down, z runs up. One world unit along x or y = u px across the screen.
// ---------------------------------------------------------------------
const ZK = 1.2247;                         // z foreshortening relative to u (cos 30 / cos 45)
const ISO_VIEW = [0.6124, 0.6124, 0.5];    // unit vector from the scene toward the viewer
let ISO = { ox: 540, oy: 960, u: 1 };
function setIso(o) { ISO = { ox: o.ox ?? 540, oy: o.oy ?? 960, u: o.u ?? 1 }; return ISO; }
function iso(x, y, z = 0) { return [ISO.ox + (x - y) * ISO.u, ISO.oy + ((x + y) * 0.5 - z * ZK) * ISO.u]; }
const isoP = (p) => iso(p[0], p[1], p[2]);
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---- hairlines: the width is screen pixels whatever the camera zoom (divide by the current scale)
function zoomNow() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }
function hair(color, w = HAIR) { ctx.strokeStyle = color; ctx.lineWidth = w / zoomNow(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
function polyPath(P, closed) {
  ctx.beginPath(); if (!P.length) return;
  ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}
function line3(P3, color = PAL.edge, w = HAIR) { polyPath(P3.map(isoP), false); hair(color, w); ctx.stroke(); }
function hull2(P) {   // convex hull (monotone chain) of 2D points
  const S = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of S) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------------------------------------------------------------------
//  the one solid: a rounded rectangle w x d in the plane (a, b) from corner o, extruded h along n.
//  Draws: white fill of the silhouette, the silhouette and the cap facing the viewer as edges,
//  and the one visible extrusion line at the nearest corner (lighter when the corner is rounded).
//  Returns { front, at(u, v, s) } — at() gives the world point of plane coords (u, v) on cap s (0 base, 1 top).
//  o: { r corner radius, seg, fill, edge, crease (false: no corner line), creaseC }
// ---------------------------------------------------------------------
function isoSlab(o, a, b, n, w, d, h, opt = {}) {
  const r = Math.max(0, Math.min(opt.r ?? 0, w / 2, d / 2));
  const R2 = r > 0.01 ? rrectPts(0, 0, w, d, r, opt.seg ?? 6) : [[0, 0], [w, 0], [w, d], [0, d]];
  const at = (u, v, s = 0) => [o[0] + a[0] * u + b[0] * v + n[0] * h * s, o[1] + a[1] * u + b[1] * v + n[1] * h * s, o[2] + a[2] * u + b[2] * v + n[2] * h * s];
  const front = vdot(n, ISO_VIEW) >= 0 ? 1 : 0;
  const S0 = R2.map(([u, v]) => isoP(at(u, v, 0))), S1 = h > 0 ? R2.map(([u, v]) => isoP(at(u, v, 1))) : S0;
  ctx.save();
  polyPath(hull2(S0.concat(S1)), true);
  ctx.fillStyle = opt.fill ?? PAL.face; ctx.fill();
  hair(opt.edge ?? PAL.edge); ctx.stroke();
  polyPath(front ? S1 : S0, true); ctx.stroke();
  if (opt.crease !== false && h > 0) {   // the extrusion line at the corner nearest the viewer
    const k = r * 0.2929, mids = [[w - k, k], [w - k, d - k], [k, d - k], [k, k]];
    let best = mids[0], bd = -1e9;
    for (const m of mids) { const q = vdot(at(m[0], m[1], front), ISO_VIEW); if (q > bd) { bd = q; best = m; } }
    polyPath([isoP(at(best[0], best[1], front)), isoP(at(best[0], best[1], 1 - front))], false);
    hair(opt.creaseC ?? (r > 2 ? PAL.inner : (opt.edge ?? PAL.edge))); ctx.stroke();
  }
  ctx.restore();
  return { front, at, w, d, h };
}
// a box lying on the ground plane: x, y, z the back-bottom corner; w along x, d along y, h up
function isoBox(x, y, z, w, d, h, o = {}) { return isoSlab([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], w, d, h, o); }
// a panel standing in the x-z plane (its front faces +y, toward the lower left); t = thickness toward +y
function isoPanelY(x, y, z, w, ht, t, o = {}) { return isoSlab([x, y, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], w, ht, t, o); }
// a panel standing in the y-z plane (its front faces +x, toward the lower right); t = thickness toward +x
function isoPanelX(x, y, z, d, ht, t, o = {}) { return isoSlab([x, y, z], [0, 1, 0], [0, 0, 1], [1, 0, 0], d, ht, t, o); }
// an upright cylinder centred on (x, y), from z up h
function isoCyl(x, y, z, r, h, o = {}) { return isoSlab([x - r, y - r, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 2 * r, 2 * r, h, { seg: 10, ...o, r, crease: false }); }
// stacked plates (bottom-up). layers: [{ h, inset, gap, r }]. Returns the top z.
function isoPlates(x, y, z, w, d, layers, o = {}) {
  let zz = z;
  for (const L of layers) {
    const i = L.inset ?? 0; zz += L.gap ?? 0;
    isoBox(x + i, y + i, zz + (L.dz ?? 0), w - 2 * i, d - 2 * i, L.h, { r: L.r ?? o.r ?? 18, ...o });
    zz += L.h + (L.dz ?? 0);
  }
  return zz;
}
// a grid of repeated parts in painter's order (back to front): fn(i, j) draws the part at column i, row j
function isoGrid(nx, ny, fn) {
  for (let s = 0; s <= nx + ny - 2; s++) for (let i = Math.max(0, s - ny + 1); i <= Math.min(nx - 1, s); i++) fn(i, s - i);
}

// ---------------------------------------------------------------------
//  faces: draw flat things on a plane. A face is fp(u, v) -> world point, with u to the right and v DOWN
//  (so text reads correctly). faceOf(origin, a, b): origin = the face's top-left, a = right, b = down.
// ---------------------------------------------------------------------
const faceOf = (o, a, b) => (u, v) => [o[0] + a[0] * u + b[0] * v, o[1] + a[1] * u + b[1] * v, o[2] + a[2] * u + b[2] * v];
// the front face of a slab returned by isoSlab, with v measured down from the top (b points up in the slab)
const slabFace = (S, flipV = true) => (u, v) => S.at(u, flipV ? S.d - v : v, S.front);
function facePath(fp, P2, closed = true) { polyPath(P2.map(([u, v]) => isoP(fp(u, v))), closed); }
function faceRR(fp, x, y, w, h, r, o = {}) {   // a rounded rectangle on a face: { fill, stroke (false = none), w }
  facePath(fp, r > 0.01 ? rrectPts(x, y, w, h, Math.min(r, w / 2, h / 2), o.seg ?? 5) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke !== false) { hair(o.stroke ?? PAL.inner, o.w ?? HAIR); ctx.stroke(); }
}
function faceEll(fp, u, v, rx, ry, o = {}) {
  facePath(fp, ellipsePts(u, v, rx, ry, 0, o.n ?? 24), true);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { hair(o.stroke, o.w ?? HAIR); ctx.stroke(); }
}
// a raised rounded slab on a face (a pill, a key, a button), t thick toward the viewer. o: isoSlab options
function faceSlab(fp, x, y, w, h, t, o = {}) {
  const p0 = fp(0, 0), a = vsub(fp(1, 0), p0), b = vsub(fp(0, 1), p0);
  let nrm = vcross(a, b); const l = Math.hypot(...nrm) || 1; nrm = vsc(nrm, (vdot(nrm, ISO_VIEW) < 0 ? -1 : 1) / l);
  return isoSlab(fp(x, y), a, b, nrm, w, h, t, { r: Math.min(w, h) / 2, seg: 4, ...o });
}
function faceLine(fp, P2, color = PAL.inner, w = HAIR) { facePath(fp, P2, false); hair(color, w); ctx.stroke(); }
const facePts = (fp, P2) => P2.map(([u, v]) => isoP(fp(u, v)));   // projected outline (for bridges)
// text set into a face: glyphs are skewed into the plane. size and (u, v) in face units. o: { font, weight, color, align, count }
function isoText(fp, str, u, v, size, o = {}) {
  const p0 = isoP(fp(0, 0)), pu = isoP(fp(1, 0)), pv = isoP(fp(0, 1));
  ctx.save(); ctx.transform(pu[0] - p0[0], pu[1] - p0[1], pv[0] - p0[0], pv[1] - p0[1], p0[0], p0[1]);
  ctx.font = `${o.weight ?? 400} ${size}px ${o.font ?? ISOMONO}`; ctx.fillStyle = o.color ?? PAL.text;
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = o.al ?? 1;
  const w = ctx.measureText(str).width;
  ctx.fillText(o.count != null ? str.slice(0, Math.max(0, o.count)) : str, u, v);
  ctx.restore();
  return w;
}
// the accent: one small dark dot (an LED, a status light) on a face. One per frame; it marks the focus.
function accentDot(fp, u, v, r) { faceEll(fp, u, v, r, r, { fill: PAL.accent }); }
// a small round lamp on a face: lit = edge grey, unlit = an outline (keeps the dark for the accent)
function lamp(fp, u, v, r, lit) { faceEll(fp, u, v, r, r, { fill: lit ? PAL.edge : PAL.face, stroke: PAL.edge }); }

// ---------------------------------------------------------------------
//  springs: closed-form damped oscillation of time (no state, so any frame renders alone)
//  spring(t, t0) goes 0 -> 1 with an overshoot; kick(t, t0) goes 0 -> +1 -> -... -> 0 (squash, sway).
//  k = stiffness (higher = faster), damp = damping ratio (0.3 bouncy .. 0.9 calm; must stay < 1)
// ---------------------------------------------------------------------
function spring(t, t0, o = {}) {
  if (t <= t0) return 0;
  const w0 = Math.sqrt(o.k ?? 170), z = Math.min(0.98, o.damp ?? 0.45), wd = w0 * Math.sqrt(1 - z * z), s = t - t0;
  return 1 - Math.exp(-z * w0 * s) * (Math.cos(wd * s) + (z * w0 / wd) * Math.sin(wd * s));
}
function kick(t, t0, o = {}) {
  if (t <= t0) return 0;
  const w0 = Math.sqrt(o.k ?? 260), z = Math.min(0.98, o.damp ?? 0.3), wd = w0 * Math.sqrt(1 - z * z), s = t - t0;
  return Math.exp(-z * w0 * s) * Math.sin(wd * s);
}
const springTo = (t, t0, a, b, o) => lerp(a, b, spring(t, t0, o));
const blinkOn = (t, period = 1.0, phase = 0) => mod(t + phase, period) < period / 2;   // on 1s: a lamp that toggles

// ---------------------------------------------------------------------
//  small props
// ---------------------------------------------------------------------
// a mug: cylinder, inner rim, handle (a rounded ring standing in the x-z plane), steam
function isoMug(x, y, z, r = 30, h = 52, o = {}) {
  isoCyl(x, y, z, r, h);
  facePath(faceOf([x, y, z + h], [1, 0, 0], [0, 1, 0]), ellipsePts(0, 0, r * 0.8, r * 0.8, 0, 28), true);
  hair(PAL.inner); ctx.stroke();
  // the handle: a rounded ring standing face-on to the viewer, sticking out to the screen right
  const hw = r * 1.0, hh = h * 0.62, dir = [0.7071, -0.7071, 0], c0 = vadd([x, y, z + h * 0.82], vsc(dir, r * 0.72));
  const fp = faceOf(c0, dir, [0, 0, -1]);
  facePath(fp, rrectPts(0, 0, hw, hh, hw * 0.5, 6), true);
  const inner = rrectPts(hw * 0.02, hh * 0.22, hw * 0.66, hh * 0.56, hw * 0.26, 6).reverse().map(([u, v]) => isoP(fp(u, v)));
  ctx.moveTo(inner[0][0], inner[0][1]); for (const p of inner) ctx.lineTo(p[0], p[1]); ctx.closePath();
  ctx.fillStyle = PAL.face; ctx.fill('evenodd'); hair(PAL.edge); ctx.stroke();
  if (o.steam !== false) for (let i = 0; i < 2; i++) {   // two faint wisps, smooth on 1s
    const P = []; for (let k = 0; k <= 12; k++) { const q = k / 12; P.push([x - 8 + i * 16 + Math.sin(q * 5 + TT * 3 + i * 2) * 6 * q, y - 8 + i * 16, z + h + 12 + q * 70]); }
    line3(P, PAL.inner);
  }
}
// a potted plant: a pot (cylinder + rim) and leaves standing in vertical planes, swaying a little
function isoPlant(x, y, z, s = 1, o = {}) {
  isoCyl(x, y, z, 22 * s, 30 * s); isoCyl(x, y, z + 30 * s, 25 * s, 7 * s);
  const top = z + 37 * s, sway = Math.sin(TT * TAU * 0.35 + (o.ph ?? 0)) * 0.08 + (o.bend ?? 0);
  const leaves = [0.3, 1.5, 2.6, 3.7, 4.9].map((a, i) => ({ a: a + sway, L: (54 + (i % 3) * 14) * s, tilt: 0.35 + (i % 2) * 0.25 }));
  leaves.sort((p, q) => vdot([Math.cos(p.a), Math.sin(p.a), 0], ISO_VIEW) - vdot([Math.cos(q.a), Math.sin(q.a), 0], ISO_VIEW));
  for (const lf of leaves) {   // each leaf: a lens in the plane of its direction and up
    const dir = [Math.cos(lf.a), Math.sin(lf.a), 0], up = [0, 0, 1];
    const P = [], n = 16;
    for (let k = 0; k <= n; k++) { const q = k / n; P.push([q, Math.sin(q * Math.PI) * 0.22]); }
    for (let k = n; k >= 0; k--) { const q = k / n; P.push([q, -Math.sin(q * Math.PI) * 0.12]); }
    const W3 = ([q, side]) => { const along = q * lf.L, rise = along * lf.tilt + along * along * 0.004 * s; return vadd(vadd([x, y, top], vsc(dir, along * 0.8)), vadd(vsc(up, rise + side * lf.L * 0.5), vsc([-dir[1], dir[0], 0], side * lf.L * 0.25))); };
    polyPath(P.map((p) => isoP(W3(p))), true); ctx.fillStyle = PAL.face; ctx.fill(); hair(PAL.edge); ctx.stroke();
    polyPath([0.08, 0.5, 0.85].map((q) => isoP(W3([q, 0.03]))), false); hair(PAL.inner); ctx.stroke();
  }
}
// a cable: a smooth 3D curve through control points (Catmull-Rom), drawn as two hairlines with white between
function isoCable(P3, o = {}) {
  const S = [];
  for (let i = 0; i < P3.length - 1; i++) {
    const p0 = P3[Math.max(0, i - 1)], p1 = P3[i], p2 = P3[i + 1], p3 = P3[Math.min(P3.length - 1, i + 2)];
    for (let k = 0; k < 10; k++) {
      const t = k / 10, t2 = t * t, t3 = t2 * t;
      S.push([0, 1, 2].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  S.push(P3[P3.length - 1]);
  const Q = S.map(isoP);
  polyPath(Q, false); hair(PAL.edge, (o.w ?? 9) + HAIR * 2); ctx.stroke();
  polyPath(Q, false); hair(PAL.face, o.w ?? 9); ctx.stroke();
  return S;
}

// ---------------------------------------------------------------------
//  the hero: a rounded cube-bot with two dark dot eyes that blink, an antenna, a spring bob and hop.
//  (x, y, z) = the centre of its footprint on the surface it stands on; s = its size in world units.
//  o: { key, hop: time of a hop, look: -1..1 gaze along its face, faceX: true = face on the +x side }
// ---------------------------------------------------------------------
function cubeBot(x, y, z, s, o = {}) {
  const key = o.key ?? 'bot', t = TT;
  let lift = Math.sin(t * TAU * 0.75 + key.length) * s * 0.02 + s * 0.02, sq = 0;
  for (const hp of [].concat(o.hop ?? [])) {
    const u = (t - hp) / 0.34;
    if (u > 0 && u < 1) lift += 4 * u * (1 - u) * s * 0.6;
    sq += kick(t, hp + 0.34, { k: 300, damp: 0.28 }) * 0.16 - kick(t, hp - 0.12, { k: 500, damp: 0.6 }) * (t < hp ? 0.1 : 0);
  }
  const hb = s * 0.84 * (1 - sq), wb = s * (1 + sq * 0.3);
  if (lift > s * 0.08) {   // a contact ring on the surface while airborne (a line, never a shadow)
    const k = clamp(1 - lift / (s * 0.8), 0.3, 1);
    facePath(faceOf([x, y, z], [1, 0, 0], [0, 1, 0]), ellipsePts(0, 0, s * 0.5 * k, s * 0.5 * k, 0, 24), true); hair(PAL.inner); ctx.stroke();
  }
  const zb = z + lift;
  const body = isoBox(x - wb / 2, y - wb / 2, zb, wb, wb, hb, { r: s * 0.24 });
  // antenna: a stalk and a ball that sways after a hop
  const sway = (o.hop != null ? [].concat(o.hop).reduce((a, hp) => a + kick(t, hp + 0.3, { k: 120, damp: 0.25 }), 0) : 0) * s * 0.18;
  const base = [x, y, zb + hb], tip = [x + sway * 0.7, y + sway * 0.7, zb + hb + s * 0.34];
  line3([base, tip], PAL.edge);
  const tp = isoP(tip); ctx.beginPath(); ctx.arc(tp[0], tp[1], s * 0.07 * ISO.u, 0, TAU); ctx.fillStyle = PAL.face; ctx.fill(); hair(PAL.edge); ctx.stroke();
  // face on the +y side (lower left) by default
  const fx = o.faceX, fp = fx ? faceOf([x + wb / 2, y - wb / 2, zb + hb], [0, 1, 0], [0, 0, -1]) : faceOf([x - wb / 2, y + wb / 2, zb + hb], [1, 0, 0], [0, 0, -1]);
  const blink = mod(F + key.length * 13, 62) < 3 || (o.hop != null && [].concat(o.hop).some((hp) => t > hp + 0.3 && t < hp + 0.42));
  const look = (o.look ?? 0) * s * 0.06, ey = hb * 0.46;
  for (const ex of [0.34, 0.66]) faceEll(fp, ex * wb + look, ey, s * 0.062, blink ? s * 0.012 : s * 0.085, { fill: PAL.accent, n: 18 });
  faceLine(fp, [[wb * 0.4 + look, hb * 0.72], [wb * 0.6 + look, hb * 0.72]], PAL.inner);   // a mouth line, light
  // two vent lines on the other side face
  const sp = fx ? faceOf([x - wb / 2, y + wb / 2, zb + hb], [1, 0, 0], [0, 0, -1]) : faceOf([x + wb / 2, y - wb / 2, zb + hb], [0, 1, 0], [0, 0, -1]);
  for (const v of [0.42, 0.56]) faceLine(sp, [[wb * 0.3, hb * v], [wb * 0.7, hb * v]], PAL.inner);
  SPARK_AT = toScreen(...isoP([x, y, zb + hb * 0.5]));
  return { top: zb + hb, body };
}

// ---------------------------------------------------------------------
//  captions and tags (DEFER: drawn after the camera, at screen size)
// ---------------------------------------------------------------------
function isoCaptionNow(str, y, o = {}) {
  const a = spring(TT, E0 + (o.at ?? 0.45), { k: 120, damp: 0.8 }), sz = o.size ?? 46;
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.font = `400 ${sz}px ${SANS}`; ctx.fillStyle = PAL.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, CX, y + (1 - a) * 18);
  const w = ctx.measureText(str).width;
  polyPath([[CX - 22, y - sz * 1.25], [CX + 22, y - sz * 1.25]], false); hair(PAL.edge); ctx.stroke();   // a short rule above
  ctx.restore();
  return w;
}
function isoTagNow(num, label) {
  const a = clamp(spring(TT, E0 + 0.15, { k: 140, damp: 0.85 }));
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `400 30px ${ISOMONO}`; ctx.fillStyle = PAL.textD; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(num, 70, 318); const w = ctx.measureText(num).width;
  polyPath([[70 + w + 16, 308], [70 + w + 16 + 60 * a, 308]], false); hair(PAL.edge); ctx.stroke();
  ctx.fillStyle = PAL.text; ctx.fillText(label, 70 + w + 92, 318);
  ctx.restore();
}
const isoCaption = (str, o = {}) => { const f = () => isoCaptionNow(str, o.y ?? 1460, o); if (DEFER) DEFER.push(f); else f(); };
const isoTag = (num, label) => { const f = () => isoTagNow(num, label); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const colLum = (c) => { const m = String(c).match(/\d+/g); const v = c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : m.slice(0, 3).map(Number); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; };
const thickDrop = (P, t = 10) => P.map(([x, y]) => [x, y + t]);   // a slab's thickness seen from 30 deg above
const STYLE = {
  name: 'isometric',
  paper: PAL.paper,
  backdrop(c) { fillAll(c); },
  window(P, key, src) {   // src seen through outline P, drawn as a slab: a light thickness line under a hairline rim
    polyPath(thickDrop(P), true); hair(PAL.inner); ctx.stroke();
    ctx.save(); polyPath(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    polyPath(P, true); hair(PAL.edge); ctx.stroke();
  },
  blob(P, c, key) {   // the morphing shape: a hairline slab; the fill follows the stroke from accent-dark to face-white
    const la = colLum(PAL.accent), le = colLum(PAL.edge), u = clamp((colLum(c) - la) / (le - la || 1));
    polyPath(thickDrop(P), true); ctx.fillStyle = PAL.face; ctx.fill(); hair(PAL.inner); ctx.stroke();
    polyPath(P, true); ctx.fillStyle = mixHex(PAL.accent, PAL.face, clamp(u * 2.5)); ctx.fill();
    hair(c); ctx.stroke();
  },
  hero(x, y, r, o = {}) { const keep = ISO; setIso({ ox: x, oy: y, u: r / 60 }); cubeBot(0, 0, -0.42 * 60, 60, { key: o.key }); ISO = keep; },
  heroColor: PAL.edge,
  heroPts(x, y, r, n = 96) {   // the cube's silhouette, for hero-to-hero bridges
    const keep = ISO; setIso({ ox: x, oy: y, u: r / 60 }); const s = 60, z0 = -0.42 * s;
    const P = [];
    for (const [px, py] of rrectPts(-s / 2, -s / 2, s, s, s * 0.24, 4)) { P.push(iso(px, py, z0)); P.push(iso(px, py, z0 + s * 0.84)); }
    ISO = keep; return hull2(P);
  },
  post() {},
  ones: true,
};
