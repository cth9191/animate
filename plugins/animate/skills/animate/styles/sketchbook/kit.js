// =====================================================================
//  styles/sketchbook/kit.js — graphite and one accent colour on a sketchbook page, hand lettering.
//  On top of kit/core.js (RNG, resample, subPath, trace, bbox, grain, toScreen, fillAll, screen, TT/ev/popS/DEFER/E0).
//  Names here never reuse core's: gline / gpencil (not ink / pencil), writeOn (not subPath), ghatch (not hatch),
//  loopPts / sketchBox (not ellipsePts / rrectPts), handLetter (not handwrite).
//  Needs from the piece head: HAND (hand font stack), CX (caption centre x). The marker stack is SK_MARKER below.
//
//  THE PAGE   one warm page (dot grid or ruled, tooth, fibres, smudges, a coffee ring, spiral binding), built once
//             from a seeded RNG and cached; the page is the world, so it moves with the camera.
//  THE HAND   every line is redrawn on 2s: wobble phases reseed per boil (B); structure (where a scribble goes)
//             is seeded by key and never reseeds, only the tremor does.
//  THE INKS   graphite = rough, provisional, the mess. Ink = what is settled. ONE accent colour (terracotta) = the hero.
//             Highlighter yellow marks what to read; red marker is for a title underline or a stamp, once.
// =====================================================================
const SK = {
  paper: '#f2ead8', ink: '#2a2420', graph: '#6f6a63', graphL: '#9a948b',
  terra: '#d97757', terraD: '#b85c3f', cream: '#f7ecd9', sheet: '#fffdf6',
  hilite: '#f7d64a', red: '#e0483a', green: '#4f9d5d', blue: '#3b5c8c',
  pink: '#ef9aa6', glass: '#9cc6d8', tape: '#efe2b4', wood: '#ecc995', lead: '#3b3632', yellow: '#f1bf2c',
};
const SK_HAND = HAND;
const SK_MARKER = '"Segoe Print", "Marker Felt", "Bradley Hand", "Comic Sans MS", cursive';

// ---------------------------------------------------------------------
//  THE HAND: polylines that boil
// ---------------------------------------------------------------------
// wobble along the normal, phases reseeded every boil step; index-based so the tremor follows the stroke
function gwob(P, key, amp) {
  const R = RNG('gw', key, B), p1 = R.r(0, TAU), p2 = R.r(0, TAU), f1 = 0.28 + R.f() * 0.25, f2 = 0.9 + R.f() * 0.5;
  const n = P.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const o = amp * (0.62 * Math.sin(i * f1 + p1) + 0.38 * Math.sin(i * f2 + p2));
    out[i] = [P[i][0] + nx * o, P[i][1] + ny * o];
  }
  return out;
}
// write-on: the first `part` of a polyline by length (null when nothing shows yet)
function writeOn(P, part) {
  if (part >= 1) return P;
  if (part <= 0) return null;
  const Q = subPath(P, part);
  return Q.length > 1 ? Q : null;
}
const writeEnd = (P, part) => { const Q = writeOn(resample(P, false, 12), clamp(part)); return Q ? Q[Q.length - 1] : P[0]; };
const closeP = (P) => [...P, P[0]];
// the ink line: one confident stroke and a thin second pass that doesn't quite agree.
// o: w, col, a, key, amp, part (write-on 0..1), step, second, closed
function gline(P, o = {}) {
  const { w = 5, col = SK.ink, a = 1, key = 'gl', amp = 1.7, part = 1, step = 12, second = true } = o;
  const Q = writeOn(resample(o.closed ? closeP(P) : P, false, step), part); if (!Q) return null;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = w; trace(gwob(Q, key, amp), false); ctx.stroke();
  if (second) { ctx.globalAlpha *= 0.55; ctx.lineWidth = w * 0.42; trace(gwob(Q, key + '~', amp * 1.6), false); ctx.stroke(); }
  ctx.restore();
  return Q;
}
// the graphite line: two light passes, the second looser (construction, mess, things not settled yet)
function gpencil(P, o = {}) {
  const { w = 2.4, col = SK.graph, a = 0.8, key = 'gp', amp = 2.4, part = 1, step = 12, passes = 2 } = o;
  const Q = writeOn(resample(o.closed ? closeP(P) : P, false, step), part); if (!Q) return null;
  ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < passes; k++) {
    ctx.globalAlpha = a * (k ? 0.5 : 0.85); ctx.lineWidth = w * (k ? 0.8 : 1);
    trace(gwob(Q, key + ':' + k, amp * (1 + k * 0.6)), false); ctx.stroke();
  }
  ctx.restore();
  return Q;
}
// a hand-drawn loop: overshoots its start and drifts outward a little (over = how far past 360°)
function loopPts(cx, cy, rx, ry, over = 0.07, a0 = -2.2, n = 0) {
  const N = n || Math.max(24, Math.ceil((rx + ry) * 0.35)), P = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = a0 + u * TAU * (1 + over), s = 1 + 0.035 * u * Math.sign(over);
    P.push([cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s]);
  }
  return P;
}
// a box drawn in one go: rounded corners (r), the pen runs a little past the start (over)
function sketchBox(x, y, w, h, r = 0, over = 0.04) {
  const P = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  if (over > 0) P.push([x + r + w * over, y - 1.5]);
  return P;
}
// a flat colour laid down slightly off the line (the colour pass never quite registers with the ink)
function gfill(P, col, o = {}) {
  const { a = 1, off = [4, 3], key = 'gf', amp = 2 } = o;
  const Q = gwob(resample(P, false, 14), key, amp);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.translate(off[0], off[1]); trace(Q, false); ctx.closePath(); ctx.fill(); ctx.restore();
}
function gclip(P) { trace(resample(P, false, 16), false); ctx.closePath(); ctx.clip(); }
// parallel hatching inside a clip that is already set; structure seeded by key, tremor on the boil
function ghatch(x0, y0, x1, y1, o = {}) {
  const { ang = -0.85, gap = 7, col = SK.graph, w = 2, a = 0.5, key = 'gh' } = o;
  const S = RNG('ghs', key), R = RNG('ghj', key, B);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha *= a; ctx.lineCap = 'round';
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2 + 4, ca = Math.cos(ang), sa = Math.sin(ang);
  ctx.beginPath();
  for (let d = -rad; d <= rad; d += gap) {
    const j = R.n(1.1), len = rad * (0.8 + S.f() * 0.25), px = cx - sa * (d + j), py = cy + ca * (d + j);
    ctx.moveTo(px - ca * len, py - sa * len); ctx.lineTo(px + ca * len, py + sa * len);
  }
  ctx.stroke(); ctx.restore();
}
// shade a shape with hatching, leaving a lit circle top-left (the way the page's round things are shaded)
function litHatch(P, o = {}) {
  const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, r = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
  ctx.save(); gclip(P);
  ctx.beginPath(); ctx.rect(bb.x0 - r, bb.y0 - r, 4 * r, 4 * r); ctx.arc(cx - r * (o.lx ?? 0.3), cy - r * (o.ly ?? 0.34), r * (o.lr ?? 1.02), 0, TAU); ctx.clip('evenodd');
  ghatch(bb.x0, bb.y0, bb.x1, bb.y1, o); ctx.restore();
}
// a back-and-forth scribble that shades a shape in one colour (clipped; write it on with part)
function scribbleFill(P, col, o = {}) {
  const { ang = -0.6, gap = 11, w = 3.2, a = 0.85, key = 'sf', part = 1, amp = 1.3, base = 0.3 } = o;
  const bb = bbox(P, 6), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
  const ca = Math.cos(ang), sa = Math.sin(ang), S = RNG('sfs', key), Z = [];
  for (let d = -rad, i = 0; d <= rad; d += gap, i++) {
    const e = i % 2 ? 1 : -1, L = rad * (0.9 + S.f() * 0.15);
    Z.push([cx - sa * d + ca * L * e, cy + ca * d + sa * L * e]);
  }
  ctx.save(); gclip(P);
  if (base > 0) { ctx.globalAlpha = base * clamp(part * 3); ctx.fillStyle = col; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); ctx.globalAlpha = 1; }
  gline(Z, { w, col, a, key: key + 'z', amp, part, step: 14, second: false });
  ctx.restore();
}
// a tangle of graphite: raw stuff, the mess (seeded shape, boiling tremor)
function graphiteScribble(cx, cy, w, h, key, o = {}) {
  const S = RNG('gsc', key), n = o.n ?? 34, P = [], a1 = 1.2 + S.f() * 1.6, a2 = 2.3 + S.f() * 1.9, ph = S.f() * TAU;
  for (let i = 0; i < n; i++) {
    const u = (i / n) * Math.PI * 4;
    P.push([cx + Math.sin(u * a1 * 0.5 + ph) * w / 2 * (0.55 + 0.45 * S.f()), cy + Math.cos(u * a2 * 0.5) * h / 2 * (0.55 + 0.45 * S.f())]);
  }
  return gpencil(P, { key: 'gsc' + key, amp: 1.4, w: o.w ?? 2.8, a: o.a ?? 0.85, step: 10, col: o.col ?? SK.graph, part: o.part ?? 1 });
}
// a soft graphite smudge (a thumb dragged through pencil): radial falloff, no hard edge
function smudgeOn(g, x, y, rx, ry, a = 0.12, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(80,76,70,${a})`); gr.addColorStop(0.55, `rgba(80,76,70,${a * 0.5})`); gr.addColorStop(1, 'rgba(80,76,70,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
}
const smudge = (x, y, rx, ry, a, rot) => smudgeOn(ctx, x, y, rx, ry, a, rot);

// ---------------------------------------------------------------------
//  THE HAND: lettering (local system fonts; per-glyph jitter on the boil; letters write on one by one)
// ---------------------------------------------------------------------
const SK_GLYPH = new Map();   // static measurements, keyed by font + string
const skFont = (size, face = 'hand', weight) => face === 'marker' ? `${weight ?? 700} ${size}px ${SK_MARKER}` : `${weight ?? 400} ${size}px ${SK_HAND}`;
function glyphX(str, font) {
  const k = font + '|' + str; let v = SK_GLYPH.get(k); if (v) return v;
  ctx.save(); ctx.font = font; v = []; for (let i = 0; i <= str.length; i++) v.push(ctx.measureText(str.slice(0, i)).width); ctx.restore();
  SK_GLYPH.set(k, v); return v;
}
const letterW = (str, size, face = 'hand', weight) => { const xs = glyphX(str, skFont(size, face, weight)); return xs[xs.length - 1]; };
// o: face ('hand' | 'marker'), weight, col, align ('center' | 'left' | 'right'), reveal 0..1, key, jit, a, rot
// returns [left, right] of the string so callers can underline or highlight it
function handLetter(str, x, y, size, o = {}) {
  const { face = 'hand', weight, col = SK.ink, align = 'center', reveal = 1, key = str, jit = 1, a = 1, rot = 0 } = o;
  const stroke = o.stroke ?? (face === 'hand' ? size * 0.024 : 0);   // thin system hand fonts get a pen-weight stroke
  const font = skFont(size, face, weight), xs = glyphX(str, font), wTot = xs[xs.length - 1];
  const x0 = align === 'center' ? x - wTot / 2 : align === 'right' ? x - wTot : x;
  const n = str.length, shown = clamp(reveal) * n;
  if (shown <= 0) return [x0, x0 + wTot];
  ctx.save(); ctx.font = font; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = stroke; ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y);
  for (let i = 0; i < n && i < shown; i++) {
    if (str[i] === ' ') continue;
    const k = clamp(shown - i), R = RNG('hl', key, i, B);
    const jx = R.n(1.2) * jit, jy = R.n(1.4) * jit, jr = R.n(0.025) * jit, gx = x0 + xs[i], gw = xs[i + 1] - xs[i];
    ctx.save(); ctx.globalAlpha = a * (0.25 + 0.75 * k);
    ctx.translate(gx + gw / 2 + jx, y + jy + (1 - k) * size * 0.12); ctx.rotate(jr); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
    ctx.fillText(str[i], -gw / 2, 0); if (stroke > 0) ctx.strokeText(str[i], -gw / 2, 0); ctx.restore();
  }
  ctx.restore();
  return [x0, x0 + wTot];
}
// a highlighter swipe behind a word: rough ends, multiplied so the lettering sits on top
function highlight(x0, x1, y, h, part, o = {}) {
  if (part <= 0) return;
  const xe = lerp(x0, x1, EZ.o3(part));
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.a ?? 0.8; ctx.strokeStyle = o.col ?? SK.hilite; ctx.lineCap = 'butt'; ctx.lineWidth = h;
  trace(gwob(resample([[x0 - 8, y + 3], [xe + 8, y - 3]], false, 18), 'hi' + (o.key ?? x0), 2.5), false); ctx.stroke(); ctx.restore();
}
// a quick underline (slightly bowed), written on
function underline(x0, x1, y, o = {}) {
  return gline([[x0 - 6, y], [lerp(x0, x1, 0.5), y + (o.bow ?? 6)], [x1 + 10, y - 5]], { w: o.w ?? 5, col: o.col ?? SK.ink, key: o.key ?? 'ul' + x0, part: o.part ?? 1, amp: 2.2, second: false });
}

// ---------------------------------------------------------------------
//  THE PAGE (built once per grid kind, seeded, cached: a static thing, so nothing carries between frames)
// ---------------------------------------------------------------------
const SK_M = 160;   // the page runs this far past the frame on every side (camera moves stay on paper)
const SK_PAGES = {};
function pageTex(grid = 'dots') {
  if (SK_PAGES[grid]) return SK_PAGES[grid];
  const c = document.createElement('canvas'); c.width = W + 2 * SK_M; c.height = H + 2 * SK_M;
  const g = c.getContext('2d'), R = RNG('page', grid), PW = c.width, PH = c.height, ox = SK_M, oy = SK_M;
  // vignette: the page darkens toward its edges, so the frame reads as a page
  const vg = g.createRadialGradient(PW / 2, PH * 0.45, 420, PW / 2, PH / 2, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(125,92,48,0.24)'); g.fillStyle = vg; g.fillRect(0, 0, PW, PH);
  if (grid === 'dots') {                                                       // dot grid, page-aligned
    g.fillStyle = 'rgba(110,100,86,0.22)';
    for (let y = 27 - 54 * 3; y < H + SK_M; y += 54) for (let x = 27 - 54 * 3; x < W + SK_M; x += 54) g.fillRect(x + ox - 1.3, y + oy - 1.3, 2.6, 2.6);
  } else if (grid === 'ruled') {                                               // ruled lines + a margin rule
    g.strokeStyle = 'rgba(90,130,190,0.26)'; g.lineWidth = 1.6; g.beginPath();
    for (let y = 200; y < H + SK_M; y += 64) { g.moveTo(0, y + oy); g.lineTo(PW, y + oy + R.n(1.5)); }
    g.stroke(); g.strokeStyle = 'rgba(214,96,96,0.30)'; g.beginPath(); g.moveTo(ox + 70, 0); g.lineTo(ox + 70, PH); g.stroke();
  }
  // tooth: dark and light specks, batched by alpha
  for (const [rgb, al, n] of [['95,72,40', 0.025, 18000], ['95,72,40', 0.06, 12000], ['255,253,245', 0.05, 14000], ['255,253,245', 0.11, 9000]]) {
    g.fillStyle = `rgba(${rgb},${al})`; g.beginPath();
    for (let i = 0; i < n; i++) g.rect(R.r(0, PW), R.r(0, PH), 1 + R.f() * 1.6, 1 + R.f() * 1.6);
    g.fill();
  }
  g.lineCap = 'round'; g.lineWidth = 0.8;                                     // fibres
  for (let i = 0; i < 520; i++) {
    const x = R.r(0, PW), y = R.r(0, PH), a = R.r(0, TAU), l = 6 + R.f() * 18;
    g.strokeStyle = `rgba(120,95,60,${(0.04 + R.f() * 0.06).toFixed(3)})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // a few graphite smudges in the margins (a hand resting on the page) and ghosts of erased lines
  for (const [x, y, rx, ry, a, rot] of [[90, 1700, 170, 60, 0.10, -0.3], [1010, 420, 120, 46, 0.08, 1.2], [180, 250, 140, 40, 0.07, 0.15], [960, 1580, 150, 50, 0.07, -0.5]]) smudgeOn(g, x + ox, y + oy, rx, ry, a, rot);
  g.strokeStyle = 'rgba(110,104,96,0.10)'; g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const x = R.r(80, 960) + ox, y = R.r(1560, 1840) + oy, l = R.r(80, 220); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + R.n(30), x + l, y + R.n(12)); g.stroke(); }
  for (let k = 0; k < 3; k++) {                                                // an old coffee ring, bottom right
    g.strokeStyle = `rgba(150,100,50,${0.08 - k * 0.02})`; g.lineWidth = 6 - k * 2;
    g.beginPath(); g.ellipse(930 + ox + k * 2, 1760 + oy - k, 120 - k * 3, 112, 0.3, 0.2, 5.9); g.stroke();
  }
  for (let i = 0; i < 4; i++) {                                                // the edges of the pages below, right side
    g.strokeStyle = `rgba(120,100,80,${0.16 - i * 0.03})`; g.lineWidth = 1.4; g.beginPath();
    g.moveTo(ox + W - 10 + i * 5, 0); g.lineTo(ox + W - 12 + i * 5, PH); g.stroke();
  }
  for (let x = 40; x < W + 40; x += 62) {                                      // spiral binding along the top
    const hx = x + ox, hy = 56 + oy;
    g.fillStyle = 'rgba(40,32,26,0.85)'; g.beginPath(); g.ellipse(hx, hy, 9, 11, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(80,78,76,0.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(hx + 2, hy + 2); g.bezierCurveTo(hx + 10, hy - 60, hx - 22, hy - 80, hx - 18, hy - 120); g.stroke();
    g.strokeStyle = 'rgba(230,228,222,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + 4, hy - 4); g.bezierCurveTo(hx + 10, hy - 58, hx - 18, hy - 78, hx - 15, hy - 118); g.stroke();
  }
  return (SK_PAGES[grid] = c);
}
// the page, in world coords (it is the world: it moves with the camera). o.grid: 'dots' | 'ruled' | 'plain'; o.tint: a colour wash
function sketchPage(o = {}) {
  ctx.save(); ctx.fillStyle = o.fill ?? SK.paper; ctx.fillRect(-SK_M, -SK_M, W + 2 * SK_M, H + 2 * SK_M);
  if (o.tint) { ctx.globalAlpha = o.tintA ?? 0.18; ctx.fillStyle = o.tint; ctx.fillRect(-SK_M, -SK_M, W + 2 * SK_M, H + 2 * SK_M); ctx.globalAlpha = 1; }
  ctx.drawImage(pageTex(o.grid ?? 'dots'), -SK_M, -SK_M); ctx.restore();
}

// ---------------------------------------------------------------------
//  PROPS (all in local coords around (x, y); keys seed structure, B drives the tremor)
// ---------------------------------------------------------------------
function tapeStrip(x, y, w, rot = 0, key = 'tape', h = 46) {   // a strip of masking tape, slightly see-through
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const S = RNG('tp', key), P = [[-w / 2, -h / 2 + S.n(2)], [w / 2, -h / 2 + S.n(2)], [w / 2 + S.n(3), h / 2], [-w / 2 + S.n(3), h / 2]];
  gfill(P, SK.tape, { a: 0.8, off: [0, 0], key, amp: 1.5 });
  ctx.restore();
}
function scrap(x, y, rot, s, key = 'scrap') {                    // a torn page in flight
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const P = [[-34, -26], [30, -28], [36, 22], [4, 26], [-6, 21], [-32, 27]], S = RNG('scr', key);
  gfill(P, SK.sheet, { off: [0, 0], key, amp: 1.2 });
  gline(closeP(P), { w: 3, key: key + 'o', amp: 1, second: false });
  for (let i = 0; i < 3; i++) gpencil([[-24, -12 + i * 12], [2 + S.f() * 26, -12 + i * 12]], { key: key + 'l' + i, w: 2, amp: 0.8, passes: 1 });
  ctx.restore();
}
function pencilTool(tx, ty, ang, s = 1) {                         // tip at (tx, ty), body up and to the right
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang); ctx.scale(s, s);
  gfill([[0, 0], [38, -13], [38, 13]], SK.wood, { off: [0, 0], key: 'pt1', amp: 0.6 });
  gfill([[0, 0], [12, -4], [12, 4]], SK.lead, { off: [0, 0], key: 'pt2', amp: 0.3 });
  const body = [[38, -13], [250, -13], [250, 13], [38, 13]];
  gfill(body, SK.yellow, { off: [3, 2], key: 'pt3', amp: 0.8 });
  ctx.save(); gclip(body); ghatch(38, -13, 250, 13, { ang: 0.02, gap: 8.5, col: '#c9931a', w: 2, a: 0.5, key: 'pt4' }); ctx.restore();
  gfill([[250, -14], [278, -14], [278, 14], [250, 14]], '#b9b3a8', { off: [0, 0], key: 'pt5', amp: 0.6 });
  gfill([[278, -13], [300, -12], [302, 12], [278, 13]], SK.pink, { off: [0, 0], key: 'pt6', amp: 0.6 });
  gline([[0, 0], [38, -13], [300, -13], [302, 12], [38, 13], [0, 0]], { w: 3.2, key: 'pt7', amp: 0.8, second: false });
  gline([[38, -13], [38, 13]], { w: 2, key: 'pt8', amp: 0.6, second: false }); gline([[250, -14], [250, 14]], { w: 2, key: 'pt9', amp: 0.6, second: false });
  ctx.restore();
}
function eraserTool(x, y, ang, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  gfill(sketchBox(-80, -42, 160, 84, 18, 0), SK.pink, { off: [4, 3], key: 'er1' });
  gfill([[-5, -46], [86, -46], [86, 46], [-5, 46]], '#f4efe4', { off: [2, 2], key: 'er2', amp: 1 });
  gfill([[20, -46], [42, -46], [42, 46], [20, 46]], '#5a7fb8', { a: 0.9, off: [0, 0], key: 'er3', amp: 1 });
  gline(sketchBox(-80, -42, 160, 84, 18), { w: 4, key: 'er4' });
  gline([[-5, -46], [86, -46], [86, 46], [-5, 46], [-5, -46]], { w: 3.5, key: 'er5', second: false });
  ctx.restore();
}
function paperPlane(x, y, ang, s = 1, key = 'plane') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const top = [[48, 0], [-40, -30], [-26, 0]], bot = [[48, 0], [-26, 0], [-40, 24]];
  gfill(top, SK.sheet, { off: [0, 0], key: key + 't', amp: 0.8 }); gfill(bot, '#e9dcc3', { off: [0, 0], key: key + 'b', amp: 0.8 });
  gline(closeP(top), { w: 3.5, key: key + 'o1', amp: 0.8 }); gline(closeP(bot), { w: 3.5, key: key + 'o2', amp: 0.8 });
  ctx.restore();
}
function noteCard(x, y, rot, s, lines = 1, key = 'note', col = SK.terra) {   // an index card; `lines` 0..1 writes its three lines on
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  gfill(sketchBox(-62, -44, 124, 88, 8, 0), '#fffaf0', { off: [4, 4], key });
  gfill([[-62, -44], [-50, -44], [-50, 44], [-62, 44]], col, { a: 0.95, off: [0, 0], key: key + 'm', amp: 0.8 });
  gline(sketchBox(-62, -44, 124, 88, 8), { w: 4, key: key + 'o' });
  for (let i = 0; i < 3; i++) gline([[-36, -20 + i * 20], [-36 + [80, 68, 44][i], -20 + i * 20]], { w: 3, key: key + 'l' + i, amp: 0.6, second: false, part: clamp(lines * 3 - i) });
  ctx.restore();
}
function inkStamp(str, x, y, s, rot, a = 1, key = 'stamp') {     // a red rubber stamp, worn: specks knocked out
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
  const w = Math.max(300, letterW(str, 96, 'marker') + 80);
  gline(sketchBox(-w / 2, -62, w, 124, 16), { w: 8, col: SK.red, key: key + '1', second: false });
  gline(sketchBox(-w / 2 + 14, -50, w - 28, 100, 12), { w: 3, col: SK.red, key: key + '2', second: false });
  handLetter(str, 0, 34, 96, { face: 'marker', col: SK.red, key: key + 't', jit: 0.6 });
  ctx.fillStyle = SK.paper; const S = RNG('stk', key);
  for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.55 * a; ctx.fillRect(-w / 2 + S.f() * w, -62 + S.f() * 124, 2 + S.f() * 4, 2 + S.f() * 3); }
  ctx.restore();
}
function checkMark(x, y, s, part, col = SK.green, key = 'chk') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  gline([[-30, 2], [-8, 26], [38, -30]], { w: 12, col, key, amp: 1.2, part, step: 8 });
  ctx.restore();
}
function sparkle(x, y, r, k, key = 'spk', col = SK.ink) {        // four ink ticks that open and close over k 0..1
  if (k <= 0 || k >= 1) return; const rr = r * Math.sin(Math.PI * clamp(k));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.3; gline([[x + Math.cos(a) * rr * 0.25, y + Math.sin(a) * rr * 0.25], [x + Math.cos(a) * rr, y + Math.sin(a) * rr]], { w: 3.5, col, key: key + i, second: false, amp: 0.5, step: 6 }); }
}
function arrowPencil(P, part, o = {}) {                           // a graphite arrow, written on, the head flicks in last
  const { col = SK.graph, w = 3, key = 'arw' } = o;
  gpencil(P, { part, col, w, key, a: 0.95, passes: 2 });
  if (part > 0.85) {
    const Q = resample(P, false, 6), e = Q[Q.length - 1], q = Q[Math.max(0, Q.length - 4)], an = Math.atan2(e[1] - q[1], e[0] - q[0]), hk = seg(part, 0.85, 1);
    for (const s of [-1, 1]) gpencil([e, [e[0] - Math.cos(an + s * 0.5) * 26 * hk, e[1] - Math.sin(an + s * 0.5) * 26 * hk]], { col, w, key: key + s, amp: 0.6, passes: 1 });
  }
}
function sweat(x, y, k, key = 'sw') {                             // a pencil drop that slides off and fades
  if (k <= 0 || k >= 1) return;
  const yy = y + k * 40; ctx.save(); ctx.globalAlpha *= 1 - k;
  gpencil([[x, yy - 16], [x + 8, yy], [x, yy + 7], [x - 8, yy], [x, yy - 16]], { key, w: 2.5, amp: 0.6, step: 5 });
  ctx.restore();
}
function doodleStar(x, y, r, key = 'star', o = {}) {             // a five-point margin star drawn in one stroke
  const P = []; for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * TAU * 2 / 5; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return gpencil(P, { key, w: o.w ?? 2.6, a: o.a ?? 0.8, amp: 1.2, step: 8, part: o.part ?? 1, col: o.col ?? SK.graph });
}
function doodleBird(x, y, s, flap, key = 'bird') {               // a two-arc "v" bird; flap 0..1
  const k = 0.35 + 0.65 * flap;
  gline([[x - 26 * s, y - 14 * s * k], [x - 12 * s, y - 16 * s * k], [x, y]], { w: 3 * s, key: key + 'l', amp: 0.5, second: false, step: 6 });
  gline([[x, y], [x + 12 * s, y - 16 * s * k], [x + 26 * s, y - 14 * s * k]], { w: 3 * s, key: key + 'r', amp: 0.5, second: false, step: 6 });
}

// ---------------------------------------------------------------------
//  THE HERO: a terracotta dot with a cream asterisk, eyes, a mouth; arms and legs when it needs to act.
//  o: key, mood ('calm' | 'wow' | 'happy' | 'puzzled'), look [dx, dy] (-1..1), sx, sy (squash), rot,
//     legs (bool), step (-1..1 stride), arms [leftAngle, rightAngle] (radians up from horizontal; null = none)
//  Sets SPARK_AT (the hero's screen spot) for tools/review.
// ---------------------------------------------------------------------
function doodleHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', mood = o.mood ?? 'calm', lw = Math.max(3, r * 0.065);
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.legs) {
    const st = o.step ?? 0;
    for (const s of [-1, 1]) {
      const hip = [s * r * 0.32, r * 0.85], kick = s * st * r * 0.22, foot = [s * r * 0.36 + kick, r * 1.42 - Math.max(0, s * st) * r * 0.1];
      gline([hip, foot], { w: lw, key: key + 'leg' + s, amp: 0.8, second: false, step: 8 });
      gline([foot, [foot[0] + s * r * 0.22, foot[1] + 2]], { w: lw * 1.25, key: key + 'ft' + s, amp: 0.5, second: false, step: 6 });
    }
  }
  if (o.arms) [-1, 1].forEach((s, i) => {
    const ang = o.arms[i]; if (ang == null) return;
    const sh = [s * r * 0.9, r * 0.15], L = r * 0.85;
    const el = [sh[0] + s * L * 0.5 * Math.cos(ang * 0.6), sh[1] - L * 0.5 * Math.sin(ang * 0.6)], hd = [sh[0] + s * L * Math.cos(ang), sh[1] - L * Math.sin(ang)];
    gline([sh, el, hd], { w: lw, key: key + 'arm' + s, amp: 0.8, second: false, step: 8 });
    gline(loopPts(hd[0], hd[1], r * 0.09, r * 0.09, 0.1), { w: lw * 0.8, key: key + 'hd' + s, amp: 0.4, second: false, step: 5 });
  });
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  const body = loopPts(0, 0, r, r, 0, 0, 40);
  gfill(body, SK.terra, { off: [r * 0.06, r * 0.05], key: key + 'f' });
  litHatch(body, { ang: -0.85, gap: Math.max(5, r * 0.08), col: SK.terraD, w: Math.max(1.6, r * 0.03), a: 0.85, key: key + 'h' });
  gline(loopPts(0, 0, r, r, 0.08), { w: lw, key: key + 'o' });
  for (let i = 0; i < 8; i++) {                                                // the cream asterisk on its crown
    const an = i / 8 * TAU + 0.2, r0 = r * 0.04, r1 = r * 0.19, cy = -r * 0.5;
    gline([[Math.cos(an) * r0, cy + Math.sin(an) * r0], [Math.cos(an) * r1, cy + Math.sin(an) * r1]], { w: r * 0.065, col: SK.cream, key: key + 'a' + i, amp: 0.4, second: false, step: 6 });
  }
  const [lx, ly] = o.look ?? [0, 0], blink = mood !== 'wow' && (B + hash(key)) % 37 === 0;
  for (const s of [-1, 1]) {
    const ex = s * r * 0.3 + lx * r * 0.07, ey = r * 0.06 + ly * r * 0.07;
    if (blink) gline([[ex - r * 0.09, ey], [ex + r * 0.09, ey]], { w: lw * 0.9, key: key + 'bl' + s, amp: 0.3, second: false, step: 6 });
    else if (mood === 'happy') gline([[ex - r * 0.09, ey + r * 0.03], [ex, ey - r * 0.06], [ex + r * 0.09, ey + r * 0.03]], { w: lw * 0.9, key: key + 'hp' + s, amp: 0.3, second: false, step: 6 });
    else {
      ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.085, r * (mood === 'wow' ? 0.15 : 0.12), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = SK.cream; ctx.beginPath(); ctx.arc(ex - r * 0.025, ey - r * 0.045, r * 0.028, 0, TAU); ctx.fill();
    }
  }
  if (mood === 'puzzled') gline([[r * 0.18, -r * 0.16], [r * 0.42, -r * 0.24]], { w: lw * 0.8, key: key + 'brow', amp: 0.4, second: false, step: 6 });
  const my = r * 0.4;
  if (mood === 'wow') { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(0, my + r * 0.02, r * 0.08, r * 0.1, 0, 0, TAU); ctx.fill(); }
  else if (mood === 'happy') { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.moveTo(-r * 0.2, my - r * 0.05); ctx.quadraticCurveTo(0, my + r * 0.3, r * 0.2, my - r * 0.05); ctx.closePath(); ctx.fill(); }
  else if (mood === 'puzzled') gline([[-r * 0.16, my], [-r * 0.05, my - r * 0.04], [r * 0.06, my + r * 0.03], [r * 0.16, my - r * 0.02]], { w: lw * 0.8, key: key + 'm', amp: 0.4, second: false, step: 5 });
  else gline(arcPts(0, my - r * 0.12, r * 0.16, Math.PI * 0.2, Math.PI * 0.8, 8), { w: lw * 0.8, key: key + 'm', amp: 0.4, second: false, step: 5 });
  ctx.restore();
  return body;
}

// ---------------------------------------------------------------------
//  CAPTIONS: the lettering is the narrator. Drawn after the camera (DEFER), at screen size.
//  pageTag(str)                 a marker label on masking tape, top left, written on at the era's start
//  pageCaption(lines, hi, o)    1–2 hand-lettered lines centred on CX, written on letter by letter;
//                               hi = [[lineIndex, 'word'], ...] gets a highlighter swipe once the line is down
// ---------------------------------------------------------------------
function pageTagDraw(str) {
  const size = 70, w = letterW(str, size, 'marker'), x = 84, y = 340;
  tapeStrip(x + w / 2, y - size * 0.3, w + 70, -0.03, 'tagtape' + str, size * 1.15);
  const [x0, x1] = handLetter(str, x, y, size, { face: 'marker', align: 'left', reveal: ev(E0 + 0.1, 0.3), key: 'tag' + str, jit: 0.7 });
  underline(x0, x1, y + 20, { col: SK.red, w: 5, key: 'tagu' + str, part: ev(E0 + 0.4, 0.2) });
}
function pageCaptionDraw(lines, hi = [], o = {}) {
  const size = o.size ?? 80, y0 = o.y ?? 1330, lh = size * 1.12, t0 = E0 + (o.at ?? 0.35);
  lines.forEach((line, li) => {
    const y = y0 + li * lh, font = skFont(size, 'hand'), xs = glyphX(line, font), x0 = CX - xs[xs.length - 1] / 2;
    for (const [hl, word] of hi) if (hl === li) { const k = line.indexOf(word); if (k >= 0) highlight(x0 + xs[k], x0 + xs[k + word.length], y - size * 0.28, size * 0.55, ev(t0 + 0.5 + li * 0.25, 0.25), { key: 'caph' + li + line }); }
    handLetter(line, CX, y, size, { reveal: ev(t0 + li * 0.25, 0.4), key: 'cap' + li + line });
  });
}
const pageTag = (str) => { const f = () => pageTagDraw(str); if (DEFER) DEFER.push(f); else f(); };
const pageCaption = (lines, hi, o) => { const f = () => pageCaptionDraw(lines, hi, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (kit/morph.js). A morph happens on the bare page.
// =====================================================================
const STYLE = {
  name: 'sketchbook',
  paper: SK.paper,
  backdrop(c) {   // the page, washed toward colour c (c = the paper itself at the heart of a morph)
    fillAll(c);
    ctx.save(); screen(); ctx.drawImage(pageTex('dots'), -SK_M, -SK_M); ctx.restore();
  },
  window(P, key, src) {   // the world seen through a graphite outline, lifted off the page by a soft smudge shadow
    ctx.save();
    ctx.shadowColor = 'rgba(70,64,58,0.42)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 14;
    trace(P, true); ctx.fillStyle = SK.paper; ctx.fill();
    ctx.restore();
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    gpencil(P, { closed: true, w: 3, a: 0.6, amp: 3.2, key: key + 'c', step: 14 });
    gline(P, { closed: true, w: 5.5, key: key + 'rim', step: 14 });
  },
  blob(P, c, key) {   // the shape mid-morph: a colour scribble inside a graphite outline
    gfill(P, c, { a: 0.3, off: [6, 5], key: key + 'f' });
    scribbleFill(P, c, { key: key + 's', gap: 12, w: 4, base: 0.25 });
    gpencil(P, { closed: true, w: 2.6, a: 0.7, amp: 3, key: key + 'c' });
    gline(P, { closed: true, w: 5.5, key: key + 'o' });
  },
  hero(x, y, r, o) { doodleHero(x, y, r * 0.6, { ...o, key: o.key }); },
  heroColor: SK.terra,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.6, r * 0.6, 0, 96),
  post() { grain({ n: 1800, dark: 'rgba(60,56,52,0.12)', light: 'rgba(255,253,245,0.16)' }); },
};
