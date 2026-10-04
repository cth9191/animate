
// =====================================================================
//  kit/morph.js — the renderer for pieces built from ERAS (scenes) joined by SHAPE MORPHS.
//
//  At each bridge time tc:
//    shrink [tc-d, tc-m]      the old era is seen through a window shaped like the bridge object (STYLE.window),
//                             shrinking onto the object while the backdrop fades to blank paper
//    morph  [tc-m, tc+m]      on blank paper, the object's outline blends into its counterpart's
//                             (both resampled by angle around their centroids; colour lerped). Hero-to-hero
//                             bridges draw the hero itself with blended position, size and ray count.
//    grow   [tc+m, tc+d]      the new era opens out of a window shaped like the counterpart
//    d = the bridge's half-length (default 0.6s, so a bridge costs 1.2s), m = the morph's half (default 0.2s, or d/3 when d is set).
//    Short pieces: { tc, d: 0.4 } (0.8s) or fewer bridges — see craft.md -> Transitions.
//  Era boundaries WITHOUT a bridge are hard cuts (keep at most one: the slam).
//
//  The piece defines (in its head / src):
//    ERA_LIST = [[t0, t1, () => drawScene()], ...]      scenes draw in world coords, call yearTag()/capStrip()
//    ERA_BG   = ['#hex', ...]                          each era's dominant colour (for the fade to paper)
//    BRIDGES  = [{ tc, A: () => shape, B: () => shape, d?, m? }]   shape = { P: points, c: '#hex' } or SP(x, y, r, rays)
//    function pieceCam(era, t) { return null | CAM }   optional; use push() / bump() below
//  Shapes are in each era's world coords; the bridge object must be in frame at tc (pull push-ins back first).
//  The look comes from the style kit's STYLE hooks (paper, backdrop, window, blob, hero, post, ones):
//  this file draws nothing itself, so the same piece structure works in any style.
// =====================================================================
// ---- cameras: CAM = { z, tx, ty }; camOf({ z, p, to }) puts world point p on screen point to
const CAM0 = { z: 1, tx: 0, ty: 0 };
const camOf = (c) => ({ z: c.z, tx: c.to[0] - c.z * c.p[0], ty: c.to[1] - c.z * c.p[1] });
const camMix = (a, b, u) => ({ z: lerp(a.z, b.z, u), tx: lerp(a.tx, b.tx, u), ty: lerp(a.ty, b.ty, u) });
// an eased push-in over [a, b] to cam, optionally pulled back over [oa, ob]
function push(t, a, b, cam, oa, ob) { let u = EZ.io(seg(t, a, b)); if (oa != null) u *= 1 - EZ.io(seg(t, oa, ob)); return u > 0 ? camMix(CAM0, camOf(cam), u) : null; }
// a zoom bump on every beat from t0, centred on point p (the hero keeps its screen spot)
function bump(t, t0, p, amt = 0.3, every = 0.5) { return camOf({ z: 1 + amt * Math.exp(-mod(t - t0, every) * 7), p, to: p }); }
function camAt(era, t) { return (typeof pieceCam === 'function' && pieceCam(era, t)) || CAM0; }
const camPts = (P, c) => P.map(([x, y]) => [c.z * x + c.tx, c.z * y + c.ty]);
// ---- bridge shapes
function starPts(x, y, r, n, r0 = -Math.PI / 2, m = 96) {
  const P = []; for (let i = 0; i < m; i++) { const a = i / m * TAU, k = 0.42 + 0.58 * (0.5 + 0.5 * Math.cos(n * (a - r0))) ** 3; P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
const SP = (x, y, r, n) => ({ spark: [x, y, r, n] });
const shapeOf = (s) => (s.spark ? { P: (STYLE.heroPts || starPts)(...s.spark), c: STYLE.heroColor, spark: s.spark } : s);
function byAngle(P, m = 96) {   // resample a closed outline to m points by angle around its centroid
  const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]), Q = resample(P, true, 4), out = [];
  for (let i = 0; i < m; i++) {
    const a = -Math.PI + i / m * TAU; let best = null, bd = 1e9;
    for (const q of Q) { let d = Math.atan2(q[1] - c[1], q[0] - c[0]) - a; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); const r = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d < bd - 1e-4 || (Math.abs(d - bd) < 1e-4 && r > best[2])) { bd = d; best = [q[0], q[1], r]; } }
    out.push([best[0], best[1]]);
  }
  return { P: out, c };
}
const mixHex = (a, b, u) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`; };
function maskK(P) {   // how far the window must scale about its centroid to cover the frame
  const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
  const rmin = Math.max(8, Math.min(...byAngle(P, 48).P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))));
  const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map((q) => Math.hypot(q[0] - c[0], q[1] - c[1])));
  return { c, kmax: far / rmin * 1.1 };
}
const scaled = (P, c, k) => P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
// ---- layers and windows
const LAYER = [];
function layer(i) { if (!LAYER[i]) { const c = document.createElement('canvas'); c.width = W; c.height = H; LAYER[i] = c; } return LAYER[i]; }
function renderEra(e, target) {   // draws era e into target; returns its overlay queue (year tag, caption)
  const saved = ctx; ctx = target.getContext('2d');
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.setLineDash([]);
  ctx.fillStyle = STYLE.paper; ctx.fillRect(0, 0, W, H);   // a clean sheet every frame: nothing carries over between frames
  const cam = camAt(e, TT); ctx.setTransform(cam.z, 0, 0, cam.z, cam.tx, cam.ty);
  DEFER = []; ERA_LIST[e][2](); const q = DEFER; DEFER = null;
  ctx.restore(); ctx = saved;
  return q;
}
function flush(q, e) { const keep = E0; E0 = ERA_LIST[e][0]; ctx.setTransform(1, 0, 0, 1, 0, 0); q.forEach((f) => f()); E0 = keep; }
function shotAtFrame(fr) {
  for (const s of TIMELINE.shots) if (fr >= Math.round(s.t0 * FPS) && fr < Math.round(s.t1 * FPS)) return s;
  return TIMELINE.shots[TIMELINE.shots.length - 1];
}
const eraAt = (t) => ERA_LIST.findIndex(([a, b]) => t >= a - 1e-6 && t < b - 1e-6);
// renderFrame(t, canvas, sub): sub = true draws the exact time t between frames (motion blur sub-frames, styles on 1s)
function renderFrame(t, canvas, sub) {
  const cv = canvas || document.getElementById('c');
  ctx = cv.getContext('2d');
  F = ((Math.floor(sub ? t * FPS + 1e-6 : Math.round(t * FPS)) % NFRAMES) + NFRAMES) % NFRAMES;
  B = Math.floor(F / 2);
  TT = (STYLE.ones ? (sub ? F + (t * FPS - Math.floor(t * FPS + 1e-6)) : F) : B * 2) / FPS;
  // the era is picked by the real frame, so a cut on an odd frame (a 16th at 24fps) lands on that frame;
  // on its first frame the new era is drawn at its own start time (motion stays on 2s inside it)
  const s = shotAtFrame(F), e = Math.max(0, eraAt(F / FPS));
  E0 = ERA_LIST[e][0];
  if (TT < E0 - 1e-6) TT = E0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]); ctx.filter = 'none';
  SPARK_AT = null;
  const bd = (r) => r.d ?? 0.6, bm = (r) => r.m ?? (r.d != null ? r.d / 3 : 0.2);
  const tr = BRIDGES.find((r) => TT >= r.tc - bd(r) - 1e-6 && TT < r.tc + bd(r) - 1e-6);
  if (!tr) {
    const q = renderEra(e, layer(0)); ctx.drawImage(layer(0), 0, 0); flush(q, e);
  } else {
    const ea = eraAt(tr.tc - 0.01), eb = eraAt(tr.tc + 0.01);
    const sa = shapeOf(tr.A()), sb = shapeOf(tr.B());
    const PA = camPts(sa.P, camAt(ea, TT)), PB = camPts(sb.P, camAt(eb, TT));
    const D = bd(tr), M = bm(tr);
    if (TT < tr.tc - M) {
      const u = EZ.i2(seg(TT, tr.tc - D, tr.tc - M)), { c, kmax } = maskK(PA), k = Math.exp(lerp(Math.log(kmax), 0, u));
      STYLE.backdrop(mixHex(ERA_BG[ea], STYLE.paper, 0.5 + u * 0.5), { eraA: ea, eraB: eb, u, phase: 'shrink' });
      const q = renderEra(ea, layer(0));
      STYLE.window(scaled(PA, c, k), 'mA' + tr.tc, layer(0), { c: sa.c, u, phase: 'shrink', eraA: ea, eraB: eb });
      flush(q, ea);
    } else if (TT < tr.tc + M) {
      const u = EZ.io(seg(TT, tr.tc - M, tr.tc + M));
      STYLE.backdrop(STYLE.paper, { eraA: ea, eraB: eb, u, phase: 'morph' });
      if (sa.spark && sb.spark) {
        const ca = camAt(ea, TT), cb = camAt(eb, TT), [ax, ay] = camPts([sa.spark.slice(0, 2)], ca)[0], [bx, by] = camPts([sb.spark.slice(0, 2)], cb)[0];
        STYLE.hero(lerp(ax, bx, u), lerp(ay, by, u), lerp(sa.spark[2] * ca.z, sb.spark[2] * cb.z, u), { rays: Math.round(lerp(sa.spark[3], sb.spark[3], u)), mood: 'wow', key: 'morphspark' });
      } else {
        const A2 = byAngle(PA), B2 = byAngle(PB), M = A2.P.map((p, i) => [lerp(p[0], B2.P[i][0], u), lerp(p[1], B2.P[i][1], u)]);
        STYLE.blob(M, mixHex(sa.c, sb.c, u), 'morph' + tr.tc, u, { eraA: ea, eraB: eb, phase: 'morph' });
        if (sb.spark && u > 0.6) STYLE.hero(...camPts([sb.spark.slice(0, 2)], camAt(eb, TT))[0], sb.spark[2] * clamp((u - 0.6) / 0.4), { rays: sb.spark[3], mood: 'wow', key: 'morphspark2' });
      }
    } else {
      const u = EZ.o2(seg(TT, tr.tc + M, tr.tc + D)), { c, kmax } = maskK(PB), k = Math.exp(lerp(0, Math.log(kmax), u));
      STYLE.backdrop(mixHex(STYLE.paper, ERA_BG[eb], u * 0.5), { eraA: ea, eraB: eb, u, phase: 'grow' });
      const q = renderEra(eb, layer(0));
      STYLE.window(scaled(PB, c, k), 'mB' + tr.tc, layer(0), { c: sb.c, u, phase: 'grow', eraA: ea, eraB: eb });
      flush(q, eb);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (STYLE.post) STYLE.post();
  ctx.restore();
  return s.id;
}
window.renderFrame = renderFrame;
window.anchorAt = () => (SPARK_AT ? { x: SPARK_AT[0], y: SPARK_AT[1] } : null);
