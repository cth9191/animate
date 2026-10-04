// =====================================================================
//  SCENES — riso demo. World coordinates 1080x1920; time TT on 2s; ev / popS for events.
//  Every colour is plate tones { teal, pink, yellow }; each world = a coarse field layer + one world layer.
// =====================================================================
const SUN = { x: 700, r: 210, c: { pink: 0.5, yellow: 1 } };
const sunY = () => lerp(770, 540, EZ.o2(seg(TT, 0.1, 2.0)));
function sunPts(x, y, r, rot = 0, m = 120) {   // a round body with 12 soft rays (the bridge outline)
  const P = [];
  for (let i = 0; i < m; i++) { const a = (i / m) * TAU, k = 0.66 + 0.34 * (0.5 + 0.5 * Math.cos(12 * (a - rot))) ** 4; P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
  return P;
}
const sunRot = () => TT * 0.12;
function skyline(key, x0, x1, top0, top1, bottom, tones, win) {
  const R = RNG('sky', key);
  for (let x = x0; x < x1;) {
    const w = R.r(70, 150), top = R.r(top0, top1);
    fill(rect(x, top, w + 2, bottom - top), tones);
    if (R.f() < 0.35) fill(rect(x + w * 0.3, top - R.r(20, 50), w * 0.18, 60), tones);           // a stair hut / tank
    for (let wy = top + 24; wy < bottom - 30; wy += 42) for (let wx = x + 14; wx < x + w - 22; wx += 30) {
      const p = RNG('win', key, wx, wy).f();
      if (p < win.lit) fill(rect(wx, wy, 13, 18), { yellow: 0.95, pink: 0.15 });
      else if (p < win.lit + win.dark) fill(rect(wx, wy, 13, 18), win.dk);
    }
    x += w;
  }
}
function shirt(x, y, s, ang, tones, key) {   // a T-shirt pegged at (x, y), swinging by ang
  const P = [[-40, 0], [-12, 0], [0, 10], [12, 0], [40, 0], [62, 26], [46, 42], [32, 30], [32, 112], [-32, 112], [-32, 30], [-46, 42], [-62, 26]];
  const Q = P.map(([u, v]) => { const c = Math.cos(ang), sn = Math.sin(ang); return [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s]; });
  fill(hand(Q, key, 1.2, 8), tones);
  for (const u of [-24, 24]) fill(rect(x + u * s - 4, y - 10, 8, 20), MIX.dark);
}
function sceneRoof() {
  const cu = TIMELINE.cues, sy = sunY();
  beginSheet();
  // ---- the far field: a dawn sky screened coarse (teal high, peach low)
  printed(PITCH.field, { full: true }, () => {
    fill(rect(-80, -80, W + 160, H + 160), {
      teal: lin(0, 0, 0, 1000, [[0, 0.55], [0.6, 0.06], [1, 0]]),
      pink: lin(0, 200, 0, 1150, [[0, 0.04], [1, 0.38]]),
      yellow: lin(0, 200, 0, 1150, [[0, 0.12], [1, 0.75]]),
    });
    fill(circ(SUN.x, sy, 380), { yellow: rad(SUN.x, sy, 150, 380, [[0, 0.7], [1, 0]]) }, { over: true });   // the glow: the yellow plate rises
  });
  // ---- the world, one pitch
  printed(PITCH.world, { shapes: true }, () => {
    // the sun: a paler halo, soft rays, an orange body with a coral dry-brush rim and a paper glint
    fill(curvy(sunPts(SUN.x, sy, SUN.r, sunRot())), { yellow: 1, pink: 0.28 });
    fill(circ(SUN.x, sy, 140), SUN.c);
    rim(SUN.x, sy, 140, 'sunrim', { tones: MIX.coral, w: 8 });
    line(arcPts(SUN.x, sy, 104, Math.PI * 1.08, Math.PI * 1.42, 10), {}, { w: 12, taper: 0.35, knock: true, key: 'sunhl' });
    // birds crossing (life)
    for (let i = 0; i < 3; i++) {
      const x = ((TT * 190 + i * 300) % 1300) - 110, y = 420 + i * 70 + Math.sin(TT * 3 + i) * 14, up = (B + i) % 2 ? 16 : -6;
      line([[x - 28, y - up], [x - 10, y - 2], [x, y + 4], [x + 10, y - 2], [x + 28, y - up]], MIX.blue, { w: 6, taper: 0.3, amt: 0.6, key: 'bird' + i, knock: true });
    }
    // far skyline (dusty violet), mid skyline (deep blue) with a chimney and its smoke (life)
    skyline('far', -60, W + 60, 850, 960, 1240, { teal: 0.42, pink: 0.32, yellow: 0.12 }, { lit: 0.18, dark: 0.25, dk: { teal: 0.6, pink: 0.5, yellow: 0.2 } });
    for (let i = 0; i < 5; i++) {
      const age = (TT * 0.55 + i / 5) % 1, px = 905 + age * 70 + Math.sin(age * 6 + i) * 10, py = 1010 - age * 420, pr = 18 + age * 46;
      fill(hand(ellipsePts(px, py, pr, pr * 0.8, 0, 18), 'smoke' + i, 2), { teal: 0.12, pink: 0.1, yellow: 0.1 });
    }
    fill(rect(880, 1000, 50, 90), MIX.dark);
    skyline('mid', -60, W + 60, 1040, 1110, 1240, { teal: 0.72, pink: 0.55, yellow: 0.22 }, { lit: 0.12, dark: 0, dk: {} });
    // the water tower: dark legs, a teal tank with blue staves, an olive-black cone
    for (const [a, b] of [[[150, 1230], [170, 1000]], [[300, 1230], [280, 1000]], [[160, 1120], [290, 1060]], [[290, 1120], [160, 1060]]]) line([a, b], MIX.dark, { w: 9, amt: 0.8, key: 'leg' + a[0] + b[1], knock: true });
    fill(hand(boxPts(120, 790, 200, 220), 'tank', 1.4), { teal: 0.9, pink: 0.12 });
    for (let x = 140; x < 320; x += 30) line([[x, 800], [x + 1, 1004]], MIX.blue, { w: 4, amt: 0.6, key: 'stave' + x });
    for (const y of [850, 950]) line([[118, y], [322, y + 2]], MIX.dark, { w: 6, amt: 0.6, key: 'band' + y, knock: true });
    fill(hand([[104, 796], [220, 700], [336, 796]], 'cone', 1), MIX.dark);
    specks(130, 720, 320, 790, 30, 'cone');
    // the laundry line (life: the shirts swing on 2s)
    const LA = [322, 840], LB = [1130, 800], lp = (u) => [lerp(LA[0], LB[0], u), lerp(LA[1], LB[1], u) + Math.sin(u * Math.PI) * 70];
    line(Array.from({ length: 24 }, (_, i) => lp(i / 23)), MIX.dark, { w: 3.5, amt: 0.8, key: 'wire', knock: true });
    [[0.2, { pink: 0.9 }], [0.38, { yellow: 1, teal: 0.1 }], [0.56, MIX.green], [0.74, { teal: 0.9 }]].forEach(([u, t], i) => {
      const [x, y] = lp(u); shirt(x, y, 0.9, Math.sin(TT * 5 + i * 1.7) * 0.12, t, 'shirt' + i);
    });
    // the roof: a dark parapet, terracotta tiles, a potted plant
    fill(rect(-80, 1240, W + 160, H), { pink: 0.5, yellow: 0.8, teal: 0.1 });
    for (let y = 1300, row = 0; y < H; y += 62, row++) {
      line([[-40, y], [W + 40, y + 3]], MIX.coral, { w: 3, amt: 1, key: 'tile' + y });
      for (let x = (row % 2) * 70 - 20; x < W + 40; x += 140) line([[x, y], [x + 2, y + 60]], MIX.coral, { w: 2.5, amt: 0.8, key: 'tv' + x + '_' + y });
    }
    fill(rect(-80, 1218, W + 160, 34), MIX.dark);
    specks(0, 1220, W, 1250, 60, 'parapet');
    const sw = Math.sin(TT * 4) * 0.08;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.36 + sw, L = 110; fill(ell(830 + Math.cos(a) * L * 0.5, 1250 + Math.sin(a) * L * 0.5, L * 0.5, 19, a), i % 2 ? MIX.green : { teal: 0.8, yellow: 0.7 }); }
    fill(hand([[770, 1240], [890, 1240], [872, 1350], [788, 1350]], 'pot', 1), MIX.rust);
    line([[770, 1262], [890, 1262]], {}, { w: 5, amt: 0.6, key: 'potrim', knock: true });
    // the hero: looks up at the sun, stretches on the cue, then waves
    const st = EZ.o3(ev(cu.stretch, 0.35)), wv = TT >= cu.wave ? Math.sin((TT - cu.wave) * 14) * 0.45 : 0;
    risoHero(470, 1180, 122, {
      key: 'hero', look: [0.45, -0.9], mood: TT < cu.stretch ? 'smile' : 'happy',
      arms: [lerp(0.35, 2.6, st) * (TT >= cu.wave ? 0.45 : 1), lerp(0.35, 2.7, st) + wv],
    });
  });
  endSheet();
  risoTag('dawn');
  risoCaption('up comes the sun');
}

// ---- the market
const ORANGE = { x: 560, y: 740, r: 100, c: MIX.orange };
function orange(x, y, r, key, o = {}) {
  fill(hand(ellipsePts(x, y, r, r * 0.96, 0, 28), key, 1), ORANGE.c);
  rimLine(ellipsePts(x, y, r, r * 0.96, 0, 28), key + 'r', { tones: MIX.coral, w: Math.max(4, r * 0.08), amt: 1, rough: 0.45, double: false });
  line(arcPts(x, y, r * 0.7, Math.PI * 1.1, Math.PI * 1.45, 8), {}, { w: r * 0.12, taper: 0.4, knock: true, key: key + 'hl' });
  if (o.leaf) { fill(ell(x + r * 0.22, y - r * 0.95, r * 0.26, r * 0.11, -0.5), MIX.green); fill(circ(x, y - r * 0.9, r * 0.06), MIX.dark); }
}
function crate(x, y, w, h, key) {
  const n = 3, ph = h / n;
  for (let i = 0; i < n; i++) {
    fill(hand(boxPts(x, y + i * ph + 5, w, ph - 10), key + i, 1), { pink: 0.32, yellow: 0.78, teal: 0.1 });
    line([[x + 10, y + i * ph + ph * 0.45], [x + w - 10, y + i * ph + ph * 0.5]], MIX.coral, { w: 2.5, amt: 1.2, key: key + 'g' + i });
  }
  for (const u of [x + 18, x + w - 18]) fill(circ(u, y + h / 2, 7), MIX.dark);
}
const pickU = () => ev(TIMELINE.cues.pick, 0.35);
function heldOrange(hx, hy) {   // the orange in flight from the crate to the hero's raised hands, then held
  const u = EZ.io(pickU()), tx = hx, ty = hy - 62;
  const x = lerp(ORANGE.x, tx, u), y = lerp(ORANGE.y, ty, u) - Math.sin(u * Math.PI) * 160, r = lerp(ORANGE.r, 72, u);
  orange(x, y, r, 'held', { leaf: true });
  if (TT >= TIMELINE.cues.hop) for (let i = 0; i < 8; i++) {   // a printed sparkle
    const a = (i / 8) * TAU + 0.2, k = 1 + 0.12 * ((B + i) % 2);
    line([[x + Math.cos(a) * r * 1.3 * k, y + Math.sin(a) * r * 1.3 * k], [x + Math.cos(a) * r * 1.75 * k, y + Math.sin(a) * r * 1.75 * k]], MIX.coral, { w: 7, taper: 0.4, amt: 0.6, key: 'spk' + i, knock: true });
  }
}
function sceneMarket() {
  const cu = TIMELINE.cues;
  beginSheet();
  // ---- the far field: a warm plaster wall, screened coarse
  printed(PITCH.field, { full: true }, () => {
    fill(rect(-80, -80, W + 160, H + 160), { yellow: 0.5, pink: lin(0, 300, 0, 1200, [[0, 0.1], [1, 0.32]]), teal: 0.04 });
  });
  printed(PITCH.world, { shapes: true }, () => {
    // the awning: teal and paper stripes, a scalloped edge that flaps (life), its shadow on the wall
    fill(rect(-80, 380, W + 160, 110), { yellow: 0.55, pink: 0.35, teal: 0.3 });
    const aw = (g) => { g.moveTo(-80, -80); g.lineTo(W + 80, -80); for (let k = 12; k >= 0; k--) { const cx = -45 + k * 90, fl = Math.sin(TT * 9 + k * 0.9) * 7; g.lineTo(cx + 45, 400); g.arc(cx, 400 + fl, 45, 0, Math.PI); } g.closePath(); };
    fill(aw, { teal: 1 });
    clipTo(aw);
    for (let k = -1; k < 13; k++) fill(rect(-45 + k * 90 - 22, -80, 45, 560), {});
    unclip();
    line([[-40, 300], [W + 40, 304]], MIX.dark, { w: 10, amt: 0.8, key: 'rod', knock: true });
    // a bee looping over the fruit (life)
    const bx = 300 + Math.cos(TT * 4) * 130, by = 600 + Math.sin(TT * 8) * 45, fl = B % 2 ? 0.6 : 0;
    fill(ell(bx - 10, by - 26, 24, 14, -0.4 + fl), {}); fill(ell(bx + 12, by - 26, 24, 14, 0.4 - fl), {});
    fill(ell(bx, by, 34, 23), { yellow: 1 });
    for (const u of [-10, 4]) line([[bx + u, by - 21], [bx + u + 2, by + 21]], MIX.dark, { w: 8, amt: 0.3, key: 'bee' + u, knock: true });
    fill(circ(bx + 30, by - 4, 9), MIX.dark);
    line([[bx - 36, by + 2], [bx - 50, by + 6]], MIX.dark, { w: 4, taper: 0.5, amt: 0.2, key: 'sting', knock: true });
    // side crates: plums (left) and limes (right), cut by the frame
    for (const [x, y] of [[-20, 975], [80, 985], [170, 978]]) { fill(circ(x, y, 50), MIX.blue); line(arcPts(x, y, 34, Math.PI * 1.1, Math.PI * 1.45, 6), {}, { w: 6, knock: true, key: 'plum' + x }); }
    crate(-80, 1000, 290, 170, 'cl');
    for (const [x, y] of [[920, 975], [1015, 985], [1100, 972]]) { fill(ell(x, y, 52, 42, 0.3), MIX.green); line(arcPts(x, y, 30, Math.PI * 1.1, Math.PI * 1.45, 6), {}, { w: 5, knock: true, key: 'lime' + x }); }
    crate(880, 1000, 280, 170, 'cr');
    // the main crate: two rows of oranges, the best one on top (the bridge), a printed label
    for (const x of [300, 420, 680, 800]) orange(x, 815, 74, 'o2' + x);
    for (const x of [255, 375, 495, 615, 735, 840]) orange(x, 880, 76, 'o1' + x);
    if (TT < cu.pick) orange(ORANGE.x, ORANGE.y, ORANGE.r, 'best', { leaf: true });
    crate(200, 900, 690, 270, 'cm');
    type('SUNNY', 545, 1075, 84, { pink: 1 }, { align: 'center', knock: false, key: 'label' });
    // the floor: teal tiles with paper grout, a dark shadow under the crates
    fill(rect(-80, 1170, W + 160, H), { teal: 0.62, yellow: 0.35, pink: 0.06 });
    fill(rect(-80, 1170, W + 160, 26), { teal: 0.85, pink: 0.6, yellow: 0.6 });
    for (let y = 1250; y < H; y += 90) line([[-40, y], [W + 40, y + 2]], {}, { w: 4, amt: 1, key: 'gr' + y, knock: true });
    for (let x = -40, i = 0; x < W + 40; x += 130, i++) line([[x, 1196], [x - 60, H]], {}, { w: 4, amt: 1, key: 'gv' + i, knock: true });
    // the hero: wow at the orange, reaches, picks it (it flies into the raised hands), hops
    const reach = EZ.o3(ev(cu.reach, 0.3)), lift = EZ.o3(ev(cu.pick, 0.3));
    const hop = TT >= cu.hop ? Math.sin(seg(TT, cu.hop, cu.hop + 0.5) * Math.PI) * 70 : 0;
    risoHero(300, 1200, 116, {
      key: 'hero', look: TT < cu.pick ? [0.8, -0.9] : [0.2, -1], mood: TT < cu.hop ? 'wow' : 'happy', hop,
      arms: [lerp(0.35, 2.7, lift), lerp(lerp(0.35, 2.2, reach), 2.7, lift)],
      hold: TT >= cu.pick ? heldOrange : null,
    });
  });
  // the hanging price sign: its own small layer, swinging (life)
  const sa = Math.sin(TT * 3.2) * 0.07;
  printed(PITCH.world, { T: { s: 1, x: 720, y: 430, rot: sa }, shapes: true, box: [-150, -20, 150, 230] }, () => {
    line([[-80, -10], [-90, 70]], MIX.dark, { w: 4, amt: 0.4, key: 'str1', knock: true }); line([[80, -10], [90, 70]], MIX.dark, { w: 4, amt: 0.4, key: 'str2', knock: true });
    fill(hand(boxPts(-115, 66, 230, 130), 'sign', 1.2), MIX.dark);
    specks(-105, 75, 105, 185, 40, 'sign');
    type('3 for 1', 0, 148, 46, {}, { align: 'center', key: 'price', weight: 900 });
  });
  endSheet();
  risoTag('market');
  risoCaption('picked fresh');
}
