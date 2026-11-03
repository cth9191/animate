// =====================================================================
//  styles/vhs/kit.js — analog horror on tape: a lit, shaded scene seen through a worn VHS deck.
//  Two halves:
//    1. light and material helpers for "as real as the canvas gets": a key light with flicker, soft shading
//       (key, fill, ambient occlusion, rim), felt and wool texture, brushed and painted metal, glass, light cones, dust.
//    2. the tape: STYLE.post runs after every frame and turns the clean frame into a playback of a worn tape —
//       luma and chroma at VHS resolution, chroma bleed and offset, lifted blacks, halation, line jitter,
//       a tracking band, head-switching noise at the bottom, dropouts, snow, scanlines, vignette, the deck's OSD.
//  The piece can drive the tape with optional hooks:
//    pieceGlitch(t) -> 0..1      how badly the tape is tracking right now (0 = a clean-ish worn tape)
//    pieceSignal(t) -> null | 'static' | 'black' | 'blue'   replaces the picture (signal loss)
//    pieceOSD(t)    -> { tl, tr, bl, br, layout } strings for the deck's on-screen display (null hides one);
//                      layout 'corners' (default, near the edges like a real VCR) or 'safe' (inside the phone-UI safe area)
//    pieceGrade(t)  -> { tint: '#hex', amt: 0..1 }   an extra colour cast (a red emergency light, a green night)
//  Built on kit/core.js. Motion on 1s (STYLE.ones), so servo stutters and camera shake land on every frame.
// =====================================================================
const VH = {
  black: '#050506', lift: '#151a1c', osd: '#f2f2ec', osdShadow: 'rgba(0,0,0,0.85)',
  curtain: '#5a0f16', curtainD: '#1c0306', curtainL: '#9a2a2c',
  wood: '#5b3a22', woodD: '#24160c', woodL: '#8a5d38',
  felt: '#2f2925', feltD: '#120e0c', feltL: '#5a4f47',
  wool: '#d8cfba', woolD: '#7d705c', woolL: '#f6efdc', grime: 'rgba(70,52,30,0.55)',
  metal: '#7c7f84', metalD: '#2a2c30', metalL: '#d9dde2', rust: '#6b3a1e',
  eye: '#e0a23a', eyeD: '#7a4510', mouth: '#1a0606', red: '#8e1c1c', redL: '#c0392b',
};
// the key light the scene is lit by: position (world), intensity 0..1 (flicker), colour. Scenes set it each frame.
let vhLight = { x: 540, y: -200, k: 1, c: '#ffe2b0' };

// the light is given in world coords (wx, wy). Call vhWorld() once at the top of a scene (under the camera), then
// vhLocal() after every translate / rotate / scale, so the shading helpers see the light in the current coords.
let VH_M0 = null;
function vhWorld() { VH_M0 = ctx.getTransform(); vhLight.x = vhLight.wx; vhLight.y = vhLight.wy; }
function vhLocal() { const p = ctx.getTransform().inverse().multiply(VH_M0).transformPoint(new DOMPoint(vhLight.wx, vhLight.wy)); vhLight.x = p.x; vhLight.y = p.y; }

// ---- buffers (cached by name; rebuilt only when the size changes)
const VH_BUF = {};
function vhBuf(name, w, h) {
  let c = VH_BUF[name];
  if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; VH_BUF[name] = c; }
  return c;
}

// ---- sprites: draw something once into a cached canvas and reuse it while its inputs stay the same.
// key must hold every input that changes the pixels; the resolution follows the current transform (rounded up to 1/4),
// so a close-up gets a sharper sprite than a wide shot. Deterministic: the first frame and the hundredth draw the same.
const VH_SPRITES = new Map();
function vhSprite(key, x0, y0, x1, y1, draw) {
  const m = ctx.getTransform(), sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)), s = clamp(Math.ceil(sc * 4) / 4, 0.25, 4);
  const id = key + '|' + s;
  let c = VH_SPRITES.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil((x1 - x0) * s)); c.height = Math.max(1, Math.ceil((y1 - y0) * s));
    const saved = ctx; ctx = c.getContext('2d'); ctx.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    draw(); ctx = saved;
    VH_SPRITES.set(id, c);
    if (VH_SPRITES.size > 160) VH_SPRITES.delete(VH_SPRITES.keys().next().value);
  }
  ctx.drawImage(c, x0, y0, c.width / s, c.height / s);
}

// ---- colour
const vhHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function vhMix(a, b, u, al = 1) { const x = vhHex(a), y = vhHex(b); return `rgba(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')},${al})`; }
function vhMixH(a, b, u) { const x = vhHex(a), y = vhHex(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], u)).toString(16).padStart(2, '0')).join(''); }
const vhA = (h, al) => { const [r, g, b] = vhHex(h); return `rgba(${r},${g},${b},${al})`; };

// ---- paths
function vhPath(P) { trace(P, true); }
function vhFill(P, c) { trace(P, true); ctx.fillStyle = c; ctx.fill(); }

// =====================================================================
//  shading: one call per solid. P = outline (world coords), base colour, and o:
//    light   a world point the key light comes from (default vhLight); hi = key colour strength 0..1
//    lo      how dark the side away from the light gets (0..1); ao = contact darkening at the bottom edge
//    rim     { c, side: -1 | 1, w } a back light on one edge; spec = a hard highlight spot { x, y, r, a }
//    tex     fn(bb) drawn inside the clip after the base (felt, wool, rust ...); edge = a thin dark outline alpha
// =====================================================================
function vhShade(P, base, o = {}) {
  const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rw = (bb.x1 - bb.x0) / 2, rh = (bb.y1 - bb.y0) / 2, R = Math.max(rw, rh);
  const L = o.light || [vhLight.x, vhLight.y], k = vhLight.k;
  ctx.save(); vhPath(P); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(bb.x0 - 2, bb.y0 - 2, bb.x1 - bb.x0 + 4, bb.y1 - bb.y0 + 4);
  if (o.tex) o.tex(bb);
  // the key: a soft hotspot on the side facing the light
  const dx = L[0] - cx, dy = L[1] - cy, dl = Math.hypot(dx, dy) || 1, hx = cx + dx / dl * R * 0.55, hy = cy + dy / dl * R * 0.55;
  const gk = ctx.createRadialGradient(hx, hy, R * 0.05, hx, hy, R * 1.5);
  const hi = (o.hi ?? 0.55) * k;
  gk.addColorStop(0, vhA(vhLight.c, hi)); gk.addColorStop(0.45, vhA(vhLight.c, hi * 0.35)); gk.addColorStop(1, vhA(vhLight.c, 0));
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = gk; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.globalAlpha = 1;
  // the shadow side: darkest opposite the light, plus an overall dimming when the light is low
  const sx = cx - dx / dl * R, sy = cy - dy / dl * R;
  const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 2.1), lo = (o.lo ?? 0.7) * (0.55 + 0.45 * k);
  gs.addColorStop(0, `rgba(0,0,0,${lo})`); gs.addColorStop(0.55, `rgba(0,0,0,${lo * 0.45})`); gs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = gs; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  if (k < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 0.75})`; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  // ambient occlusion along the bottom
  if (o.ao) { const ga = ctx.createLinearGradient(0, bb.y1 - rh * 0.6, 0, bb.y1); ga.addColorStop(0, 'rgba(0,0,0,0)'); ga.addColorStop(1, `rgba(0,0,0,${o.ao})`); ctx.fillStyle = ga; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  // a rim light: a thin bright edge on one side (stroke the outline, offset inward)
  if (o.rim) {
    const { c, side = 1, w = 10, a = 0.6 } = o.rim, gr = ctx.createLinearGradient(side > 0 ? bb.x1 : bb.x0, 0, side > 0 ? bb.x1 - rw * 0.5 : bb.x0 + rw * 0.5, 0);
    gr.addColorStop(0, vhA(c, a)); gr.addColorStop(1, vhA(c, 0));
    ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = gr; ctx.lineWidth = w * 2; vhPath(P); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  }
  if (o.spec) { const { x, y, r, a = 0.8 } = o.spec, g2 = ctx.createRadialGradient(x, y, 0, x, y, r); g2.addColorStop(0, `rgba(255,250,235,${a * k})`); g2.addColorStop(1, 'rgba(255,250,235,0)'); ctx.fillStyle = g2; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.restore();
  if (o.edge) { ctx.save(); vhPath(P); ctx.strokeStyle = `rgba(0,0,0,${o.edge})`; ctx.lineWidth = o.edgeW ?? 3; ctx.stroke(); ctx.restore(); }
}

// ---- textures (drawn inside a clip; static per key, so they don't crawl: the tape supplies the life)
// felt / short fur: many short strokes along a direction, three tones
function vhFelt(bb, key, c, o = {}) {
  const R = RNG('felt', key), n = Math.round((bb.x1 - bb.x0) * (bb.y1 - bb.y0) / (o.sparse ?? 260)), len = o.len ?? 9, a0 = o.dir ?? Math.PI / 2;
  const tones = [vhMix(c, '#000000', 0.35, 0.55), vhMix(c, '#ffffff', 0.18, 0.45), vhMix(c, '#6b5030', 0.3, 0.4)];
  ctx.lineCap = 'round';
  tones.forEach((t, ti) => {
    ctx.beginPath(); ctx.strokeStyle = t; ctx.lineWidth = o.w ?? 1.6;
    for (let i = ti; i < n; i += 3) {
      const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), a = a0 + R.n(0.6), l = len * R.r(0.5, 1.3);
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.stroke();
  });
}
// stains, scuffs and grime blotches
function vhGrime(bb, key, n = 8, c = VH.grime) {
  const R = RNG('grime', key);
  for (let i = 0; i < n; i++) {
    const x = R.r(bb.x0, bb.x1), y = R.r(bb.y0, bb.y1), r = R.r(10, 60) * ((bb.x1 - bb.x0) / 400 + 0.3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * R.r(0.5, 1), R.r(0, TAU), 0, TAU); ctx.fill();
  }
}
// a wool fleece: curls packed in an ellipse, each one lit from the key light, dark in the gaps between them
// (matted, not fluffy: many small irregular locks, low contrast, dirtier toward the bottom, fibre strokes on top)
function vhWool(cx, cy, rx, ry, key, o = {}) {
  // cached: the light level in steps of 0.05 and the light's direction in steps of 40 units (drawn with those values)
  const kq = Math.round(vhLight.k * 20) / 20, lx = Math.round(vhLight.x / 40) * 40, ly = Math.round(vhLight.y / 40) * 40, pad = (o.r ?? 15) * 2;
  const L0 = vhLight;
  vhSprite(['wool', key, cx, cy, rx, ry, o.r, o.n, o.c, kq, lx, ly].join(','), cx - rx - pad, cy - ry - pad, cx + rx + pad, cy + ry + pad, () => {
    vhLight = { ...L0, k: kq, x: lx, y: ly }; vhWoolDraw(cx, cy, rx, ry, key, o); vhLight = L0;
  });
}
function vhWoolDraw(cx, cy, rx, ry, key, o = {}) {
  const r0 = o.r ?? 15, R = RNG('wool', key), n = o.n ?? Math.round(rx * ry / (r0 * r0 * 0.55)), k = vhLight.k;
  const dark = (1 - k) * 0.82, base0 = o.c ?? VH.wool;
  const L = [vhLight.x, vhLight.y], locks = [];
  for (let i = 0; i < n; i++) {
    const a = R.r(0, TAU), d = Math.sqrt(R.f());
    locks.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, R.r(0.6, 1.35) * r0, R.r(-0.12, 0.08), R.r(0, TAU), R.r(0.7, 1)]);
  }
  locks.sort((p, q) => p[1] - q[1]);   // farther (higher) locks first
  for (const [x, y, r, tone, rot, sq] of locks) {
    const dirt = clamp((y - (cy - ry * 0.2)) / (ry * 1.4)) * 0.45;   // grimier toward the bottom
    const bh = vhMixH(vhMixH(base0, '#5a4630', dirt), '#000000', dark);
    const dx = L[0] - x, dy = L[1] - y, dl = Math.hypot(dx, dy) || 1, lx = dx / dl, ly = dy / dl;
    ctx.fillStyle = 'rgba(16,11,6,0.32)'; ctx.beginPath(); ctx.ellipse(x - lx * r * 0.2, y + r * 0.25, r * 1.1, r * 0.9 * sq, rot, 0, TAU); ctx.fill();
    const col = tone > 0 ? vhMix(bh, '#ffffff', tone * 1.5) : vhMix(bh, '#2a1d10', -tone * 2.5);
    const g = ctx.createRadialGradient(x + lx * r * 0.4, y + ly * r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, vhMix(bh, '#fff4dc', 0.22 * k)); g.addColorStop(0.6, col); g.addColorStop(1, vhMix(bh, '#140e06', 0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, rot, 0, TAU); ctx.fill();
  }
  // fibres: little crimped hooks across the fleece, dark in the gaps and pale on the tips
  const nf = Math.round(n * 7), F2 = RNG('woolf', key);
  ctx.lineWidth = Math.max(0.8, r0 * 0.06); ctx.lineCap = 'round';
  for (const [c, al] of [['20,14,6', 0.3], ['250,240,215', 0.2 * k], ['120,100,70', 0.25]]) {
    ctx.strokeStyle = `rgba(${c},${al})`; ctx.beginPath();
    for (let i = 0; i < nf / 3; i++) {
      const a = F2.r(0, TAU), d = Math.sqrt(F2.f()) * 1.05, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, rr = r0 * F2.r(0.15, 0.45), a0 = F2.r(0, TAU);
      ctx.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr); ctx.arc(x, y, rr, a0, a0 + F2.r(2, 4));
    }
    ctx.stroke();
  }
}
// metal with brushed bands and a hard specular line; for plates, teeth, pistons and screws
function vhMetal(P, o = {}) {
  const bb = bbox(P), vertical = o.vertical ?? (bb.y1 - bb.y0 > bb.x1 - bb.x0);
  ctx.save(); vhPath(P); ctx.clip();
  const g = vertical ? ctx.createLinearGradient(bb.x0, 0, bb.x1, 0) : ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
  const k = vhLight.k, c = o.c ?? VH.metal;
  g.addColorStop(0, vhMix(c, '#000000', 0.6)); g.addColorStop(0.28, vhMix(c, '#ffffff', 0.45 * k)); g.addColorStop(0.36, vhMix(c, '#ffffff', 0.15 * k));
  g.addColorStop(0.7, vhMix(c, '#000000', 0.25)); g.addColorStop(1, vhMix(c, '#000000', 0.7));
  ctx.fillStyle = g; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  if (o.rust) vhGrime(bb, (o.key ?? 'mt') + 'r', o.rust, 'rgba(107,58,30,0.6)');
  if (k < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - k) * 0.7})`; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); }
  ctx.restore();
  ctx.save(); vhPath(P); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = o.edgeW ?? 2; ctx.stroke(); ctx.restore();
}
function vhScrew(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, vhMix(VH.metalL, '#000000', 1 - vhLight.k * 0.8)); g.addColorStop(1, VH.metalD);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = Math.max(1, r * 0.25); ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.2); ctx.lineTo(x + r * 0.6, y + r * 0.2); ctx.stroke();
}
// a glass eye: sclera (painted resin), iris with radial fibres, a pupil (round or a goat's bar), a wet highlight
function vhEye(x, y, r, o = {}) {
  const k = vhLight.k, look = o.look ?? [0, 0], R = RNG('eye', o.key ?? 'e');
  // socket shadow
  const gs = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.5); gs.addColorStop(0, 'rgba(0,0,0,0.85)'); gs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  const sc = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  sc.addColorStop(0, vhMix('#efe6cf', '#000000', 0.15 + (1 - k) * 0.6)); sc.addColorStop(0.75, vhMix('#b9a988', '#000000', 0.25 + (1 - k) * 0.6)); sc.addColorStop(1, '#2a2116');
  ctx.fillStyle = sc; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // yellowed, veined resin
  ctx.strokeStyle = 'rgba(140,40,30,0.35)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { const a = R.r(0, TAU); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * r * 0.75, y + Math.sin(a + 0.3) * r * 0.75, x + Math.cos(a + R.n(0.4)) * r * 0.55, y + Math.sin(a + R.n(0.4)) * r * 0.55); ctx.stroke(); }
  const ix = x + look[0] * r * 0.38, iy = y + look[1] * r * 0.32, ir = r * (o.iris ?? 0.62);
  const gi = ctx.createRadialGradient(ix, iy, ir * 0.15, ix, iy, ir);
  const ic = o.c ?? VH.eye;
  gi.addColorStop(0, vhMix(ic, '#fff2c0', 0.4 * k)); gi.addColorStop(0.6, vhMix(ic, '#000000', 1 - (0.35 + 0.65 * k))); gi.addColorStop(1, vhMix(ic, '#000000', 0.8));
  ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,0,0.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + R.n(0.05); ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * ir * 0.3, iy + Math.sin(a) * ir * 0.3); ctx.lineTo(ix + Math.cos(a) * ir * 0.95, iy + Math.sin(a) * ir * 0.95); ctx.stroke(); }
  ctx.fillStyle = '#060404'; ctx.beginPath();
  const pd = o.dilate ?? 1;
  if (o.bar) ctx.ellipse(ix, iy, ir * 0.62 * pd, ir * 0.17 * pd, o.barRot ?? 0, 0, TAU); else ctx.arc(ix, iy, ir * 0.36 * pd, 0, TAU);
  ctx.fill();
  // the eyelid: a felt lid that closes from the top (lid 0 = open, 1 = shut), with a lash line
  const lid = clamp(o.lid ?? 0);
  if (lid > 0) {
    const ly = y - r + lid * r * 2.05;
    ctx.fillStyle = o.lidC ?? VH.felt; ctx.beginPath(); ctx.moveTo(x - r * 1.2, y - r * 1.2); ctx.lineTo(x + r * 1.2, y - r * 1.2); ctx.lineTo(x + r * 1.2, ly); ctx.quadraticCurveTo(x, ly + r * 0.35, x - r * 1.2, ly); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(x - r * 1.2, ly); ctx.quadraticCurveTo(x, ly + r * 0.35, x + r * 1.2, ly); ctx.stroke();
    const gl = ctx.createLinearGradient(0, ly, 0, ly + r * 0.5); gl.addColorStop(0, 'rgba(0,0,0,0.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(x - r, ly, r * 2, r * 0.6);
  }
  ctx.restore();
  // the wet highlight sits on the glass, above the lid shadow, and follows the light, not the gaze
  if (lid < 0.85) {
    const hx = x + (vhLight.x - x) / 2000 * r - r * 0.32, hy = y - r * 0.42;
    ctx.fillStyle = `rgba(255,252,240,${0.85 * k})`; ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.16, r * 0.1, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,252,240,${0.35 * k})`; ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.38, r * 0.06, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}
// a light cone (screen-blended) from a lamp at (x0, y0) of width w0 to a pool at y1 of width w1
function vhCone(x0, y0, w0, x1, y1, w1, c, a) {
  // cached at full strength, then drawn with the wanted alpha (the blur is the expensive part)
  const pad = 60, X0 = Math.min(x0 - w0 / 2, x1 - w1 / 2) - pad, X1 = Math.max(x0 + w0 / 2, x1 + w1 / 2) + pad;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = clamp(a / 0.2);
  vhSprite(['cone', x0, y0, w0, x1, y1, w1, c].join(','), X0, Math.min(y0, y1) - pad, X1, Math.max(y0, y1) + pad, () => vhConeDraw(x0, y0, w0, x1, y1, w1, c, 0.2));
  ctx.restore();
}
function vhConeDraw(x0, y0, w0, x1, y1, w1, c, a) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, vhA(c, a)); g.addColorStop(1, vhA(c, a * 0.25));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1); ctx.closePath();
  ctx.filter = 'blur(18px)'; ctx.fill(); ctx.filter = 'none';
  ctx.restore();
}
// a pool of light on a surface
function vhPool(x, y, rx, ry, c, a) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, vhA(c, a)); g.addColorStop(0.6, vhA(c, a * 0.4)); g.addColorStop(1, vhA(c, 0));
  ctx.fillStyle = g; ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
// dust floating in a light cone: each mote drifts on its own slow loop; brighter inside the cone
function vhDust(x0, y0, x1, y1, n, key, inCone) {
  const R = RNG('dust', key);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const px = R.r(x0, x1), py = R.r(y0, y1), sp = R.r(0.1, 0.4), ph = R.r(0, TAU), r = R.r(1.2, 3.6);
    const x = px + Math.sin(TT * sp + ph) * 40, y = mod(py + TT * sp * 25 - y0, y1 - y0) + y0;
    const a = (inCone ? inCone(x, y) : 1) * R.r(0.25, 0.8) * vhLight.k;
    if (a < 0.02) continue;
    ctx.fillStyle = `rgba(255,236,200,${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// a soft contact shadow on the floor
function vhShadow(x, y, rx, ry, a = 0.7) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.fillStyle = g; ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// servo motion: keys [[t0, t1, to, steps]] from v0. Each step snaps with an underdamped spring (overshoot + settle),
// so a move reads as a cheap motor: stop, start, stop. Steps = 1 for a single clunk.
const VH_SERVO = { k: 1100, d: 26 };
function servo(keys, v0, p = VH_SERVO) {
  let v = v0, prev = v0;
  for (const [t0, t1, to, n = 1] of keys) {
    for (let i = 0; i < n; i++) { const ti = t0 + (t1 - t0) * i / n; v += (to - prev) / n * springEase(TT - ti, p.k, p.d); }
    prev = to;
  }
  return v;
}
// a twitch: per-frame random jitter of amplitude amp while t0 <= TT < t1
const twitch = (t0, t1, amp, key) => (TT >= t0 && TT < t1 ? RNG('tw', key, F).n(amp) : 0);
// a light that flickers: a list of [t, level] steps plus a constant low-level buzz
function flicker(steps, buzz = 0.04, key = 'fl') {
  let v = 0; for (const [t, l] of steps) if (TT >= t) v = l;
  return clamp(v * (1 - buzz + RNG('buzz', key, F).n(buzz)));
}

// =====================================================================
//  the tape — STYLE.post
// =====================================================================
const VH_OSD_FONT = '"VCR OSD Mono", Consolas, "Lucida Console", "DejaVu Sans Mono", "Courier New", monospace';
function vhNoise(w, h, seed, amt) {
  const c = vhBuf('noise', w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data, f = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) { const v = f() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 * amt; }
  g.putImageData(im, 0, 0); return c;
}
function vhScanPattern(g) {
  const c = vhBuf('scan', 4, 4), x = c.getContext('2d');
  x.clearRect(0, 0, 4, 4); x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(0, 0, 4, 1); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 1, 4, 1);
  return g.createPattern(c, 'repeat');
}
function vhOSDText(str, x, y, size, align = 'left') {
  ctx.save(); ctx.font = `700 ${size}px ${VH_OSD_FONT}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = VH.osdShadow; ctx.fillText(str, x + size * 0.07, y + size * 0.07);
  ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = size * 0.25; ctx.fillStyle = VH.osd; ctx.fillText(str, x, y);
  ctx.restore();
}
// where the deck's OSD sits. 'corners' (default): near the frame's edges like a real VCR (title-safe ~6%);
// 'safe': inside the 9:16 phone-UI safe area (x 60–940, y 250–1500) when the platform's buttons must not cover it.
function vhOSDBox(layout) {
  const fs = Math.round(58 * UNIT);
  if (layout === 'safe') {
    const S = typeof SAFE !== 'undefined' ? SAFE : { top: 60, bottom: 110, right: 60 };
    return { fs, l: 70 * UNIT + 20, r: W - S.right - 20, top: S.top + 90 * UNIT, bot: H - S.bottom - 30 * UNIT };
  }
  const mx = Math.round(Math.min(W, H) * 0.06);
  return { fs, l: mx, r: W - mx, top: Math.round(H * 0.06) + fs, bot: Math.round(H * 0.935) };
}
// the tape runs at half the frame's resolution (VHS has ~250 lines of luma and ~40 of chroma: nothing is lost),
// then the result is upscaled once; only the scanlines, the vignette and the OSD are drawn at full resolution.
function vhTape() {
  const cv = ctx.canvas, g = typeof pieceGlitch === 'function' ? clamp(pieceGlitch(TT)) : 0;
  const sig = typeof pieceSignal === 'function' ? pieceSignal(TT) : null, R = RNG('tape', F);
  const hw = Math.round(W / 2), hh = Math.round(H / 2), k = hw / W;   // the working size and its scale
  const out = vhBuf('out', hw, hh), o = out.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.filter = 'none'; o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
  ctx.save(); screen(); ctx.globalAlpha = 1; ctx.filter = 'none';
  if (sig === 'black' || sig === 'static' || sig === 'blue') {
    o.fillStyle = sig === 'blue' ? '#1f2fb8' : '#000'; o.fillRect(0, 0, hw, hh);
    if (sig === 'static') { const nz = vhNoise(Math.round(W / 3), Math.round(H / 3), hash('st', F), 1); o.imageSmoothingEnabled = false; o.drawImage(nz, 0, 0, hw, hh); o.imageSmoothingEnabled = true; o.fillStyle = 'rgba(0,0,0,0.25)'; o.fillRect(0, 0, hw, hh); }
  } else {
    // 1 luma at tape resolution, graded: lifted contrast, drained saturation
    const lw = Math.round(W / 2.6), lh = Math.round(H / 2.2), lo = vhBuf('lo', lw, lh), lg = lo.getContext('2d');
    lg.imageSmoothingQuality = 'high'; lg.filter = 'contrast(1.12) saturate(0.7) brightness(1.03)'; lg.drawImage(cv, 0, 0, lw, lh); lg.filter = 'none';
    // 2 chroma at a fraction of that, smeared sideways (VHS colour is ~40 lines wide)
    const cw = Math.round(W / 14), chh = Math.round(H / 3), ch = vhBuf('ch', cw, chh), cg = ch.getContext('2d');
    cg.imageSmoothingQuality = 'high'; cg.filter = 'saturate(1.35)'; cg.drawImage(lo, 0, 0, cw, chh); cg.filter = 'none';
    // 3 the picture (half res): luma, chroma bled and offset to the right, halation on the highlights
    const mid = vhBuf('mid', hw, hh), mg = mid.getContext('2d'); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high';
    mg.globalCompositeOperation = 'copy'; mg.drawImage(lo, 0, 0, hw, hh); mg.globalCompositeOperation = 'source-over';
    mg.globalCompositeOperation = 'color'; mg.globalAlpha = 0.9; mg.drawImage(ch, (9 + g * 26) * k, 2 * k, hw, hh); mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
    const bl = vhBuf('bl', lw, lh), bg = bl.getContext('2d'); bg.globalCompositeOperation = 'copy'; bg.filter = 'blur(5px) brightness(0.75) contrast(1.9)'; bg.drawImage(lo, 0, 0); bg.filter = 'none';
    mg.globalCompositeOperation = 'screen'; mg.globalAlpha = 0.42; mg.drawImage(bl, 0, 0, hw, hh); mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
    // 4 redrawn in strips: line jitter, the rolling tracking band, head-switching noise at the bottom (frame units, scaled by k)
    // A steady tape is one shifted copy plus a few strips that matter (the tracking band, the head-switching edge, a few
    // jittered lines); a bad one (g > 0.2) is redrawn line by line. Strips are what cost: draw only the ones that move.
    const SH = 4, bandY = mod(TT * 230 + 300, H + 600) - 300, bandH = 90 + g * 260, hs = 46;
    o.fillStyle = '#000'; o.fillRect(0, 0, hw, hh);
    const wob = Math.sin(TT * 2.3) * 2 + Math.sin(TT * 7.1) * 1.2, steady = g <= 0.2;
    if (steady) o.drawImage(mid, wob * k, 0, hw, hh);
    for (let y = 0; y < H; y += SH) {
      const inBand = Math.abs(y - bandY) < bandH / 2, edge = y > H - hs, jit = R.f() < 0.06;
      if (steady && !inBand && !edge && !jit) continue;
      let dx = wob + R.n(steady ? 2.5 : 1.2) + Math.sin(y * 0.013 + TT * 31) * g * 30 + (g > 0.3 ? R.n(g * 50) * (R.f() < g * 0.3 ? 1 : 0) : 0);
      if (inBand) dx += R.n(10 + g * 70) + 14;
      if (edge) dx += (y - (H - hs)) / hs * 46 + R.n(10);
      o.drawImage(mid, 0, y * k, hw, SH * k, dx * k, y * k, hw, SH * k);
      if (inBand && R.f() < 0.5) { o.fillStyle = `rgba(255,255,255,${R.r(0.04, 0.16 + g * 0.3)})`; o.fillRect(0, y * k, hw, SH * k); }
    }
    // 5 lifted blacks and a cast
    o.globalCompositeOperation = 'lighten'; o.fillStyle = VH.lift; o.fillRect(0, 0, hw, hh);
    const gr = typeof pieceGrade === 'function' ? pieceGrade(TT) : null;
    o.globalCompositeOperation = 'soft-light'; o.fillStyle = 'rgba(70,110,90,0.35)'; o.fillRect(0, 0, hw, hh);
    if (gr && gr.amt > 0) { o.globalCompositeOperation = 'multiply'; o.fillStyle = vhA(gr.tint, gr.amt); o.fillRect(0, 0, hw, hh); }
    // 6 snow and dropouts
    o.globalCompositeOperation = 'overlay'; o.imageSmoothingEnabled = false;
    o.drawImage(vhNoise(Math.round(W / 4), Math.round(H / 4), hash('nz', F), 0.22 + g * 0.5), 0, 0, hw, hh); o.imageSmoothingEnabled = true;
    o.globalCompositeOperation = 'source-over';
    const nd = 4 + Math.round(g * 60);
    for (let i = 0; i < nd; i++) { const y = R.r(0, H), x = R.r(-100, W), w = R.r(20, 160 + g * 500); o.fillStyle = `rgba(250,250,255,${R.r(0.35, 0.9)})`; o.fillRect(x * k, y * k, w * k, Math.max(1, R.r(1.5, 4) * k)); }
    o.fillStyle = 'rgba(230,230,240,0.18)'; o.fillRect(0, (H - hs + R.r(0, 10)) * k, hw, Math.max(1, 5 * k));   // the head-switching line
  }
  // 7 back to full resolution: one smooth upscale, then scanlines, the vignette and the OSD
  ctx.globalCompositeOperation = 'copy'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(out, 0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.28; ctx.fillStyle = vhScanPattern(ctx); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.58);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const osd = typeof pieceOSD === 'function' ? pieceOSD(TT) : { tl: 'PLAY ▶', tr: 'SP', bl: null, br: null };
  const box = vhOSDBox(osd.layout);
  if (osd.tl) vhOSDText(osd.tl, box.l, box.top, box.fs);
  if (osd.tr) vhOSDText(osd.tr, box.r, box.top, box.fs, 'right');
  if (osd.bl) vhOSDText(osd.bl, box.l, box.bot - box.fs * 1.25, box.fs);
  if (osd.br) vhOSDText(osd.br, box.l, box.bot, box.fs);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks
// =====================================================================
const STYLE = {
  name: 'vhs',
  paper: '#050506',
  backdrop(c) { fillAll(c); },
  window(P, key, src) {   // a morph seen through a hard, dark iris (a camcorder's shutter)
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0, W, H); ctx.restore();
    ctx.save(); trace(P, true); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.stroke(); ctx.restore();
  },
  blob(P, c) { trace(P, true); ctx.fillStyle = c; ctx.fill(); },
  hero(x, y, r) {   // two glints in the dark
    for (const s of [-1, 1]) { const g = ctx.createRadialGradient(x + s * r * 0.35, y, 0, x + s * r * 0.35, y, r * 0.22); g.addColorStop(0, 'rgba(255,220,150,0.95)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + s * r * 0.35, y, r * 0.22, 0, TAU); ctx.fill(); }
    SPARK_AT = toScreen(x, y);
  },
  heroColor: '#e0a23a',
  post() { vhTape(); },
  ones: true,
  scale: 0.5,   // the scene draws at half resolution: the tape keeps less than that (see vhTape)
};
