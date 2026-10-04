// =====================================================================
//  SCENES — isometric demo. Each scene sets its iso origin, then draws back to front (painter's order).
//  World units ~ px; time TT on 1s; springs settle every move. Content kept inside x 60-940, y 250-1500.
// =====================================================================
const ISO1 = { ox: 500, oy: 1010, u: 1.05 };
const ISO2 = { ox: 505, oy: 935, u: 1.0 };
const cu = TIMELINE.cues;

// ---- era 1: the laptop
const PL = { x: -210, y: -180, w: 420, d: 360 };       // plinth footprint
const LP = { x: -175, y: -150, w: 320, d: 215, h: 14, lid: 210, t: 9 };   // laptop base + lid
const PZ = 16 + 6 + 14 + 6 + 22;                      // plinth top
const CUR = { u: 52, v: 168, w: 12, h: 20 };          // the cursor block on the screen (face units)
function lidGeom(t) {
  const al = 105 * DEG * spring(t, cu.open, { k: 80, damp: 0.6 }), z = PZ + LP.h + laptopDrop(t);
  return { o: [LP.x, LP.y, z], a: [1, 0, 0], b: [0, Math.cos(al), Math.sin(al)], n: [0, -Math.sin(al), Math.cos(al)] };
}
const laptopDrop = (t) => (1 - spring(t, cu.laptop, { k: 150, damp: 0.62 })) * 260;
const lidFace = (g) => (u, v) => vadd(vadd(g.o, vsc(g.a, u)), vsc(g.b, LP.lid - v));
function sceneLaptop() {
  setIso(ISO1);
  // the plinth: three stacked plates that drop in on springs
  const dz = (i) => (1 - spring(TT, cu.plates + i * 0.08, { k: 160, damp: 0.6 })) * 200;
  if (TT > cu.plates) isoPlates(PL.x, PL.y, 0, PL.w, PL.d, [{ h: 16, r: 44, dz: dz(0) }, { h: 14, gap: 6, inset: 10, r: 38, dz: dz(1) - dz(0) }, { h: 22, gap: 6, inset: 20, r: 32, dz: dz(2) - dz(1) }]);
  const drop = laptopDrop(TT), zb = PZ + drop;
  if (TT > cu.laptop) {
    // base, keys (a grid of parts that rise in a wave), trackpad
    isoBox(LP.x, LP.y, zb, LP.w, LP.d, LP.h, { r: 20 });
    const top = faceOf([LP.x, LP.y, zb + LP.h], [1, 0, 0], [0, 1, 0]);
    const kp = 24.4, kx = LP.x + 14, ky = LP.y + 30;
    isoGrid(12, 4, (i, j) => {
      const s = spring(TT, cu.keys + (i + j) * 0.028, { k: 220, damp: 0.5 });
      if (s <= 0.01) { faceRR(top, 14 + i * kp, 30 + j * kp, 20, 20, 4); return; }
      isoBox(kx + i * kp, ky + j * kp, zb + LP.h, 20, 20, 5 * s, { r: 4, seg: 3, creaseC: PAL.inner });
    });
    faceRR(top, LP.w / 2 - 55, 136, 110, 66, 8);
    lamp(faceOf([LP.x, LP.y + LP.d, zb + LP.h], [1, 0, 0], [0, 0, -1]), LP.w - 26, LP.h / 2, 3, blinkOn(TT, 1.0));
    // the lid on a hinge, opening on a spring; the screen shows a terminal when it faces us
    const g = lidGeom(TT), S = isoSlab(g.o, g.a, g.b, g.n, LP.w, LP.lid, LP.t, { r: 22 });
    if (S.front === 0) screenTerm(lidFace(g));
  }
  // a cable from the laptop's side to a charger brick
  if (TT > cu.laptop + 0.25) isoCable([[LP.x + LP.w, -40, zb + 7], [LP.x + LP.w + 10, -30, PZ + 3], [160, -6, PZ + 3], [170, 12, PZ + 6]], { w: 7 });
  if (TT > cu.plates + 0.3) isoMug(-138, 128, PZ + (1 - spring(TT, cu.plates + 0.35, { k: 180, damp: 0.55 })) * 160, 30, 52);
  if (TT > cu.plates + 0.4) isoPlant(170, -128, PZ + (1 - spring(TT, cu.plates + 0.45, { k: 180, damp: 0.55 })) * 160, 1);
  if (TT > cu.plates + 0.5) {
    const bz = PZ + (1 - spring(TT, cu.plates + 0.55, { k: 180, damp: 0.55 })) * 160;
    isoBox(152, 4, bz, 44, 30, 16, { r: 6 });
    lamp(faceOf([152, 34, bz + 16], [1, 0, 0], [0, 0, -1]), 34, 8, 2.6, !blinkOn(TT, 1.0));
  }
  // the hero, on the plinth in front of the laptop; it hops while the prompt runs and watches the screen
  if (TT > cu.laptop + 0.1) {
    const hz = PZ + (1 - spring(TT, cu.laptop + 0.15, { k: 170, damp: 0.5 })) * 220;
    cubeBot(72, 128, hz, 74, { key: 'hero', hop: cu.hop, look: TT > cu.type ? -0.6 : 0 });
  }
  isoTag('01', 'local');
  isoCaption('it starts on your laptop');
}
// the terminal on the laptop screen (face units: 320 x 210, v down from the top)
function screenTerm(fp) {
  faceRR(fp, 12, 12, LP.w - 24, LP.lid - 24, 12);
  for (let i = 0; i < 3; i++) faceEll(fp, 28 + i * 14, 28, 4.5, 4.5, { stroke: PAL.inner });
  const typed = (s, t0, cps = 22) => Math.floor(clamp((TT - t0) * cps, 0, s.length));
  isoText(fp, '$ claude', 26, 66, 20, { color: PAL.textD, count: typed('$ claude', cu.type) });
  isoText(fp, '> ship the api', 26, 96, 20, { color: PAL.text, count: typed('> ship the api', cu.type + 0.38) });
  [170, 120, 200].forEach((L, i) => {   // output lines as hairline pills, like a figure's text
    const s = spring(TT, cu.type + 0.85 + i * 0.1, { k: 200, damp: 0.7 });
    if (s > 0.02) faceSlab(fp, 26, 116 + i * 17, Math.max(10, L * s), 10, 3, { edge: PAL.edge, creaseC: PAL.inner });
  });
  if (TT > cu.type + 1.05) {
    isoText(fp, '>', 26, 186, 20, { color: PAL.text });
    if (TT > 2.25 || blinkOn(TT, 0.5)) faceSlab(fp, CUR.u, CUR.v, CUR.w, CUR.h, 3, { r: 2, fill: PAL.accent, edge: PAL.accent, creaseC: PAL.accent });   // the accent: the cursor
  }
}

// ---- era 2: the server rack
const RACK = { n: 5, bw: 344, bd: 250, bh: 50, pitch: 58, x: 8, y: 10, fz: 30 };
const bladeZ = (i) => RACK.fz + 8 + i * RACK.pitch;
const bladeSlide = (i) => (i === RACK.n - 1 ? 150 * spring(TT, cu.slide, { k: 55, damp: 0.72 }) : i === 2 ? 28 * spring(TT, cu.slide + 0.9, { k: 90, damp: 0.5 }) : 0);
const bladeFace = (i, slide) => faceOf([RACK.x, RACK.y + RACK.bd + slide, bladeZ(i) + RACK.bh], [1, 0, 0], [0, 0, -1]);
function blade(i) {
  const sl = bladeSlide(i), z = bladeZ(i), on = i === RACK.n - 1;
  isoBox(RACK.x, RACK.y + sl, z, RACK.bw, RACK.bd, RACK.bh, { r: 10, seg: 4 });
  const fp = bladeFace(i, sl);
  for (let k = 0; k < 6; k++) for (let r = 0; r < 2; r++) faceRR(fp, 206 + k * 20, 15 + r * 12, 13, 6, 3, { seg: 2 });   // vents
  if (on) {
    accentDot(fp, 24, RACK.bh / 2, 5.5);
    isoText(fp, 'api-01', 42, RACK.bh / 2 + 7, 20, { color: PAL.text });
    isoBox(RACK.x + 150, RACK.y + RACK.bd + sl, z + 16, 36, 10, 16, { r: 4, seg: 2 });   // a pull handle
  } else {
    lamp(fp, 24, RACK.bh / 2, 5, blinkOn(TT, 1.0, i * 0.37));
    isoText(fp, 'db-0' + (i + 1), 42, RACK.bh / 2 + 7, 18, { color: PAL.textD });
  }
}
function sceneRack() {
  setIso(ISO2);
  // floor: two stacked plates
  isoPlates(-30, -30, 0, 410, 390, [{ h: 18, r: 46 }, { h: 12, gap: 6, inset: 14, r: 38 }]);
  // rear posts and a top bar (behind everything else)
  const top = bladeZ(RACK.n) + 20;
  isoCyl(8, 2, RACK.fz, 8, top - RACK.fz);
  isoCyl(352, 2, RACK.fz, 8, top - RACK.fz);
  isoBox(-8, -10, top, 376, 24, 16, { r: 12 });
  for (let i = 0; i < RACK.n - 1; i++) blade(i);
  // a cable from blade 2's port to a floor socket
  const pz = bladeZ(1) + 24;
  isoCable([[318, RACK.y + RACK.bd, pz], [322, 300, pz - 20], [330, 322, RACK.fz + 6], [362, 338, RACK.fz + 4]], { w: 7 });
  isoBox(358, 326, RACK.fz, 30, 22, 12, { r: 5 });
  blade(RACK.n - 1);
  isoPlant(-6, 318, RACK.fz, 1, { ph: 1.3 });
  // the hero rides the top blade out, then hops
  const sl = bladeSlide(RACK.n - 1);
  cubeBot(250, RACK.y + RACK.bd - 46 + sl, bladeZ(RACK.n - 1) + RACK.bh, 74, { key: 'hero', hop: cu.hop2, look: -0.4 });
  isoTag('02', 'server');
  isoCaption('then it ships to the rack');
}
