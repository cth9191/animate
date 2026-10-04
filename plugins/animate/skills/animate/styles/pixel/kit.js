// =====================================================================
//  styles/pixel/kit.js — pixel art. Every picture is drawn at a low internal resolution with whole-pixel
//  primitives in a limited palette, then scaled up nearest-neighbour to 1080x1920. Resolution can tell
//  time: a coarse early era, a sharper later one.  Built on kit/core.js (RNG, EZ, geometry, TT/B/E0/DEFER).
//  Needs from the piece head: W, H, CX, BEAT.  Optional from the piece (src/bridges.js):
//    ERA_RES  = [[w, h], ...]   each era's internal resolution (an integer divisor of W x H); the STYLE hooks
//                               use it for the pixel grid of morph windows, the morphing blob and post FX
//    ERA_POST = [{ scan, lcd, vignette }, ...]   per-era screen effects drawn by STYLE.post
//  Inside lowres(res, draw) coordinates are LOW-RES PIXELS (0..w, 0..h) and every primitive snaps to them.
//  No anti-aliasing anywhere: rects only, never arcs, strokes or text from fonts.
// =====================================================================

// ---- palettes: one per era; a scene uses only its era's colours (lowres({ fx: { pal } }) can enforce it)
const PAL16 = {
  ink: '#14101e', night: '#232a4e', blue: '#2f5fa8', sky: '#5fb4e6', ice: '#a8f0f0', white: '#f4f0e6',
  grey: '#8a8ca0', slate: '#4a4e66', green: '#2e8a4a', lime: '#8ad04a', yellow: '#f6d64a', orange: '#f08a32',
  red: '#d83a3a', pink: '#f07aa8', purple: '#6a3a8a', brown: '#7a4a2a',
};
const HANDHELD = ['#0f2a14', '#306a2e', '#8aac2a', '#c4d870'];   // 4 greens, darkest to lightest
const PAL4 = HANDHELD;
const PIX_UI = { light: PAL16.white, dark: PAL16.ink, shadow: '#07060c' };   // window rims

// ---- colour helpers (for hooks that are handed mixed colours by the renderer)
function rgbOf(c) {
  if (c[0] === '#') { const n = c.length === 4 ? c.slice(1).split('').map((h) => h + h).join('') : c.slice(1, 7); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); }
  const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
const hexOf = (v) => '#' + v.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
const posterize = (c, levels = 8) => hexOf(rgbOf(c).map((v) => Math.round(v / 255 * (levels - 1)) * 255 / (levels - 1)));
const shadeC = (c, k) => hexOf(rgbOf(c).map((v) => (k < 0 ? v * (1 + k) : v + (255 - v) * k)));   // k -1..1: toward black / white
function nearestC(c, pal) {
  const a = rgbOf(c); let best = pal[0], bd = 1e9;
  for (const p of pal) { const b = rgbOf(p), d = (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = p; } }
  return best;
}

// the two palette colours (and the mix 0..1 between them) that best make colour c when dithered
const PIX_ALL = [...Object.values(PAL16), ...HANDHELD];
function ditherPair(c, pal = PIX_ALL) {
  const v = rgbOf(c), P = pal.map(rgbOf); let best = [pal[0], pal[0], 0], be = 1e18;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
    const a = P[i], b = P[j], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    const t = L ? clamp(((v[0] - a[0]) * d[0] + (v[1] - a[1]) * d[1] + (v[2] - a[2]) * d[2]) / L) : 0;
    const e = (a[0] + d[0] * t - v[0]) ** 2 + (a[1] + d[1] * t - v[1]) ** 2 + (a[2] + d[2] * t - v[2]) ** 2 + (L ? t * (1 - t) * L * 0.15 : 0);   // prefer near neighbours
    if (e < be) { be = e; best = [pal[i], pal[j], t]; }
  }
  return best;
}

// ---- ordered dithering: a 4x4 Bayer matrix, thresholds in (0, 1)
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER4[((Math.round(y) & 3) << 2) | (Math.round(x) & 3)];

// ---------------------------------------------------------------------
//  the low-res pass. PIX maps pixel coords to the canvas being drawn: canvas = z * p + t (then x s to screen)
// ---------------------------------------------------------------------
const PIX = { z: 1, tx: 0, ty: 0, s: 1, w: W, h: H, depth: 0 };
const PIX_OFF = new Map();
function pixCanvas(w, h, tag) {   // cached offscreen canvases, cleared and fully redrawn on every use
  const k = w + 'x' + h + '@' + tag;
  if (!PIX_OFF.has(k)) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); PIX_OFF.set(k, c); }
  return PIX_OFF.get(k);
}
const resOf = (res) => (Array.isArray(res) ? res : [Math.round(W / res), Math.round(H / res)]);   // [w, h] or a pixel size
// draw(w, h) runs with the global ctx swapped to a w x h canvas; the result is scaled up with hard pixels onto
// the real ctx (in screen space). A camera on the real ctx (pieceCam) is applied in pixel space, snapped:
// pans land on whole pixels; keep zoom at 1 (or whole numbers) so pixels stay square.
// o.fx: { pal: [...], posterize, noise, noiseAmt, blocks, bs, flicker, blur } (see pixFX); o.al: opacity
function lowres(res, draw, o = {}) {
  const [w, h] = resOf(res), s = W / w, m = ctx.getTransform(), saved = ctx, keep = { ...PIX };
  const c = pixCanvas(w, h, keep.depth), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h);
  Object.assign(PIX, { z: m.a, tx: Math.round(m.e / s), ty: Math.round(m.f / s), s, w, h, depth: keep.depth + 1 });
  ctx = g;
  try { draw(w, h); if (o.fx) pixFX(g, w, h, o.fx); } finally { ctx = saved; Object.assign(PIX, keep); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = o.al ?? 1; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, w, h, 0, 0, W, H); ctx.restore();
}
// draw pixel primitives straight onto the current canvas in screen space, one pixel = G x G screen px
// (the STYLE hooks use this for the hero and the morph; scenes normally use lowres)
function withGrid(G, fn) {
  const keep = { ...PIX };
  Object.assign(PIX, { z: G, tx: 0, ty: 0, s: 1, w: Math.ceil(W / G), h: Math.ceil(H / G) });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  try { fn(); } finally { ctx.restore(); Object.assign(PIX, keep); }
}
const pixToScreen = (x, y) => [(PIX.z * x + PIX.tx) * PIX.s, (PIX.z * y + PIX.ty) * PIX.s];
const pixFromWorld = (x, y, res) => { const [w] = resOf(res), s = W / w; return [Math.floor(x / s), Math.floor(y / s)]; };
const pixToWorld = (x, y, res) => { const [w] = resOf(res), s = W / w; return [(x + 0.5) * s, (y + 0.5) * s]; };   // a pixel's centre

// ---------------------------------------------------------------------
//  primitives (pixel coords; everything rounds to whole pixels; colours are '#hex')
// ---------------------------------------------------------------------
function cellR(x, y, w, h) {   // fill whole pixels [x, x+w) x [y, y+h) in the current fillStyle
  const z = PIX.z, x0 = Math.round(z * x + PIX.tx), y0 = Math.round(z * y + PIX.ty), x1 = Math.round(z * (x + w) + PIX.tx), y1 = Math.round(z * (y + h) + PIX.ty);
  if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function pset(x, y, c) { ctx.fillStyle = c; cellR(Math.round(x), Math.round(y), 1, 1); }
function prect(x, y, w, h, c) { ctx.fillStyle = c; cellR(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function pfill(c) { prect(-PIX.tx - 2, -PIX.ty - 2, PIX.w / PIX.z + 4, PIX.h / PIX.z + 4, c); }   // the whole low-res frame
// Bresenham line, one pixel wide
function pline(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let n = 0; n < 8192; n++) {
    cellR(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
// filled pixel ellipse around the centre pixel (rx = ry = r gives a disc 2r+1 wide); o.ring = rim thickness only
function pellipse(cx, cy, rx, ry, c, o = {}) {
  cx = Math.round(cx); cy = Math.round(cy); rx = Math.max(0, Math.round(rx)); ry = Math.max(0, Math.round(ry));
  ctx.fillStyle = c;
  const A = rx + 0.5, Bq = ry + 0.5, t = o.ring ?? 0;
  for (let j = -ry; j <= ry; j++) {
    const hw = Math.floor(A * Math.sqrt(Math.max(0, 1 - (j / Bq) ** 2)) + 1e-9);
    if (!t) { cellR(cx - hw, cy + j, 2 * hw + 1, 1); continue; }
    const iA = A - t, iB = Bq - t, inner = iA > 0 && iB > 0 && Math.abs(j) < iB ? Math.floor(iA * Math.sqrt(Math.max(0, 1 - (j / iB) ** 2)) + 1e-9) : -1;
    if (inner < 0) cellR(cx - hw, cy + j, 2 * hw + 1, 1);
    else { cellR(cx - hw, cy + j, hw - inner, 1); cellR(cx + inner + 1, cy + j, hw - inner, 1); }
  }
}
const pcircle = (cx, cy, r, c, o) => pellipse(cx, cy, r, r, c, o);
// rows y0..y1-1 of polygon P (pixel coords): spans [i0, i1) of pixels whose centres are inside (even-odd)
function polySpans(P, y0, y1) {
  const rows = [], n = P.length;
  for (let j = y0; j < y1; j++) {
    const yc = j + 0.5, xs = [];
    for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
    xs.sort((p, q) => p - q);
    const sp = [];
    for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.ceil(xs[k] - 0.5), i1 = Math.ceil(xs[k + 1] - 0.5); if (i1 > i0) sp.push([i0, i1]); }
    rows.push(sp);
  }
  return rows;
}
// filled polygon, rasterised by pixel centres (hard stepped edges)
function ppoly(P, c) {
  const bb = bbox(P), y0 = Math.floor(bb.y0), y1 = Math.ceil(bb.y1) + 1;
  ctx.fillStyle = c;
  polySpans(P, y0, y1).forEach((sp, k) => sp.forEach(([a, b]) => cellR(a, y0 + k, b - a, 1)));
}
// ordered dither: cB where f(x, y) (0..1) beats the Bayer threshold, else cA (cA null = leave what is there)
function pdither(x, y, w, h, cA, cB, f) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (cA) prect(x, y, w, h, cA);
  ctx.fillStyle = cB;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (f(i, j) > bayer(i, j)) cellR(i, j, 1, 1);
}
// a dithered gradient through cols, top to bottom (o.horiz: left to right); o.ease(u) reshapes it
function pgrad(x, y, w, h, cols, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const n = cols.length - 1, L = o.horiz ? w : h;
  for (let k = 0; k < L; k++) {
    const u = (o.ease || ((v) => v))(L > 1 ? k / (L - 1) : 0) * n, a = Math.min(n, Math.floor(u)), f = u - a, b = Math.min(n, a + 1);
    ctx.fillStyle = cols[a];
    if (o.horiz) cellR(x + k, y, 1, h); else cellR(x, y + k, w, 1);
    if (f <= 0 || a === b) continue;
    ctx.fillStyle = cols[b];
    if (o.horiz) { for (let j = y; j < y + h; j++) if (f > bayer(x + k, j)) cellR(x + k, j, 1, 1); }
    else for (let i = x; i < x + w; i++) if (f > bayer(i, y + k)) cellR(i, y + k, 1, 1);
  }
}
// a dithered halo: density amt at radius r0 falling to 0 at r1 (moons, lamps, coins)
function pglow(cx, cy, r0, r1, c, amt = 0.5) {
  cx = Math.round(cx); cy = Math.round(cy); ctx.fillStyle = c;
  const R = Math.ceil(r1);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const d = Math.hypot(i, j); if (d < r0 || d > r1) continue;
    if (amt * (1 - (d - r0) / (r1 - r0)) > bayer(cx + i, cy + j)) cellR(cx + i, cy + j, 1, 1);
  }
}

// ---------------------------------------------------------------------
//  era effects on the low-res picture (keyed on B, so they boil on 2s and repeat exactly)
//    pal: [..]      snap every pixel to the nearest palette colour (enforces the era's palette)
//    posterize: n   n levels per channel          noise: count, noiseAmt   colour noise on random pixels
//    blocks: frac   JPEG-ish: frac of bs x bs blocks flattened to their mean    flicker: amt   brightness jitter
//    blur: px       soft early-generative look (breaks the palette; use for one era only)
// ---------------------------------------------------------------------
function pixFX(g, w, h, fx) {
  if (fx.blur) {
    const t = pixCanvas(w, h, 'fx'), tg = t.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, w, h); tg.drawImage(g.canvas, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.filter = `blur(${fx.blur}px)`; g.drawImage(t, 0, 0); g.restore();
  }
  if (!(fx.pal || fx.posterize || fx.blocks || fx.flicker || fx.noise)) return;
  const im = g.getImageData(0, 0, w, h), d = im.data;
  if (fx.flicker) { const k = 1 + RNG('pxflk', B).n(fx.flicker); for (let i = 0; i < d.length; i += 4) { d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } }
  if (fx.blocks) {
    const bs = fx.bs ?? 4;
    for (let by = 0; by < h; by += bs) for (let bx = 0; bx < w; bx += bs) {
      if (RNG('pxblk', bx, by, B).f() >= fx.blocks) continue;
      const m = [0, 0, 0]; let n = 0;
      for (let y = by; y < Math.min(h, by + bs); y++) for (let x = bx; x < Math.min(w, bx + bs); x++) { const i = (y * w + x) * 4; m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; n++; }
      for (let y = by; y < Math.min(h, by + bs); y++) for (let x = bx; x < Math.min(w, bx + bs); x++) { const i = (y * w + x) * 4; d[i] = m[0] / n; d[i + 1] = m[1] / n; d[i + 2] = m[2] / n; }
    }
  }
  if (fx.noise) {
    const R = RNG('pxnoise', w, B), a = fx.noiseAmt ?? 40;
    for (let k = 0; k < fx.noise; k++) { const i = R.i(0, w * h - 1) * 4, v = R.n(a); if (!d[i + 3]) continue; d[i] += v + R.n(a * 0.5); d[i + 1] += v + R.n(a * 0.5); d[i + 2] += v + R.n(a * 0.5); }
  }
  if (fx.posterize) { const L = fx.posterize - 1; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] / 255 * L) * 255 / L; }
  if (fx.pal) {
    const pal = (Array.isArray(fx.pal) ? fx.pal : Object.values(fx.pal)).map(rgbOf), memo = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      let p = memo.get(key);
      if (!p) { let bd = 1e9; for (const q of pal) { const e = (d[i] - q[0]) ** 2 * 0.3 + (d[i + 1] - q[1]) ** 2 * 0.59 + (d[i + 2] - q[2]) ** 2 * 0.11; if (e < bd) { bd = e; p = q; } } memo.set(key, p); }
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
}

// ---------------------------------------------------------------------
//  the bitmap font: 5x7 glyphs, one number per row (bit 16 = left column).
//  A-Z, 0-9 and  . , ! ? : - + / ' " > < * = ( ) # % _ $   (lower case is drawn as upper case)
// ---------------------------------------------------------------------
const FONT5 = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16],
  "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2],
  '*': [0, 4, 21, 14, 21, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '#': [10, 10, 31, 10, 31, 10, 10], '%': [24, 25, 2, 4, 8, 19, 3], _: [0, 0, 0, 0, 0, 0, 31], $: [4, 15, 20, 14, 5, 30, 4],
};
const pixTextW = (str, sc = 1) => Math.max(0, String(str).length * 6 * sc - sc);
// pixel text, top-left at (x, y) in pixels; 6 px advance per glyph at scale 1, 7 px tall.
// o: scale (whole number), count (typing reveal: glyphs shown), align 'left' | 'center' | 'right', shadow '#hex',
//    cursor (true or '#hex': a blinking block after the last typed glyph while typing)
function pixText(str, x, y, c, o = {}) {
  const sc = Math.max(1, Math.round(o.scale ?? 1)), s = String(str).toUpperCase(), n = clamp(Math.floor(o.count ?? s.length), 0, s.length), tw = pixTextW(s, sc);
  const x0 = Math.round(x - (o.align === 'center' ? Math.floor(tw / 2) : o.align === 'right' ? tw : 0)), y0 = Math.round(y);
  const draw = (ox, oy, col) => {
    ctx.fillStyle = col;
    for (let k = 0; k < n; k++) {
      const gl = FONT5[s[k]] || FONT5[' '];
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let b = 0; b < 5; b++) {
          if (!(bits & (16 >> b))) continue;
          let e = b; while (e + 1 < 5 && bits & (16 >> (e + 1))) e++;   // one rect per run of lit pixels
          cellR(ox + k * 6 * sc + b * sc, oy + r * sc, (e - b + 1) * sc, sc); b = e;
        }
      }
    }
  };
  if (o.shadow) draw(x0 + sc, y0 + sc, o.shadow);
  draw(x0, y0, c);
  if (o.cursor && n < s.length && B % 4 < 2) prect(x0 + n * 6 * sc, y0, 5 * sc, 7 * sc, o.cursor === true ? c : o.cursor);
  return tw;
}

// ---------------------------------------------------------------------
//  sprites from string arrays: rows like '..XX..', map { X: '#hex' }; '.' and ' ' are clear
//  o: flip (mirror), scale (whole number), anchor 'tl' (default) | 'c' | 'bc' (bottom centre: stand it on a floor)
// ---------------------------------------------------------------------
function sprite(rows, map, x, y, o = {}) {
  const sc = Math.max(1, Math.round(o.scale ?? 1)), w = rows[0].length, h = rows.length;
  let x0 = Math.round(x), y0 = Math.round(y);
  if (o.anchor === 'c') { x0 -= Math.floor(w * sc / 2); y0 -= Math.floor(h * sc / 2); }
  else if (o.anchor === 'bc') { x0 -= Math.floor(w * sc / 2); y0 -= h * sc; }
  for (let j = 0; j < h; j++) {
    const row = rows[j], at = (i) => row[o.flip ? w - 1 - i : i];
    for (let i = 0; i < w;) {
      const ch = at(i); let k = i + 1;
      while (k < w && at(k) === ch) k++;
      const col = map[ch];
      if (col) { ctx.fillStyle = col; cellR(x0 + i * sc, y0 + j * sc, (k - i) * sc, sc); }
      i = k;
    }
  }
  return [w * sc, h * sc];
}
// a few stock sprites (map 'a' = main colour, 'b' = accent)
const SPR = {
  spark: ['..a..', '..a..', 'aabaa', '..a..', '..a..'],
  twinkle: ['.a.', 'aba', '.a.'],
  heart: ['.aa.aa.', 'abaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'],
  note: ['..aaa', '..a.a', '..a..', 'aaa..', 'aaa..'],
};

// ---------------------------------------------------------------------
//  the hero: a round critter with ears, feet and big eyes, rasterised at any size (so it looks native to
//  every era's resolution). 2-frame idle: squash on every other beat, ears flick, feet stay planted.
//  (x, y) = body centre in pixels, r = body radius in pixels (>= 3). Sets SPARK_AT (screen coords).
//  o: pal { ink, body, light, dark, eye, pupil, cheek }, mood 'smile' | 'wow' | 'happy', look [dx, dy] (-1..1),
//     hop (pixels up), frame (0/1, default: flips on the beat), blink, key
// ---------------------------------------------------------------------
const HERO_PAL = { ink: PAL16.ink, body: PAL16.orange, light: PAL16.yellow, dark: PAL16.red, eye: PAL16.white, pupil: PAL16.ink, cheek: PAL16.pink };
const HERO_HH = { ink: HANDHELD[0], body: HANDHELD[2], light: HANDHELD[3], dark: HANDHELD[1], eye: HANDHELD[3], pupil: HANDHELD[0] };
function pixHero(x, y, r, o = {}) {
  const pal = o.pal || HERO_PAL, key = o.key ?? 'hero', ink = pal.ink;
  r = Math.max(3, Math.round(r));
  const fr = o.frame ?? (Math.floor(TT / BEAT + 1e-6) % 2);
  const rx = r + fr, ry = r - fr, cx = Math.round(x), cy = Math.round(y) - Math.round(o.hop ?? 0) + fr;
  const inside = (i, j) => (i / (rx + 0.5)) ** 2 + (j / (ry + 0.5)) ** 2 <= 1;
  // ears: little stepped triangles, drawn first so the head covers their base
  const eh = Math.max(1, Math.round(r * 0.38)), ex = Math.round(rx * 0.5) + fr, top = cy - ry;
  for (const s of [-1, 1]) for (let k = 0; k <= eh; k++) {
    const wk = eh + 1 - k, x0 = cx + s * ex - Math.floor(wk / 2);
    prect(x0, top - k, wk, 1, ink);
    if (wk >= 3 && k < eh) prect(x0 + 1, top - k, wk - 2, 1, k === 0 ? pal.body : pal.light);
  }
  // body: ink rim, light top-left, dark bottom-right, dithered between
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    if (!inside(i, j)) continue;
    let col;
    if (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) col = ink;
    else {
      const u = -i / rx - j / ry, b = bayer(i + 64, j + 64);
      col = clamp((u - 0.6) * 1.5) > b ? pal.light : clamp((-u - 0.45) * 1.4) > b ? pal.dark : pal.body;
    }
    ctx.fillStyle = col; cellR(cx + i, cy + j, 1, 1);
  }
  // feet (planted: they ignore the squash)
  const fw = Math.max(2, Math.round(r / 3)), fh = Math.max(1, Math.round(r / 8)), fy = Math.round(y) - Math.round(o.hop ?? 0) + r + 1;
  for (const s of [-1, 1]) prect(cx + s * Math.round(r * 0.45) - Math.floor(fw / 2), fy, fw, fh, ink);
  // eyes
  const es = Math.max(1, Math.round(r / 5)), ew = es + 1, wow = o.mood === 'wow', ehh = es + 1 + (wow ? 1 : 0);
  const eo = Math.max(2, Math.round(rx * 0.42)), ey = cy - Math.round(ry * 0.12);
  const [lx, ly] = o.look || [0, 0], blink = o.blink || (B + key.length * 7) % 37 < 2;
  for (const s of [-1, 1]) {
    const ex0 = cx + s * eo - Math.floor(ew / 2), ey0 = ey - Math.floor(ehh / 2);
    if (o.mood === 'happy') { for (let k = -es; k <= es; k++) prect(cx + s * eo + k, ey - (es - Math.abs(k)), 1, 1, ink); continue; }
    if (blink) { prect(ex0, ey0 + ehh - 1, ew, 1, ink); continue; }
    prect(ex0, ey0, ew, ehh, pal.eye);
    const ps = es, px = ex0 + (lx > 0.3 ? ew - ps : lx < -0.3 ? 0 : Math.floor((ew - ps) / 2)), py = ey0 + (ly < -0.3 ? 0 : ehh - ps);   // pupils rest low; look up lifts them
    prect(px, py, ps, ps, pal.pupil);
  }
  // mouth and cheeks
  const my = cy + Math.max(2, Math.round(ry * 0.38)), mw = Math.max(1, Math.round(r / 6));
  if (wow) prect(cx - Math.floor(mw / 2), my, mw + 1, mw + 1, ink);
  else if (o.mood === 'happy') { prect(cx - mw, my, 2 * mw + 1, 1, ink); prect(cx - mw - 1, my - 1, 1, 1, ink); prect(cx + mw + 1, my - 1, 1, 1, ink); }
  else prect(cx - Math.floor(mw / 2), my, mw + 1, 1, ink);
  if (pal.cheek && r >= 6) for (const s of [-1, 1]) prect(cx + s * (eo + es) - (s < 0 ? 1 : 0), my - 1, 2, 1, pal.cheek);
  SPARK_AT = pixToScreen(cx, cy);
  return { top: top - eh, foot: fy + fh };
}
// a speech bubble with pixel text (or one glyph, like '!'), tail pointing down at (x, y)
function pixBubble(str, x, y, o = {}) {
  const tw = pixTextW(str), w = tw + 6, h = 13, x0 = Math.round(x - Math.floor(w / 2)), y0 = Math.round(y) - h - 3;
  pixBox(x0, y0, w, h, o);
  prect(Math.round(x) - 1, y0 + h - 1, 3, 2, o.bg ?? PAL16.white); prect(Math.round(x), y0 + h + 1, 1, 2, o.edge ?? PAL16.ink);
  prect(Math.round(x) - 2, y0 + h - 1, 1, 2, o.edge ?? PAL16.ink); prect(Math.round(x) + 2, y0 + h - 1, 1, 2, o.edge ?? PAL16.ink);
  pixText(str, x0 + 3, y0 + 3, o.fg ?? PAL16.ink, { count: o.count });
}
// a UI panel: 1-pixel border with clipped (rounded) corners, fill, optional drop shadow one pixel down-right
function pixBox(x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y);
  if (o.shadow) { prect(x + 2, y + 1, w - 2, h, o.shadow); prect(x + 1, y + 2, w, h - 2, o.shadow); }
  const e = o.edge ?? PAL16.ink;
  prect(x + 1, y, w - 2, h, e); prect(x, y + 1, w, h - 2, e);
  prect(x + 1, y + 1, w - 2, h - 2, o.bg ?? PAL16.white);
}

// ---------------------------------------------------------------------
//  captions and tags: drawn after the camera (DEFER), in the era's own resolution, in the pixel font
//  pixCaption(str, o): a panel at caption height that types itself on (E0 + 0.45 over 0.6 s)
//  pixTag(str, o): a level/year tag top-left that pops in at E0 + 0.2 (one boil at double size, then 1x)
//  pixOverlay(draw): any other screen-fixed pixel layer (a HUD, a score), in the current era's resolution
//  o: res ([w, h], default the current lowres), fg, bg, edge, shadow, scale, x / cx (screen), y (screen), at, dur
// ---------------------------------------------------------------------
const pixDefer = (f) => { if (DEFER) DEFER.push(f); else f(); };
const curRes = (o) => o.res ?? (PIX.depth > 0 ? [PIX.w, PIX.h] : resOf(8));
function pixCaption(str, o = {}) {
  const res = curRes(o);
  pixDefer(() => {
    if (TT < E0 + (o.at ?? 0.45)) return;
    lowres(res, (w) => {
      const s = W / w, sc = o.scale ?? 1, tw = pixTextW(str, sc), bw = tw + 6 * sc, bh = 7 * sc + 6 * sc;
      const x0 = Math.round((o.cx ?? CX) / s - bw / 2), y0 = Math.round((o.y ?? 1440) / s - bh / 2);
      pixBox(x0, y0, bw, bh, { bg: o.bg ?? PAL16.ink, edge: o.edge ?? PAL16.white, shadow: o.shadow });
      const n = Math.floor(ev(E0 + (o.at ?? 0.45), o.dur ?? 0.6) * str.length + 1e-6);
      pixText(str, x0 + 3 * sc, y0 + 3 * sc, o.fg ?? PAL16.white, { scale: sc, count: n, cursor: o.cursor ?? true });
    });
  });
}
function pixTag(str, o = {}) {
  const res = curRes(o);
  pixDefer(() => {
    const t0 = E0 + (o.at ?? 0.2); if (TT < t0) return;
    lowres(res, (w) => {
      const s = W / w, sc = (o.scale ?? 1) * (TT < t0 + 0.08 ? 2 : 1), bw = pixTextW(str, sc) + 6 * sc, bh = 13 * sc;
      const x0 = Math.round((o.x ?? 70) / s), y0 = Math.round((o.y ?? 290) / s);
      pixBox(x0, y0, bw, bh, { bg: o.bg ?? PAL16.ink, edge: o.edge ?? PAL16.yellow, shadow: o.shadow });
      pixText(str, x0 + 3 * sc, y0 + 3 * sc, o.fg ?? PAL16.yellow, { scale: sc });
    });
  });
}
function pixOverlay(draw, o = {}) { const res = curRes(o); pixDefer(() => lowres(res, draw)); }

// ---------------------------------------------------------------------
//  the grid the hooks use: the current era's pixel size (from ERA_RES), stepped finer/coarser through a morph
// ---------------------------------------------------------------------
const PIX_GRIDS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40];
function gridOfEra(e) { return typeof ERA_RES !== 'undefined' && ERA_RES[e] ? W / resOf(ERA_RES[e])[0] : 8; }
const eraLook = (e) => (typeof ERA_POST !== 'undefined' && ERA_POST[Math.max(0, e)]) || null;
// an era's palette (ERA_POST[e].pal; default every kit colour): what the backdrop and the blob may dither with.
// The paper itself is snapped to it too, so a handheld era fades to its own darkest green, not to the ink.
function eraPal(...es) { const out = []; for (const e of es) { const p = eraLook(e)?.pal; out.push(...(p ? (Array.isArray(p) ? p : Object.values(p)) : PIX_ALL)); } return out; }
function gridAt(t) {
  const br = typeof BRIDGES !== 'undefined' ? BRIDGES.find((r) => Math.abs(t - r.tc) < 0.2 + 1e-6) : null;
  if (!br) return gridOfEra(Math.max(0, eraAt(t)));
  const a = gridOfEra(eraAt(br.tc - 0.01)), b = gridOfEra(eraAt(br.tc + 0.01)), want = a * (b / a) ** EZ.io(seg(t, br.tc - 0.2, br.tc + 0.2));
  return PIX_GRIDS.reduce((best, v) => (Math.abs(Math.log(v / want)) < Math.abs(Math.log(best / want)) ? v : best));
}
// outline P (screen coords) rasterised on a G-px grid: { M (1 = inside), cols, rows }
function gridMask(P, G) {
  const cols = Math.ceil(W / G), rows = Math.ceil(H / G), M = new Uint8Array(cols * rows);
  const Q = P.map(([x, y]) => [x / G, y / G]), bb = bbox(Q), y0 = clamp(Math.floor(bb.y0), 0, rows), y1 = clamp(Math.ceil(bb.y1) + 1, 0, rows);
  polySpans(Q, y0, y1).forEach((sp, k) => sp.forEach(([a, b]) => { for (let i = Math.max(0, a); i < Math.min(cols, b); i++) M[(y0 + k) * cols + i] = 1; }));
  return { M, cols, rows };
}
function maskRing(m) {   // the cells just outside the mask (8-neighbour): a stepped one-pixel rim
  const { M, cols, rows } = m, O = new Uint8Array(M.length);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (M[j * cols + i]) continue;
    let hit = 0;
    for (let v = -1; v <= 1 && !hit; v++) for (let u = -1; u <= 1; u++) { const x = i + u, y = j + v; if (x >= 0 && y >= 0 && x < cols && y < rows && M[y * cols + x]) { hit = 1; break; } }
    O[j * cols + i] = hit;
  }
  return { M: O, cols, rows };
}
const maskOr = (a, b) => ({ M: a.M.map((v, i) => v | b.M[i]), cols: a.cols, rows: a.rows });
function maskPath(m, G, dx = 0, dy = 0) {   // one rect per run of cells
  const { M, cols, rows } = m; ctx.beginPath();
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols;) {
    if (!M[j * cols + i]) { i++; continue; }
    let k = i + 1; while (k < cols && M[j * cols + k]) k++;
    ctx.rect((i + dx) * G, (j + dy) * G, (k - i) * G, G); i = k;
  }
}

// ---------------------------------------------------------------------
//  screen effects after every frame (STYLE.post), on the era's grid: o = { scan, lcd, vignette } (alphas); o.rim = [light, dark]
//  sets the morph window's rim colours for that era (default PIX_UI: white and ink); o.pal = the era's palette, which
//  the backdrop and the morphing blob dither with (default: every kit palette)
//    scan: the bottom third of every pixel row darkened (a CRT)      lcd: a thin gap between pixels (a handheld)
//    vignette: dithered, stepped darkening into the corners (a curved tube)
// ---------------------------------------------------------------------
function pixPost(o, G) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.lcd) {
    const lw = Math.max(1, Math.round(G / 8)); ctx.fillStyle = `rgba(0,0,0,${o.lcd})`; ctx.beginPath();
    for (let x = G - lw; x < W; x += G) ctx.rect(x, 0, lw, H);
    for (let y = G - lw; y < H; y += G) ctx.rect(0, y, W, lw);
    ctx.fill();
  }
  if (o.scan) {
    const sh = Math.max(1, Math.round(G / 3)); ctx.fillStyle = `rgba(0,0,0,${o.scan})`; ctx.beginPath();
    for (let y = G - sh; y < H; y += G) ctx.rect(0, y, W, sh);
    ctx.fill();
  }
  if (o.vignette) {
    const cols = Math.ceil(W / G), rows = Math.ceil(H / G); ctx.fillStyle = `rgba(0,0,0,${o.vignette})`; ctx.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const dx = (i + 0.5) / cols * 2 - 1, dy = (j + 0.5) / rows * 2 - 1, v = clamp(((dx ** 4 + dy ** 4) ** 0.25 - 0.86) / 0.16);
      if (v > bayer(i, j)) ctx.rect(i * G, j * G, G, G);
    }
    ctx.fill();
  }
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'pixel',
  paper: PAL16.ink,   // a dark pixel ground: morphs happen on a blank screen
  backdrop(c) {   // colour c as an ordered dither of the two palette colours that mix closest to it, on the era's grid
    const [a, b, t] = ditherPair(c, eraPal(eraAt(TT))), G = gridAt(TT), cols = Math.ceil(W / G), rows = Math.ceil(H / G);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
    if (t > 0) { ctx.fillStyle = b; ctx.beginPath(); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (t > bayer(i, j)) ctx.rect(i * G, j * G, G, G); ctx.fill(); }
    ctx.restore();
  },
  window(P, key, src) {   // the old/new world seen through P rasterised on the era's grid: stepped edge, 1-pixel rims, shadow
    const G = gridAt(TT), m = gridMask(P, G), r1 = maskRing(m), u1 = maskOr(m, r1), r2 = maskRing(u1);
    const eo = eraLook(eraAt(TT)), [rl, rd] = (eo && eo.rim) || [PIX_UI.light, PIX_UI.dark];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PIX_UI.shadow; maskPath(maskOr(u1, r2), G, 1, 1); ctx.fill();
    ctx.fillStyle = rd; maskPath(r2, G); ctx.fill();
    ctx.fillStyle = rl; maskPath(r1, G); ctx.fill();
    maskPath(m, G); ctx.clip(); ctx.drawImage(src, 0, 0);
    ctx.restore();
  },
  blob(P, c, key) {   // the morphing shape as chunky pixels: the grid steps from one era's resolution to the next
    const G = gridAt(TT), m = gridMask(P, G), { M, cols, rows } = m;
    const br = typeof BRIDGES !== 'undefined' ? BRIDGES.find((r) => Math.abs(TT - r.tc) < 0.2 + 1e-6) : null, bp = br ? eraPal(eraAt(br.tc - 0.01), eraAt(br.tc + 0.01)) : eraPal(eraAt(TT));
    let sx = 0, sy = 0, n = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (M[j * cols + i]) { sx += i; sy += j; n++; }
    if (!n) return;
    const cx = sx / n, cy = sy / n, rr = Math.sqrt(n / Math.PI), [ca, cb, ct] = ditherPair(c, bp), lt = nearestC(shadeC(c, 0.45), bp), dk = nearestC(shadeC(c, -0.4), bp);
    const groups = { [ca]: [], [cb]: [], [lt]: [], [dk]: [] };   // palette colours only: the mix is dithered
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (!M[j * cols + i]) continue;
      const u = (-(i - cx) - (j - cy)) / rr, b = bayer(i, j);
      groups[clamp((u - 0.55) * 1.4) > b ? lt : clamp((-u - 0.5) * 1.4) > b ? dk : ct > bayer(i + 2, j + 1) ? cb : ca].push([i, j]);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PIX_UI.dark; maskPath(maskRing(m), G); ctx.fill();
    for (const col in groups) { ctx.fillStyle = col; ctx.beginPath(); for (const [i, j] of groups[col]) ctx.rect(i * G, j * G, G, G); ctx.fill(); }
    ctx.restore();
  },
  hero(x, y, r, o) { const G = gridAt(TT); withGrid(G, () => pixHero(x / G, y / G, (r * 0.6) / G, { ...o, pal: o.pal || HERO_PAL, key: o.key })); },
  heroColor: PAL16.orange,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.6, r * 0.6, 0, 96),
  post() { const o = eraLook(eraAt(TT)); if (o) pixPost(o, gridAt(TT)); },
  ones: false,   // on 2s: TT steps at 12 fps, so a 1-pixel-per-step move is a steady 12 px/s and sprites flip on beats
};
