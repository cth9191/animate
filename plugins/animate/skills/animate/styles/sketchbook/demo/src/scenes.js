// =====================================================================
//  SCENES — sketchbook demo. World coordinates 1080x1920 (the page); time TT on 2s; ev / popS for events.
// =====================================================================
const BULB = { x: 540, y: 600, r: 120 };
const SUN = { x: 540, y: 500, r: 140 };
// a lightbulb outline: the glass (a circle cut open at the bottom) and a neck, as one closed loop
function bulbPts(x, y, r) {
  const P = [], a0 = Math.PI / 2 - 0.6, a1 = Math.PI / 2 + 0.6 - TAU;
  for (let i = 0; i <= 36; i++) { const a = lerp(a0, a1, i / 36); P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  P.push([x - 0.36 * r, y + 1.12 * r], [x - 0.34 * r, y + 1.42 * r], [x + 0.34 * r, y + 1.42 * r], [x + 0.36 * r, y + 1.12 * r]);
  return P;
}
// background life: a tiny ant walking a pencil line (legs on 2s)
function ant(x, y, s, key) {
  for (let i = 0; i < 3; i++) { ctx.fillStyle = SK.ink; ctx.beginPath(); ctx.ellipse(x + (i - 1) * 11 * s, y - 6 * s, (i === 1 ? 5 : 6.5) * s, 5 * s, 0, 0, TAU); ctx.fill(); }
  const k = B % 2 ? 1 : -1;
  for (let i = 0; i < 3; i++) gline([[x + (i - 1) * 8 * s, y - 4 * s], [x + (i - 1) * 8 * s + k * (i % 2 ? 5 : -5) * s, y + 3 * s]], { w: 1.8 * s, key: key + i, amp: 0.3, second: false, step: 4 });
  gline([[x + 16 * s, y - 8 * s], [x + 24 * s, y - 16 * s]], { w: 1.6 * s, key: key + 'ant', amp: 0.3, second: false, step: 4 });
}
// background life: a paper plane looping a figure-eight in the top-right margin, its graphite trail behind it
function marginPlane(key) {
  const at = (p) => [830 + 120 * Math.sin(TAU * p), 410 + 55 * Math.sin(2 * TAU * p)];
  const p = TT / 3, trail = [];
  for (let i = 0; i <= 24; i++) trail.push(at(p - 0.35 + 0.35 * i / 24));
  ctx.save(); ctx.setLineDash([10, 12]); gpencil(trail, { key: key + 'tr', w: 2.2, a: 0.6, passes: 1, amp: 1 }); ctx.restore();
  const [x, y] = at(p), [x2, y2] = at(p + 0.01);
  paperPlane(x, y, Math.atan2(y2 - y, x2 - x), 1.25, key);
}

// ---- era 0: the idea
function sceneIdea() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  // the ground line the hero stands on, and an ant walking it
  gpencil([[110, 1202], [420, 1196], [700, 1204], [960, 1198]], { key: 'ground', w: 3, a: 0.75 });
  ant(560 + 110 * TT, 1199, 1.5, 'ant');
  // margin stars that twinkle on 2s
  [[110, 560, 0], [170, 760, 1], [96, 930, 2]].forEach(([x, y, i]) => doodleStar(x, y, 24 + 7 * ((B + i) % 3 === 0), 'mstar' + i, { w: 3.4 }));
  marginPlane('mp');
  // the bulb: pencil construction, then ink, then a yellow scribble; it lights on the beat
  const P = bulbPts(BULB.x, BULB.y, BULB.r), lit = ev(cu.pop, 0.25);
  if (lit > 0) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2, r0 = BULB.r * 1.25, r1 = BULB.r * (1.5 + 0.12 * ((B + i) % 2));
      if (Math.sin(a) > 0.7) continue;   // not through the neck
      gline([[BULB.x + Math.cos(a) * r0, BULB.y + Math.sin(a) * r0], [BULB.x + Math.cos(a) * r1, BULB.y + Math.sin(a) * r1]], { w: 5, key: 'ray' + i, part: lit, second: false, amp: 0.8, step: 8 });
    }
  }
  scribbleFill(P, SK.hilite, { key: 'bulbfill', part: ev(cu.fill, 0.5), gap: 12, w: 4.5, a: 0.95, base: 0.35 });
  gpencil(P, { closed: true, key: 'bulbc', w: 2.6, a: 0.7, part: ev(cu.draw, cu.ink - cu.draw) });
  gline(P, { closed: true, key: 'bulb', w: 6, part: ev(cu.ink, 0.3) });
  for (let i = 0; i < 3; i++) gline([[BULB.x - 0.4 * BULB.r, BULB.y + (1.2 + i * 0.1) * BULB.r], [BULB.x + 0.4 * BULB.r, BULB.y + (1.17 + i * 0.1) * BULB.r]], { w: 4, key: 'screw' + i, second: false, part: ev(cu.ink + 0.15 + i * 0.04, 0.1) });
  gline([[BULB.x - 0.12 * BULB.r, BULB.y + 1.12 * BULB.r], [BULB.x - 0.2 * BULB.r, BULB.y + 0.3 * BULB.r], [BULB.x, BULB.y + 0.12 * BULB.r], [BULB.x + 0.2 * BULB.r, BULB.y + 0.3 * BULB.r], [BULB.x + 0.12 * BULB.r, BULB.y + 1.12 * BULB.r]], { w: 3, key: 'filament', second: false, part: ev(cu.ink + 0.1, 0.25), col: SK.graph });
  // the pencil that draws it: follows the construction line, then scribbles, then leaves
  if (TT >= cu.draw && TT < cu.pop + 0.25) {
    let tip;
    if (TT < cu.ink) tip = writeEnd(closeP(P), ev(cu.draw, cu.ink - cu.draw));
    else if (TT < cu.fill) tip = writeEnd(closeP(P), ev(cu.ink, 0.3));
    else if (TT < cu.pop) tip = [BULB.x + 85 * Math.sin(B * 2.1), BULB.y - 70 + 140 * ev(cu.fill, 0.5)];
    else { const k = EZ.i2(ev(cu.pop, 0.25)); tip = [lerp(BULB.x + 60, 1100, k), lerp(BULB.y, 300, k)]; }
    pencilTool(tip[0], tip[1], -0.75 + 0.08 * Math.sin(B * 1.7), 1);
  }
  // the hero: puzzled, then it sees the idea and hops
  const hop = Math.sin(Math.PI * ev(cu.pop, 0.25)), sq = Math.sin(Math.PI * ev(cu.pop + 0.25, 0.17));
  const hx = 300, hy = 1044 - 60 * hop, wow = TT >= cu.pop;
  doodleHero(hx, hy, 108, { key: 'hero', legs: true, mood: wow ? 'wow' : 'puzzled', look: [0.8, -0.8], sx: 1 + 0.1 * sq - 0.05 * hop, sy: 1 - 0.1 * sq + 0.08 * hop, arms: wow ? [1.2, 1.3] : [-0.9, 0.9] });
  if (!wow) handLetter('?', hx + 80, 870 + 6 * Math.sin(B * 0.9), 96, { col: SK.graph, key: 'q', jit: 1.5 });
  else handLetter('!', hx + 90, 850 - 30 * hop, 110, { face: 'marker', col: SK.ink, key: 'bang', reveal: ev(cu.pop, 0.08) });
  if (!wow) for (let i = 0; i < 2; i++) sweat(hx - 80 - i * 14, hy - 70 + i * 8, ((TT * 1.3 + i * 0.5) % 1), 'sw' + i);
  pageTag('sketch it');
  pageCaption(['every big idea', 'starts as a doodle'], [[1, 'doodle']]);
}

// ---- era 1: the hill
function hillPts() { return [[-160, 1300], [60, 1200], [300, 1080], [520, 1012], [640, 1006], [800, 1050], [1000, 1150], [1240, 1260]]; }
function sceneHill() {
  const cu = TIMELINE.cues;
  sketchPage({ grid: 'dots' });
  // a cloud drifting, birds crossing on 2s
  const cx = 140 + 30 * (TT - 3), cy0 = 80;
  gpencil(xform([[cx - 70, 400], ...arcPts(cx - 40, 390, 32, Math.PI, TAU * 0.86, 8), ...arcPts(cx + 10, 372, 40, Math.PI * 1.1, TAU * 0.98, 9), ...arcPts(cx + 60, 392, 28, Math.PI * 1.3, TAU * 1.1, 7), [cx + 90, 404], [cx - 70, 404]], 0, cy0), { key: 'cloud', w: 3, a: 0.75 });
  for (let i = 0; i < 3; i++) doodleBird(1000 - 100 * (TT - 3) + i * 64, 650 + i * 34 - (i % 2) * 16, 1.3 - i * 0.2, (B + i) % 2, 'bird' + i);
  // the sun (the bridge's counterpart): a yellow scribble, inked, rays written on and turning
  const SP0 = ellipsePts(SUN.x, SUN.y, SUN.r, SUN.r, 0, 64);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU + TT * 0.25, r0 = SUN.r * 1.18, r1 = SUN.r * (1.42 + 0.1 * ((B + i) % 2));
    gline([[SUN.x + Math.cos(a) * r0, SUN.y + Math.sin(a) * r0], [SUN.x + Math.cos(a) * r1, SUN.y + Math.sin(a) * r1]], { w: 5, key: 'sray' + i, part: ev(cu.rays + i * 0.02, 0.2), second: false, amp: 0.8, step: 8 });
  }
  scribbleFill(SP0, SK.hilite, { key: 'sunfill', gap: 12, w: 4.5, a: 0.95, base: 0.35 });
  gpencil(SP0, { closed: true, key: 'sunc', w: 2.6, a: 0.6 });
  gline(loopPts(SUN.x, SUN.y, SUN.r, SUN.r, 0.06), { key: 'sun', w: 6 });
  // a far hill in graphite, the near hill in ink with hatching on its shady side
  gpencil([[-160, 1150], [120, 1040], [260, 1010], [420, 1060], [560, 1120]], { key: 'farhill', w: 2.6, a: 0.6 });
  const HP = hillPts();
  const ridge = HP.filter(([x]) => x >= 520), band = [...ridge, ...ridge.slice().reverse().map(([x, y]) => [x - 30, y + 120])];
  ctx.save(); gclip(band);
  ghatch(480, 990, 1240, 1400, { ang: -0.9, gap: 9, col: SK.graph, w: 2, a: 0.45, key: 'hillh' }); ctx.restore();
  gline(HP, { key: 'hill', w: 6 });
  // a path up the hill (dashed graphite), a house and a tree written on
  ctx.save(); ctx.setLineDash([14, 14]); gpencil([[120, 1300], [260, 1220], [380, 1160], [480, 1090], [570, 1040]], { key: 'path', w: 3, a: 0.7, part: ev(cu.house - 0.25, 0.5) }); ctx.restore();
  const hp = ev(cu.house, 0.5), hx = 170, hy = 1170;
  if (hp > 0) gfill([[hx - 60, hy], [hx - 60, hy - 86], [hx, hy - 146], [hx + 60, hy - 86], [hx + 60, hy]], SK.paper, { off: [0, 0], key: 'hfill', a: clamp(hp * 2) });
  gline([[hx - 60, hy], [hx - 60, hy - 90], [hx + 60, hy - 90], [hx + 60, hy]], { key: 'hw', w: 4.5, part: seg(hp, 0, 0.5) });
  gline([[hx - 78, hy - 84], [hx, hy - 150], [hx + 78, hy - 84]], { key: 'hr', w: 4.5, part: seg(hp, 0.4, 0.8) });
  gline([[hx - 12, hy], [hx - 12, hy - 46], [hx + 14, hy - 46], [hx + 14, hy]], { key: 'hd', w: 3.5, part: seg(hp, 0.7, 1), second: false });
  if (hp >= 1) {   // smoke from the chimney, curling on 2s
    gline([[hx + 40, hy - 118], [hx + 40, hy - 150], [hx + 54, hy - 150], [hx + 54, hy - 107]], { key: 'chim', w: 3.5, second: false });
    const sm = []; for (let k = 0; k <= 10; k++) sm.push([hx + 47 + Math.sin(k * 0.9 - TT * 5) * 10, hy - 160 - k * 12]);
    gpencil(sm, { key: 'smoke', w: 2.6, a: 0.6 });
  }
  const tp = ev(cu.tree, 0.5), tx = 830, ty = 1092, sway = 0.04 * Math.sin(TT * 3);
  gline([[tx - 6, ty], [tx - 4, ty - 90]], { key: 'trunk1', w: 4.5, part: seg(tp, 0, 0.3), second: false });
  gline([[tx + 10, ty], [tx + 8, ty - 90]], { key: 'trunk2', w: 4.5, part: seg(tp, 0, 0.3), second: false });
  ctx.save(); ctx.translate(tx, ty - 90); ctx.rotate(sway);
  const crown = [...arcPts(-40, -40, 44, Math.PI * 0.6, Math.PI * 1.5, 8), ...arcPts(10, -78, 46, Math.PI * 1.1, Math.PI * 2.0, 8), ...arcPts(50, -30, 44, Math.PI * 1.5, Math.PI * 2.5, 8), [0, 8], [-40, 4]];
  if (tp > 0.3) gfill(crown, SK.paper, { off: [0, 0], key: 'crownf', a: 0.9 });
  litHatch(crown, { ang: -0.6, gap: 8, col: SK.graph, w: 2, a: tp >= 1 ? 0.5 : 0, key: 'crownh', lx: 0.2, ly: 0.3 });
  gline(crown, { key: 'crown', w: 4.5, part: seg(tp, 0.3, 1), closed: true });
  ctx.restore();
  // the hero on the hilltop: waves at the sun, hops on the beat
  const hop = Math.max(Math.sin(Math.PI * ev(cu.hop1, 0.25)), Math.sin(Math.PI * ev(cu.hop2, 0.25)));
  const wave = 1.0 + 0.5 * ((B % 4) < 2 ? 1 : -1);
  doodleHero(600, 880 - 50 * hop, 90, { key: 'hero', legs: true, mood: 'happy', look: [-0.4, -1], step: 0, sy: 1 + 0.06 * hop, sx: 1 - 0.04 * hop, arms: [-0.7, wave] });
  if (hop > 0) for (let i = 0; i < 2; i++) gline([[540 + i * 120, 1000], [528 + i * 144, 1012]], { w: 3, key: 'dust' + i, second: false, a: hop });
  pageTag('grow it');
  pageCaption(['then it lights up', 'the whole page'], [[1, 'whole page']]);
}
