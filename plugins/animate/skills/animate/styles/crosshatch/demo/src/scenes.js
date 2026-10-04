// =====================================================================
//  SCENES — crosshatch demo. World coordinates 1080x1920; time TT on 2s; ev / popS for events.
// =====================================================================
function sceneDesk() {
  woodSurface(-40, -40, W + 40, H + 40, 'desk', {});
  // a sheet of notes, a pencil writing the plan on it
  ctx.save(); ctx.translate(250, 760); ctx.rotate(-0.06);
  paint(box(0, 0, 520, 640), { fill: C.paper, key: 'note', w: 3, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 90 }, { k: 'hatch', a: 0.8, gap: 5, al: 0.18, dens: (x, y) => clamp((x + y - 700) / 400) }] });
  for (let i = 0; i < 7; i++) ink([[40, 90 + i * 70], [40 + 380 * (0.6 + 0.4 * ((i * 7) % 5) / 4), 90 + i * 70]], { w: 2.4, color: 'rgba(58,36,23,0.55)', key: 'nl' + i, frac: ev(TIMELINE.cues.read + i * 0.08, 0.2) });
  planInk(ellipsePts(200, 230, 150, 60, -0.05, 40), { closed: true, key: 'ring', frac: ev(TIMELINE.cues.plan, 0.5) });
  ctx.restore();
  const k = ev(TIMELINE.cues.plan, 0.5), px = 330 + 300 * k, py = 1000 - 40 * Math.sin(k * 9);
  drawPencil(px, py, -0.9, 300, 1, 'pen');
  inkMug(800, 520, 120, 'mug');
  // background life: a paper clip, crumbs, a sticky note
  ink([[120, 420], [120, 330], [150, 310], [180, 330], [180, 440], [150, 460], [140, 450], [140, 350]], { w: 4, color: '#8a8590', key: 'clip' });
  for (let i = 0; i < 9; i++) { const R = RNG('crumb', i); ctx.fillStyle = C.woodD; ctx.beginPath(); ctx.arc(R.r(80, 900), R.r(1250, 1480), R.r(3, 7), 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(690, 1120); ctx.rotate(0.08);
  paint(box(0, 0, 220, 200), { fill: C.yellowL, key: 'sticky', w: 2.6, tex: [{ k: 'pencil', c: C.yellow, al: 0.5, per: 70 }] });
  handText('ship it', 30, 110, 54, C.ink, { key: 'stk' });
  ctx.restore();
  dotHero(560, 1240, 110, { key: 'hero', mood: TT < TIMELINE.cues.plan ? 'smile' : 'wow' });
  toolPill('Read', 'notes.md', 150, 600, TIMELINE.cues.read);
  inkTag('morning');
  inkCaption('first, read the notes');
}
function sceneInside() {
  darkWorld('inside');
  hexGrid({ x0: -40, y0: 1300, x1: W + 40, y1: H + 40 }, 70, { key: 'hex' });
  // the moon (the bridge's counterpart), stars on 2s
  paint(ellipsePts(800, 520, 150, 150, 0, 64), { fill: C.peri, key: 'moon', line: C.white, w: 3, tex: [{ k: 'cross', c: C.periD, al: 0.45, gap: 6 }] });
  for (let i = 0; i < 24; i++) { const R = RNG('st', i); star4(R.r(40, 1040), R.r(260, 1200), R.r(4, 10) * (0.7 + 0.3 * ((B + i) % 2)), C.white); }
  // a terminal being typed into
  paint(rrectPts(110, 760, 820, 380, 18), { fill: C.navy2, key: 'term', line: C.peri, w: 3 });
  const lines = ['$ grep -r "TODO" src', 'src/app.ts:12  // TODO', '$ npm test', '  14 passing'];
  lines.forEach((s, i) => monoText(s, 150, 840 + i * 72, 40, i % 2 ? C.cyan : C.white, { key: 'tl' + i, count: Math.floor(clamp((TT - TIMELINE.cues.type - i * 0.35) / 0.4) * s.length) }));
  dotHero(540, 1270, 110, { key: 'hero', dark: true, mood: 'happy' });
  inkTag('inside');
  inkCaption('then, do the work');
}
