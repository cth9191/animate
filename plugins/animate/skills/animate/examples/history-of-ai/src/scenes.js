
// =====================================================================
//  STYLE FRAMES: four eras in the cut-paper direction
// =====================================================================
function wall(c, p) { cut(rect(-30, -30, W + 60, H + 60, 0), c, { key: 'wall' + c, shadow: false, tear: 0, pat: p, grain: 0.8, shade: false }); }
// ---- 1950: Turing's study at midnight; the spark is born as the question mark
function penOff() {   // Turing's pen follows the writing, then flinches when the "?" opens its eyes
  const wig = [Math.sin(TT * 31) * 7, Math.cos(TT * 27) * 6];
  if (TT < 0.25) return [-380, -80];
  if (TT < 1.25) return [lerp(-380, -60, TT - 0.25) + wig[0], -80 + wig[1]];
  if (TT < 1.75) return [lerp(-380, -210, (TT - 1.25) / 0.5) + wig[0], wig[1]];
  if (TT < 2.25) return [lerp(-180, -150, (TT - 1.75) / 0.5) + wig[0], -30 + wig[1]];
  const u = EZ.o3(ev(2.25, 0.3)); return [lerp(-150, 70, u), lerp(-30, 50, u)];
}
function sStudy(o = {}) {
  wall(PAL.navy, (bb) => { pat.stripes('rgba(255,255,255,0.045)', 30, 76)(bb); pat.dots('rgba(255,225,170,0.10)', 4, 76)(bb); });
  // window: the night, a moon, rooftops, one lit window
  cut(rect(560, 270, 360, 440, 6), PAL.woodD, { key: 'win' });
  cut(rect(584, 294, 312, 392, 2), PAL.night, { key: 'glass', shadow: false, pat: (bb) => { const R = RNG('st'); for (let i = 0; i < 40; i++) sparkle(R.r(bb.x0, bb.x1), R.r(bb.y0, bb.y0 + 250), R.r(3, 8)); } });
  ctx.save(); ctx.beginPath(); ctx.rect(584, 294, 312, 392); ctx.clip();
  cut(ellipsePts(800, 380, 44, 44, 0, 30), '#f6ecc8', { key: 'moon' }); cut(ellipsePts(822, 366, 40, 40, 0, 30), PAL.night, { key: 'moonc', shadow: false, grain: false, shade: false });
  cut([[570, 700], [570, 560], [640, 520], [700, 560], [700, 600], [760, 600], [760, 540], [820, 500], [880, 540], [910, 700]], '#0d1230', { key: 'roofs' });
  [[620, 600], [790, 580], [840, 620]].forEach(([x, y], i) => cut(rect(x, y, 22, 28, 1), PAL.yellow, { key: 'lw' + i, shadow: false }));
  ctx.restore();
  ink([[740, 294], [740, 686]], { w: 10, color: PAL.woodD, key: 'wbar' }); ink([[584, 490], [896, 490]], { w: 10, color: PAL.woodD, key: 'wbar2' });
  cut([[520, 250], [600, 250], [590, 760], [540, 790], [500, 760]], PAL.mustard, { key: 'curL', pat: pat.dots('rgba(255,255,255,0.35)', 4, 26) });
  cut([[880, 250], [960, 250], [980, 760], [930, 790], [890, 760]], PAL.mustard, { key: 'curR', pat: pat.dots('rgba(255,255,255,0.35)', 4, 26) });
  cut(rect(540, 700, 400, 34, 4), PAL.wood, { key: 'sill' });
  cat(720, 668, 0.85, PAL.charcoal, 'cat50');
  clock(240, 470, 100, 11, 52, 'ck50');
  // bookshelf
  cut(rect(70, 640, 360, 22, 3), PAL.wood, { key: 'sh1' }); cut(rect(70, 900, 360, 22, 3), PAL.wood, { key: 'sh2' });
  const R = RNG('shelf'), cols = [PAL.teal, PAL.pink, PAL.purple, PAL.yellow, PAL.blue, PAL.green, '#e7dcc0'];
  [[640, 0], [900, 1]].forEach(([y0, r]) => { let x = 86; for (let i = 0; i < 9 && x < 400; i++) { const w = R.r(26, 42), h = R.r(150, 210); const lean = i === 6 ? 0.25 : 0; cut(rot(rect(x, y0 - h, w, h, 3), x + w / 2, y0, lean), cols[R.i(0, 6)], { key: 'bs' + r + i, sb: 5, pat: pat.lines('rgba(255,255,255,0.35)', 1000, 24) }); x += w + (lean ? 26 : 3); } });
  // desk
  cut(rect(-30, 1100, W + 60, 900, 0), PAL.wood, { key: 'desk', tear: 0, pat: pat.grainWood('rgba(120,60,20,0.18)'), sy: -6 });
  // lamp + light
  cut(ellipsePts(170, 1150, 90, 26, 0, 24), PAL.lamp, { key: 'lbase' });
  cut(capsulePts(170, 1140, 250, 880, 22), '#c9a24a', { key: 'larm' });
  ctx.save(); const g = ctx.createRadialGradient(330, 900, 20, 420, 1200, 520); g.addColorStop(0, 'rgba(255,224,140,0.55)'); g.addColorStop(1, 'rgba(255,224,140,0)'); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(250, 905); ctx.lineTo(420, 905); ctx.lineTo(900, 1400); ctx.lineTo(60, 1400); ctx.closePath(); ctx.fill(); ctx.restore();
  cut([[200, 900], [240, 820], [430, 820], [470, 900]], PAL.lamp, { key: 'lshade', pat: pat.stripes('rgba(255,255,255,0.12)', 10, 30) });
  ctx.save(); ctx.translate(Math.sin(TT * 5.3) * 22, Math.cos(TT * 4.1) * 14);
  // a moth at the lamp
  cut(ellipsePts(500, 780, 22, 12, 0.6, 14), '#d8d0c4', { key: 'moth1', sb: 4 }); cut(ellipsePts(520, 790, 22, 12, -0.4, 14), '#cfc6b8', { key: 'moth2', sb: 4 }); dot(512, 788, 5); ctx.restore();
  // the page: "Can machines think" + the spark, sitting where the "?" was
  ctx.save(); ctx.translate(520, 1240); ctx.rotate(-0.05);
  cut(rect(-310, -190, 620, 380, 4), PAL.paper, { key: 'page', pat: pat.lines('rgba(90,130,190,0.30)', 52, 40) });
  handText('Can machines', -260, -64, 78, PAL.ink, { key: 'pq1', frac: o.end ? 1 : ev(0.25, 1.0) });
  const w = handText('think', -260, 40, 78, PAL.ink, { key: 'pq2', frac: o.end ? 1 : ev(1.25, 0.5) });
  ctx.setLineDash([8, 10]); ink([[-250 + w + 36, -14], [-250 + w + 56, -36], [-250 + w + 82, -26], [-250 + w + 74, 4], [-250 + w + 56, 18], [-250 + w + 56, 30]], { w: 3, color: 'rgba(42,29,24,0.4)', amt: 0.3, key: 'qghost', frac: o.end ? 0 : ev(1.75, 0.5) }); ctx.setLineDash([]);
  if (!o.end) handText('A. M. Turing', 60, 140, 40, 'rgba(42,29,24,0.6)', { key: 'pq3' });
  ctx.restore();
  if (!o.end) {
    spark(512, 1236, 50, { rays: 5, mood: TT < 3.0 ? 'wow' : 'smile', key: 'sp50', s: popS(2.25) });
    if (TT >= 2.25) [[452, 1180], [584, 1176], [560, 1290]].forEach(([x, y], i) => sparkle(x, y, (10 + i * 2) * (0.6 + 0.4 * ((B + i) % 2)), '#fff3c4'));
  } else {
    ctx.save(); ctx.translate(520, 1240); ctx.rotate(-0.05);
    handText('?', -260 + handW('think', 78) + 10, 40, 86, PAL.ink, { key: 'pqq' });
    handText('good question.', -200, 135, 66, PAL.orangeD, { key: 'pgq', frac: ev(56.5, 1.5) });
    ctx.restore();
    spark(850, 1000, 96, { rays: 12, mood: TT < 58.0 ? 'focus' : 'happy', key: 'spEnd' });
    cut(capsulePts(800, 1070, 720, 1300, 16), '#1d1a22', { key: 'pen2', sb: 5 });
    [[660, 980], [900, 990], [880, 1180]].forEach(([x, y], i) => sparkle(x, y, 14 + i * 3, '#fff3c4'));
  }
  // teacup, and Turing's hand with the pen
  mug(170, 1300, 0.85, '#e9e2d2', 'cup50');
  if (!o.end) { const [pdx, pdy] = penOff(); ctx.save(); ctx.translate(pdx, pdy); }
  if (!o.end) hand(900, 1360, 1.0, Math.PI * 1.12, PAL.skin1, PAL.tweed, { key: 'th', sleevePat: pat.stripes('rgba(40,30,20,0.25)', 3, 9, 0.8) });
  if (!o.end) { cut(capsulePts(810, 1310, 680, 1260, 18), '#1d1a22', { key: 'pen', sb: 5 }); cut([[684, 1252], [650, 1250], [682, 1270]], '#d8b24a', { key: 'nib', sb: 3 }); ctx.restore(); }
  yearTag(o.end ? 'today' : '1950');
  capStrip(o.end ? 'a short history of AI' : 'Turing asks: can machines think?');
}
// ---- 1974-1987: the winters; the lab is closed, the spark keeps a candle lit
function sWinter() {
  wall(PAL.sky, (bb) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#b9d4e4'); g.addColorStop(1, '#eaf3f8'); ctx.fillStyle = g; ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0); });
  cut([[-40, 980], [200, 860], [420, 940], [640, 820], [900, 900], [1120, 860], [1120, 1200], [-40, 1200]], '#e3eef5', { key: 'hills', pat: pat.stripes('rgba(140,175,200,0.18)', 4, 18, 0.3) });
  // bare trees
  [[110, 1000, 1], [960, 960, 0.8]].forEach(([x, y, s], i) => { cut(capsulePts(x, y + 40, x + 6, y - 260 * s, 26 * s), '#6e5038', { key: 'tr' + i }); [[-1, 0.5], [1, 0.35], [-1, 0.2], [1, 0.65]].forEach(([d, f], k) => cut(capsulePts(x + 2, y - 260 * s * f, x + d * 110 * s, y - 260 * s * f - 90 * s, 12 * s), '#6e5038', { key: 'tb' + i + k, sb: 4 })); });
  // the lab
  cut(rect(500, 700, 400, 420, 4), PAL.brick, { key: 'lab', pat: (bb) => { pat.lines('rgba(255,255,255,0.25)', 34)(bb); } });
  cut([[470, 720], [700, 560], [930, 720], [900, 740], [500, 740]], '#7d5b52', { key: 'roof' });
  cut([[480, 712], [700, 548], [922, 712], [870, 700], [800, 670], [700, 640], [600, 680], [520, 700]], PAL.snow, { key: 'roofsnow', sb: 6 });
  for (let i = 0; i < 9; i++) cut([[520 + i * 44, 738], [544 + i * 44, 738], [532 + i * 44, 738 + 26 + (i * 37) % 30]], '#e8f4fb', { key: 'ic' + i, sb: 3, grain: 0.2 });
  cut(rect(570, 790, 260, 70, 4), PAL.woodL, { key: 'sign' }); handText('AI LAB', 618, 845, 52, PAL.ink, { key: 'signt' });
  cut(rect(640, 900, 120, 220, 6), '#6b4a3a', { key: 'door' });
  ink([[670, 900], [700, 940], [730, 900]], { w: 3, color: PAL.ink, key: 'str' });
  ctx.save(); ctx.translate(700, 975); ctx.rotate(0.08 + Math.sin(TT * 2.2) * 0.07); cut(rect(-70, -32, 140, 64, 3), PAL.paper, { key: 'closed' }); handText('CLOSED', -58, 14, 34, '#b8463c', { key: 'closedt', weight: 700 }); ctx.restore();
  cut(rect(530, 880, 80, 90, 3), '#3d4a63', { key: 'w1' }); cut(rect(790, 880, 80, 90, 3), '#3d4a63', { key: 'w2' });
  // snow ground
  cut([[-40, 1120], [200, 1090], [500, 1130], [800, 1100], [1120, 1120], [1120, 2000], [-40, 2000]], PAL.snow, { key: 'ground', sy: -4, pat: pat.stripes('rgba(150,185,210,0.12)', 3, 22, 0.2) });
  for (let i = 0; i < 6; i++) cut(ellipsePts(690 - i * 70, 1150 + i * 44, 16, 8, 0.2, 12), 'rgba(150,180,205,0.55)', { key: 'fp' + i, shadow: false, grain: false, shade: false });
  // the piggy bank, empty, cobweb on the slot
  cut(ellipsePts(810, 1270, 110, 80, 0, 30), PAL.pink, { key: 'pig', crayon: '#e58aa9', crAl: 0.3 });
  cut(ellipsePts(905, 1260, 30, 34, 0, 20), PAL.pinkL, { key: 'snout' }); dot(898, 1254, 5, '#b05a78'); dot(912, 1254, 5, '#b05a78');
  cut([[740, 1200], [750, 1150], [790, 1192]], PAL.pink, { key: 'ear' }); [[745, 1335], [790, 1340], [850, 1338], [890, 1330]].forEach(([x, y], i) => cut(rect(x - 14, y, 28, 40, 6), PAL.pink, { key: 'leg' + i, sb: 4 }));
  face(860, 1240, 0.8, 'sad');
  ink([[790, 1196], [830, 1194]], { w: 6, color: PAL.ink, key: 'slot' });
  ink([[778, 1180], [842, 1210]], { w: 1.4, color: 'rgba(60,60,70,0.6)', key: 'web1' }); ink([[842, 1180], [778, 1212]], { w: 1.4, color: 'rgba(60,60,70,0.6)', key: 'web2' });
  // the spark: scarf, hat, shivering, holding a candle
  ctx.save(); ctx.translate(B % 2 ? 3 : -3, 0);
  spark(320, 1200, 104, { rays: 7, mood: 'sad', key: 'sp74' });
  cut([[250, 1250], [395, 1238], [400, 1272], [252, 1286]], PAL.teal, { key: 'scarf', pat: pat.stripes('rgba(255,255,255,0.45)', 10, 26) });
  cut([[350, 1270], [382, 1268], [372, 1360], [340, 1362]], PAL.teal, { key: 'scarft', pat: pat.stripes('rgba(255,255,255,0.45)', 10, 26, Math.PI / 2) });
  cut([[248, 1150], [262, 1086], [320, 1062], [378, 1086], [392, 1150]], PAL.blue, { key: 'hat', pat: pat.stripes('rgba(255,255,255,0.3)', 8, 22, Math.PI / 2) });
  cut(ellipsePts(320, 1058, 26, 24, 0, 18), PAL.snow, { key: 'pom' });
  ctx.restore();
  cut(rect(430, 1150, 22, 70, 4), '#f3ead0', { key: 'candle' });
  ctx.save(); const g = ctx.createRadialGradient(441, 1130, 2, 441, 1130, 90); g.addColorStop(0, 'rgba(255,214,120,0.7)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(340, 1030, 200, 200); ctx.restore();
  cut([[441 + Math.sin(TT * 9) * 4, 1094 + (B % 3) * 5], [454, 1132], [441, 1146], [428, 1132]], PAL.yellow, { key: 'flame', sb: 4 });
  [[200, 1190], [208, 1220], [452, 1250], [460, 1280]].forEach(([x, y], i) => ink([[x, y], [x + (i < 2 ? -18 : 18), y - 6]], { w: 4, color: '#6f93ad', key: 'shiv' + i }));
  // birds on a wire
  ink([[-20, 520], [300, 580], [520, 600]], { w: 3, color: '#4a4550', amt: 0.6, key: 'wire' });
  [[120, 545], [190, 558], [250, 570]].forEach(([x, y], i) => { cut(ellipsePts(x, y - 22, 26, 22, 0, 20), '#5a6a86', { key: 'bd' + i, sb: 4 }); dot(x + 10, y - 30, 3.5); cut([[x + 22, y - 28], [x + 36, y - 24], [x + 22, y - 20]], PAL.yellow, { key: 'bk' + i, shadow: false }); });
  // snow falling
  const S = RNG('flakes');
  for (let i = 0; i < 150; i++) { const x = S.r(-10, W + 10) + Math.sin(TT * 1.3 + i) * 12, r = S.r(4, 13), y = 200 + mod(S.r(0, 1500) + TT * (40 + r * 6), 1500); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  yearTag('1974');
  capStrip('AI winter: the money runs out');
}
// ---- November 30, 2022: everyone says hi at once
function sHi() {
  wall(PAL.pink, (bb) => { ctx.fillStyle = PAL.pinkL; for (let i = 0; i < 28; i += 2) { const a0 = i / 28 * TAU, a1 = (i + 1) / 28 * TAU; ctx.beginPath(); ctx.moveTo(470, 920); ctx.lineTo(470 + Math.cos(a0) * 2400, 920 + Math.sin(a0) * 2400); ctx.lineTo(470 + Math.cos(a1) * 2400, 920 + Math.sin(a1) * 2400); ctx.closePath(); ctx.fill(); } });
  const R = RNG('conf'), cc = [PAL.teal, PAL.yellow, PAL.purple, PAL.mint, '#ffffff', PAL.blue];
  for (let i = 0; i < 140; i++) { const x = R.r(0, W), y = 180 + mod(R.r(0, 1620) + Math.max(0, TT - 46) * 160, 1620), a = R.r(0, 3) + TT * 2; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = cc[i % cc.length]; ctx.fillRect(-9, -4, 18, 8); ctx.restore(); }
  // bubbles fly in from every side
  const B0 = [];
  const fills = [PAL.paper, '#e7f4ff', PAL.mint, '#efe6ff', '#fff3c8'];
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + R.n(0.12), d = R.r(330, 560); B0.push({ x: 470 + Math.cos(a) * d * 0.92, y: 900 + Math.sin(a) * d * 1.05, w: R.r(150, 230), h: R.r(86, 110), a, k: i }); }
  B0.forEach((b) => {
    const rr = R.n(0.12), kf = EZ.o3(ev(46 + b.k * 0.07, 0.3)); if (kf <= 0) return;
    b = { ...b, x: b.x + (1 - kf) * (b.x - 470) * 1.4, y: b.y + (1 - kf) * (b.y - 900) * 1.4 };
    const sx = Math.cos(b.a), sy = Math.sin(b.a);
    for (let l = 0; l < 3; l++) ink([[b.x + sx * (b.w * 0.6 + 20 + l * 6) + (l - 1) * sy * 26, b.y + sy * (b.h * 0.7 + 20) - (l - 1) * sx * 26], [b.x + sx * (b.w * 0.6 + 90 + l * 10) + (l - 1) * sy * 26, b.y + sy * (b.h * 0.7 + 90) - (l - 1) * sx * 26]], { w: 4, color: 'rgba(255,255,255,0.7)', key: 'spd' + b.k + l });
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(rr);
    cut([[-b.w / 2 + 30, b.h / 2 - 4], [-b.w / 2 + 6, b.h / 2 + 28], [-b.w / 2 + 64, b.h / 2 - 4]], fills[b.k % 5], { key: 'bt' + b.k, sb: 4 });
    cut(rect(-b.w / 2, -b.h / 2, b.w, b.h, 30), fills[b.k % 5], { key: 'bb' + b.k });
    const kind = b.k % 5;
    if (kind === 0) handText('hi!', -b.w / 2 + 34, 16, 50, PAL.ink, { key: 'bh' + b.k });
    else if (kind === 1) { cut(ellipsePts(-b.w / 2 + 44, 0, 26, 26, 0, 20), PAL.yellow, { key: 'em' + b.k, sb: 3 }); face(-b.w / 2 + 44, -2, 0.42, 'happy'); ink([[-b.w / 2 + 84, -10], [b.w / 2 - 24, -10]], { w: 6, color: 'rgba(42,29,24,0.4)', key: 'bl1' + b.k }); ink([[-b.w / 2 + 84, 14], [b.w / 2 - 50, 14]], { w: 6, color: 'rgba(42,29,24,0.4)', key: 'bl2' + b.k }); }
    else if (kind === 2) handText('write me a poem', -b.w / 2 + 22, 12, 30, PAL.ink, { key: 'bp' + b.k });
    else if (kind === 3) { handText('?', -10, 24, 70, PAL.purple, { key: 'bq' + b.k, weight: 700 }); }
    else { cut([[-14, -18], [0, -4], [14, -18], [24, -6], [0, 22], [-24, -6]], '#e85d75', { key: 'hrt' + b.k, sb: 3 }); }
    ctx.restore();
  });
  // the spark at the centre, delighted
  spark(470, 920, 150, { rays: 11, mood: 'happy', key: 'sp22', s: 0.75 + 0.25 * EZ.back(ev(46, 0.3)) });
  [[300, 760], [650, 740], [620, 1090], [300, 1080]].forEach(([x, y], i) => sparkle(x, y, 18 + (i % 2) * 8));
  // phones held up from the bottom
  [[170, 1560, -0.25, PAL.skin1, PAL.purple], [470, 1610, 0, PAL.skin3, PAL.yellow], [790, 1570, 0.22, PAL.skin2, PAL.teal]].forEach(([x, y, a, skin, sl], i) => {
    ctx.save(); ctx.translate(x, y + (1 - EZ.o3(ev(46 + i * 0.1, 0.35))) * 460); ctx.rotate(a);
    cut(rect(-60, 60, 120, 400, 40), sl, { key: 'psl' + i });
    cut(rect(-70, -120, 140, 250, 22), '#2b2a33', { key: 'ph' + i });
    cut(rect(-58, -106, 116, 220, 12), '#f6f1e6', { key: 'phs' + i, shadow: false });
    ink([[-40, -70], [30, -70]], { w: 7, color: 'rgba(42,29,24,0.35)', key: 'pl1' + i }); ink([[-40, -40], [10, -40]], { w: 7, color: 'rgba(236,122,79,0.7)', key: 'pl2' + i });
    cut(ellipsePts(0, 80, 76, 58, 0, 22), skin, { key: 'pha' + i });
    ctx.restore();
  });
  yearTag('Nov 30, 2022');
  capStrip('ChatGPT: millions say hi');
}
// ---- 2025: the spark has a job; it helps a developer ship
function sWork() {
  wall(PAL.mint, (bb) => { pat.dots('rgba(255,255,255,0.35)', 5, 54)(bb); });
  cut(rect(600, 280, 320, 330, 6), PAL.woodD, { key: 'win25' });
  cut(rect(622, 302, 276, 286, 2), '#bfe3f4', { key: 'sky25', shadow: false });
  ctx.save(); ctx.beginPath(); ctx.rect(622, 302, 276, 286); ctx.clip();
  cut(ellipsePts(700, 360, 50, 22, 0, 20), '#ffffff', { key: 'cl1', sb: 4 }); cut(ellipsePts(830, 400, 40, 18, 0, 20), '#ffffff', { key: 'cl2', sb: 4 });
  [[630, 470, 60, 140], [690, 430, 50, 180], [745, 490, 70, 120], [815, 450, 60, 160], [870, 500, 40, 100]].forEach(([x, y, w, h], i) => cut(rect(x, y, w, h, 2), ['#7c8fb8', '#9aa8c8', '#6f82ad', '#8ea0c4', '#7a8cb3'][i], { key: 'bld' + i, sb: 4, pat: pat.dots('rgba(255,240,180,0.7)', 3, 16) }));
  ctx.restore();
  ink([[760, 302], [760, 588]], { w: 8, color: PAL.woodD, key: 'wb25' });
  // the framed page from 1950, on the wall
  cut(rect(110, 440, 250, 200, 4), PAL.woodD, { key: 'frame' }); cut(rect(126, 456, 218, 168, 2), PAL.paper, { key: 'framep', shadow: false, pat: pat.lines('rgba(90,130,190,0.3)', 26, 20) });
  handText('Can machines', 140, 530, 34, PAL.ink, { key: 'fq1' }); handText('think?', 140, 572, 34, PAL.ink, { key: 'fq2' });
  clock(470, 390, 74, 3, 0, 'ck25');
  [[100, 730, PAL.yellow, -0.08], [190, 790, PAL.pinkL, 0.06], [560, 690, '#bfe0ff', -0.05]].forEach(([x, y, c, a], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); cut(rect(-50, -50, 100, 100, 2), c, { key: 'sn' + i, sb: 5 }); ink([[-24, 2], [-6, 20], [26, -18]], { w: 6, color: PAL.greenD, key: 'snt' + i }); ctx.restore(); });
  // the developer
  person(330, 1000, 1.05, { key: 'dev', skin: PAL.skin3, hair: '#231a17', beard: true, glasses: true, mood: TT >= 54.5 ? 'happy' : 'smile', shirt: '#c0504a', shirtPat: (bb) => { pat.stripes('rgba(255,255,255,0.28)', 8, 40)(bb); pat.stripes('rgba(60,20,20,0.25)', 8, 40, Math.PI / 2)(bb); } });
  // desk
  cut(rect(-30, 1180, W + 60, 900, 0), PAL.wood, { key: 'desk25', tear: 0, pat: pat.grainWood('rgba(120,60,20,0.18)'), sy: -6 });
  plant(110, 1160, 0.9, PAL.blue, 'pl25');
  mug(250, 1210, 0.9, PAL.yellow, 'mug25');
  // the laptop, screen facing us: the terminal
  cut([[480, 1190], [960, 1190], [1000, 1240], [440, 1240]], '#b8bcc8', { key: 'lapb' });
  cut(rect(500, 840, 440, 350, 14), '#9ea3b2', { key: 'lapl' });
  cut(rect(518, 858, 404, 314, 6), '#1b1f3b', { key: 'laps', shadow: false });
  monoText('> fix the failing test', 536, 906, 22, '#c8d0f0', { key: 'ln1', count: Math.floor(22 * ev(51.5, 0.75)) });
  [['Read', 948], ['Edit', 994], ['Bash', 1040]].forEach(([t, y], i) => { if (TT < 52.5 + i * 0.5) return; cut(rect(536, y - 30, 160, 40, 10), PAL.paper, { key: 'tp' + i, sb: 3, grain: 0.4 }); dot(556, y - 10, 7, PAL.green); monoText(t + '(…)', 572, y - 2, 20, PAL.ink, { key: 'tpt' + i }); });
  if (TT >= 54.5) { monoText('12 passed', 566, 1110, 26, '#5de37a', { key: 'ln2' }); ink([[536, 1100], [548, 1112], [560, 1090]], { w: 5, color: '#5de37a', key: 'tk25', frac: ev(54.5, 0.2) }); }
  // the spark (now Claude's asterisk) sits on top of the screen, pleased
  spark(800, 732, 88, { rays: 12, mood: TT < 54.5 ? 'focus' : 'happy', key: 'sp25' });
  sparkle(910, 640, 16, '#ffffff'); sparkle(690, 650, 12, '#ffffff');
  cat(470, 1400, 0.95, PAL.charcoal, 'cat25');
  yearTag('2025');
  capStrip('Claude Code: AI that does the work');
}

// =====================================================================
//  STORYBOARD v2: 15 beats, 60s, in the cut-paper look. The four style frames are reused.
// =====================================================================
const CHALK2 = '#ecefe4';
function personBack(x, y, s, o = {}) {   // seen from behind: shoulders at y
  const key = o.key ?? 'pb';
  cut(rect(x - 120 * s, y, 240 * s, 300 * s, 80 * s), o.shirt ?? PAL.blue, { key: key + 't', pat: o.pat });
  cut(ellipsePts(x - 70 * s, y - 100 * s, 14 * s, 20 * s, 0, 14), o.skin ?? PAL.skin1, { key: key + 'el' });
  cut(ellipsePts(x + 70 * s, y - 100 * s, 14 * s, 20 * s, 0, 14), o.skin ?? PAL.skin1, { key: key + 'er' });
  cut(ellipsePts(x, y - 104 * s, 72 * s, 84 * s, 0, 30), o.hair ?? '#3a2a22', { key: key + 'h', pat: o.hairPat });
}
function stringLine(x1, y1, x2, y2, key, c = PAL.orange, w = 4, frac = 1) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 30, P = [];
  for (let k = 0; k <= 16; k++) { const u = k / 16; P.push([(1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2]); }
  ink(P, { w, color: c, amt: 0.6, key, frac });
}
const pin = (x, y, c = '#d9443a') => { dot(x + 2, y + 3, 9, 'rgba(0,0,0,0.25)'); dot(x, y, 9, c); dot(x - 3, y - 3, 3, 'rgba(255,255,255,0.7)'); };
function photo(x, y, w, h, kind, k, rotA = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotA);
  cut(rect(-w / 2, -h / 2, w, h, 3), PAL.paper, { key: 'ph' + k, sb: 6 });
  cut(rect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 34, 2), ['#cfe3ee', '#e9dcc4', '#d6e8cf', '#efe0e6'][k % 4], { key: 'phi' + k, shadow: false, grain: 0.5 });
  ctx.save(); ctx.scale(w / 220, w / 220); doodle(kind, 0, -8, k * 10); ctx.restore();
  ctx.restore();
}
function doodle(kind, x, y, k) {
  const o = (P, cl = false) => ink(P, { closed: cl, w: 4, color: PAL.ink, key: 'dd' + kind + k++ });
  if (kind === 'cat') { o(ellipsePts(x, y + 10, 52, 46, 0, 28), true); o([[x - 44, y - 14], [x - 34, y - 62], [x - 10, y - 32]]); o([[x + 44, y - 14], [x + 34, y - 62], [x + 10, y - 32]]); dot(x - 18, y + 4, 5); dot(x + 18, y + 4, 5); o([[x - 50, y + 22], [x - 14, y + 18]]); o([[x + 50, y + 22], [x + 14, y + 18]]); }
  if (kind === 'car') { o(rrectPts(x - 70, y - 10, 140, 44, 10), true); o([[x - 40, y - 10], [x - 22, y - 44], [x + 26, y - 44], [x + 44, y - 10]]); o(ellipsePts(x - 38, y + 38, 15, 15, 0, 14), true); o(ellipsePts(x + 38, y + 38, 15, 15, 0, 14), true); }
  if (kind === 'mug') { o(rrectPts(x - 40, y - 46, 80, 96, 8), true); o(arcPts(x + 40, y, 26, -1.4, 1.4, 12)); }
  if (kind === 'fish') { o(ellipsePts(x - 10, y, 58, 32, 0, 24), true); o([[x + 46, y], [x + 76, y - 28], [x + 76, y + 28], [x + 46, y]]); dot(x - 40, y - 6, 5); }
  if (kind === 'house') { o(rrectPts(x - 52, y - 20, 104, 76, 2), true); o([[x - 64, y - 16], [x, y - 70], [x + 64, y - 16]]); }
  if (kind === 'dog') { o(ellipsePts(x, y + 14, 56, 34, 0, 24), true); o(ellipsePts(x + 52, y - 26, 26, 24, 0, 18), true); o(ellipsePts(x + 34, y - 26, 10, 22, 0.4, 12), true); dot(x + 58, y - 30, 4.5); }
  if (kind === 'bird') { o(ellipsePts(x, y, 50, 32, -0.1, 24), true); o([[x + 46, y - 14], [x + 74, y - 6], [x + 46, y + 2]]); dot(x + 26, y - 10, 4.5); }
  if (kind === 'apple') { o(ellipsePts(x, y + 8, 50, 48, 0, 28), true); o([[x, y - 40], [x + 6, y - 64]]); }
  if (kind === 'tri') { o([[x, y - 50], [x + 54, y + 40], [x - 54, y + 40]], true); }
  if (kind === 'sq') { o(rrectPts(x - 44, y - 44, 88, 88, 2), true); }
}
function floorTiles(y0, c1, c2) { cut(rect(-30, y0, W + 60, H - y0 + 40, 0), c1, { key: 'floor' + y0, tear: 0, sy: -5, pat: (bb) => { ctx.fillStyle = c2; for (let y = bb.y0; y < bb.y1; y += 90) for (let x = bb.x0 + ((y / 90) % 2) * 90; x < bb.x1; x += 180) ctx.fillRect(x, y, 90, 90); } }); }

// ---- 1956: summer school; the field is named, and the spark gets a name tag
function sDartmouth() {
  wall('#f0cf78', pat.stripes('rgba(255,255,255,0.20)', 44, 110));
  cut(rect(720, 250, 220, 330, 6), PAL.woodD, { key: 'dwin' });
  cut(rect(736, 266, 188, 298, 2), '#bfe3f4', { key: 'dsky', shadow: false });
  ctx.save(); ctx.beginPath(); ctx.rect(736, 266, 188, 298); ctx.clip();
  cut(ellipsePts(830, 520, 120, 100, 0, 30), PAL.green, { key: 'dtree', pat: pat.dots('rgba(255,255,255,0.18)', 6, 30) }); cut(ellipsePts(880, 330, 36, 36, 0, 24), PAL.yellow, { key: 'dsun' });
  ctx.restore();
  cut([[80, 470], [400, 520], [80, 570]], PAL.greenD, { key: 'pennant' }); handText('summer 1956', 100, 532, 32, '#ffffff', { key: 'pent' });
  clock(560, 400, 70, 2, 10, 'ckd');
  cut(rect(60, 640, 830, 490, 10), PAL.woodD, { key: 'cbf' });
  cut(rect(84, 664, 782, 442, 6), '#2d463b', { key: 'cb', crayon: 'rgba(230,240,230,0.5)', crAl: 0.12, crPer: 60 });
  handText('artificial', 130, 810, 110, CHALK2, { key: 'ai1', frac: ev(4.0, 0.75) });
  const w = handText('intelligence', 130, 950, 110, CHALK2, { key: 'ai2', frac: ev(4.75, 0.75) });
  ink([[126, 980], [130 + w * 0.5, 990], [134 + w, 976]], { color: CHALK2, w: 7, amt: 2.4, key: 'aiu', frac: ev(5.5, 0.25) });
  // chalk doodles: a stick robot and a brain
  ink(rect(740, 780, 60, 70, 4), { closed: true, color: CHALK2, w: 4, key: 'rob1' }); ink(rect(750, 740, 40, 38, 4), { closed: true, color: CHALK2, w: 4, key: 'rob2' }); dot(762, 758, 4, CHALK2); dot(778, 758, 4, CHALK2);
  ink([[770, 740], [770, 720]], { color: CHALK2, w: 3, key: 'rob3' }); dot(770, 716, 6, CHALK2);
  handText('a summer research project', 132, 1070, 36, 'rgba(236,239,228,0.75)', { key: 'ai3' });
  cut(rect(70, 1118, 810, 26, 5), PAL.wood, { key: 'tray' });
  cut(rect(160, 1100, 60, 18, 7), CHALK2, { key: 'chalk1', sb: 3 }); cut(rect(250, 1096, 90, 26, 6), '#7a6a5c', { key: 'eraser', sb: 3 });
  mug(830, 1066, 0.5, '#e9e2d2', 'dmug', true);
  // the spark on the chalk tray, wearing a name tag
  const dropY = -560 * (1 - EZ.o3(ev(5.75, 0.3)));
  if (TT >= 5.75) spark(680, 1030 + dropY, 84, { rays: 6, mood: TT < 6.5 ? 'wow' : 'happy', key: 'sp56' });
  if (TT >= 6.5) { ctx.save(); ctx.translate(680, 1074); ctx.rotate(-0.08); ctx.scale(popS(6.5), popS(6.5));
  cut(rect(-52, -30, 104, 62, 4), PAL.paper, { key: 'ntag', sb: 4 }); cut(rect(-52, -30, 104, 18, 2), PAL.blue, { key: 'ntagb', shadow: false, grain: 0.3 });
  handText('AI', -18, 26, 34, PAL.ink, { key: 'ntagt' }); ctx.restore(); }
  // the summer school, from behind
  personBack(170, 1330 + (Math.floor(TT * 2) % 2) * 6, 1.0, { key: 'p1', shirt: '#e9e2d2', hair: '#8a6a44' });
  personBack(470, 1370 + (Math.floor(TT * 2 + 1) % 2) * 6, 1.05, { key: 'p2', shirt: PAL.blue, hair: '#2f2622', pat: pat.stripes('rgba(255,255,255,0.18)', 6, 26) });
  personBack(790, 1330 + (Math.floor(TT * 2) % 2) * 5, 1.0, { key: 'p3', shirt: '#7a6650', hair: '#b9b3aa' });
  yearTag('1956');
  capStrip('Dartmouth: the field gets its name');
}
// ---- 1958: the Mark I perceptron; the spark turns the knobs (the weights) until the triangle reads "yes"
function sPerceptron() {
  wall('#cfdccf', pat.stripes('rgba(255,255,255,0.22)', 3, 60));
  floorTiles(1260, '#bfc8c0', '#aab4ac');
  // the machine: a wall of knobs and a patch panel of cables
  cut(rect(80, 520, 780, 700, 10), '#8e9aa6', { key: 'mk', pat: pat.lines('rgba(255,255,255,0.18)', 120, 60) });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const x = 160 + c * 120, y = 600 + r * 110; cut(ellipsePts(x, y, 34, 34, 0, 22), '#3b3f4a', { key: 'kn' + r + c, sb: 5 }); const a = (r * 6 + c) * 1.7 + TT * (0.6 + ((r + c) % 3) * 0.3) * ((r + c) % 2 ? 1 : -1); ink([[x, y], [x + Math.cos(a) * 26, y + Math.sin(a) * 26]], { w: 5, color: '#e8e2d2', key: 'knl' + r + c }); }
  cut(rect(130, 940, 680, 240, 6), '#2f3440', { key: 'patch' });
  const R = RNG('cables'), cc = [PAL.yellow, PAL.teal, PAL.pink, PAL.blue, PAL.green, '#e8e2d2', PAL.purple];
  for (let i = 0; i < 16; i++) { const x1 = R.r(160, 780), x2 = R.r(160, 780), y1 = R.r(960, 1000), y2 = R.r(1120, 1160); const P = []; for (let k = 0; k <= 12; k++) { const u = k / 12; P.push([lerp(x1, x2, u), lerp(y1, y2, u) + Math.sin(u * Math.PI) * R.r(30, 90)]); } ink(P, { w: 7, color: cc[i % 7], key: 'cab' + i }); dot(x1, y1, 7, '#1d1f26'); dot(x2, y2, 7, '#1d1f26'); }
  // the eye: a 20x20 grid of photocells, looking at a card with a triangle
  cut(rect(640, 300, 220, 200, 8), '#3b3f4a', { key: 'eye' });
  ctx.fillStyle = '#9fb4c4'; for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) { const on = Math.abs(i - 4) <= j * 0.55 && j > 1 && (j * 9 + i) < (TT - 8.25) * 36; ctx.fillStyle = on ? '#f6e7a8' : '#5d6878'; ctx.fillRect(656 + i * 22, 318 + j * 21, 16, 15); }
  ctx.save(); ctx.translate(430, 400); ctx.rotate(-0.06); cut(rect(-90, -90, 180, 180, 4), PAL.paper, { key: 'card' }); doodle('tri', 0, 10, 1); ctx.restore();
  ink([[530, 400], [630, 400]], { w: 3, color: 'rgba(42,29,24,0.4)', key: 'sight' });
  // the readout lamp says YES
  cut(ellipsePts(780, 1240, 46, 46, 0, 24), TT >= 10.5 ? '#79c27a' : '#5d6878', { key: 'lampY' });
  if (TT >= 10.5) { const k = popS(10.5); ctx.save(); ctx.translate(780, 1310); ctx.scale(k, k); handText('yes!', -44, 16, 48, PAL.ink, { key: 'yes' }); ctx.restore(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r1 = 58 + 10 * (B % 2); ink([[780 + Math.cos(a) * r1, 1240 + Math.sin(a) * r1], [780 + Math.cos(a) * (r1 + 22), 1240 + Math.sin(a) * (r1 + 22)]], { w: 5, color: '#79c27a', key: 'yr' + i }); } }
  // the spark hangs on the big knob, turning it
  cut(ellipsePts(470, 830, 70, 70, 0, 30), '#3b3f4a', { key: 'bigknob' }); ink([[470, 830], [470 + Math.cos(-0.7 + TT * 2.2) * 60, 830 + Math.sin(-0.7 + TT * 2.2) * 60]], { w: 8, color: '#e8e2d2', key: 'bkl' });
  spark(420, 760, 80, { rays: 6, mood: TT >= 10.5 ? 'happy' : 'focus', key: 'sp58', rot: -Math.PI / 2 + TT * 0.6 });
  // lab details: a clipboard, a hanging bulb
  ink([[880, 160], [880, 250]], { w: 3, color: PAL.ink, key: 'cord' }); cut(ellipsePts(880, 270, 22, 26, 0, 18), '#fff3c4', { key: 'bulb' });
  ctx.save(); ctx.translate(150, 1330); ctx.rotate(0.1); cut(rect(-60, -80, 120, 160, 4), PAL.woodL, { key: 'clip' }); cut(rect(-48, -60, 96, 130, 2), PAL.paper, { key: 'clipp', shadow: false, pat: pat.lines('rgba(90,130,190,0.4)', 18, 10) }); ctx.restore();
  yearTag('1958');
  capStrip('the perceptron learns from examples');
}
// ---- 1966: ELIZA (close-up): the teletype prints a reply; the spark peeks over the paper
function sEliza() {
  wall('#c9b9da', pat.dots('rgba(255,255,255,0.3)', 10, 64));
  cut(rect(-30, 1250, W + 60, 800, 0), '#8a6a4c', { key: 'edesk', tear: 0, pat: pat.grainWood('rgba(60,30,10,0.2)'), sy: -6 });
  // lava lamp + rotary phone
  cut([[790, 820], [850, 820], [880, 1200], [760, 1200]], '#b7a0e8', { key: 'lava' }); cut(ellipsePts(812, 960, 22, 34, 0, 18), '#e85d75', { key: 'blob1', sb: 3 }); cut(ellipsePts(835, 1080, 26, 30, 0, 18), '#e85d75', { key: 'blob2', sb: 3 });
  cut(rect(740, 1190, 160, 70, 10), '#5a5560', { key: 'lavab' });
  // the paper roll, big
  ctx.save(); ctx.translate(430, 860); ctx.rotate(-0.02);
  cut(rect(-300, -480, 600, 820, 4), PAL.paper, { key: 'roll', pat: pat.lines('rgba(120,160,120,0.18)', 64, 20) });
  const L = [['> I FEEL SAD TODAY.', PAL.ink], ['WHY DO YOU FEEL', '#3a5aa8'], ['SAD TODAY?', '#3a5aa8'], ['> MY MOTHER WORRIES.', PAL.ink], ['TELL ME MORE ABOUT', '#3a5aa8'], ['YOUR FAMILY.', '#3a5aa8']];
  const T0 = [12.25, 13.0, 13.25, 14.0, 14.9, 15.15], D0 = [0.75, 0.25, 0.25, 0.75, 0.25, 0.25];
  L.forEach(([s, c], i) => monoText(s, -260, -150 + i * 62 + (i > 2 ? 40 : 0), 34, c, { key: 'el' + i, count: Math.floor(s.length * ev(T0[i], D0[i])) }));
  ctx.restore();
  // the spark peeks over the top of the paper
  spark(560, 420, 86, { rays: 7, mood: TT < 14.9 ? 'wow' : 'happy', key: 'sp66', s: popS(13.25) });
  // speech marks
  if (TT >= 13.5) handText('!', 690, 360, 80, PAL.ink, { key: 'excl', weight: 700 });
  // the teletype + hands typing
  cut(rect(90, 1180, 700, 260, 22), '#d7d0bc', { key: 'tt', pat: pat.stripes('rgba(0,0,0,0.06)', 4, 18) });
  cut(rect(120, 1160, 640, 50, 25), '#3b3438', { key: 'platen' });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9 - r; c++) cut(ellipsePts(190 + c * 66 + r * 30, 1270 + r * 56, 24, 18, 0, 14), PAL.paper, { key: 'k' + r + c, sb: 3, grain: 0.3 });
  const typing = (TT >= 12.25 && TT < 13.0) || (TT >= 14.0 && TT < 14.75);
  hand(80, 1500 + (typing ? (B % 2) * 12 : 0), 0.9, -0.7, PAL.skin1, '#d9a441', { key: 'eh1' });
  hand(760, 1520 + (typing ? ((B + 1) % 2) * 12 : 0), 0.9, Math.PI + 0.75, PAL.skin1, '#d9a441', { key: 'eh2' });
  yearTag('1966');
  capStrip('ELIZA talks back');
}
// ---- 1986: still winter outside; inside, by candlelight, the spark learns from its mistakes
function sBackprop() {
  wall('#2f5a5c', pat.stripes('rgba(255,255,255,0.05)', 22, 64));
  // window: snow outside
  cut(rect(620, 260, 300, 360, 6), PAL.woodD, { key: 'bwin' }); cut(rect(640, 280, 260, 320, 2), '#1c2a48', { key: 'bnight', shadow: false });
  const S = RNG('bsnow'); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(S.r(645, 895), S.r(285, 595), S.r(2, 6), 0, TAU); ctx.fill(); }
  cut([[640, 600], [640, 560], [720, 540], [800, 560], [900, 545], [900, 600]], PAL.snow, { key: 'bsill', shadow: false });
  ink([[770, 280], [770, 600]], { w: 8, color: PAL.woodD, key: 'bbar' });
  cut(rect(600, 610, 340, 30, 4), PAL.wood, { key: 'bsill2' });
  // a wall chart of a layered net, with arrows running backward
  ctx.save(); ctx.translate(350, 650); ctx.rotate(-0.04);
  cut(rect(-230, -200, 460, 400, 4), PAL.paper, { key: 'chart' });
  const lay = [[-150, [-100, 0, 100]], [0, [-130, -45, 45, 130]], [150, [-60, 60]]];
  for (let a = 0; a < 2; a++) for (const y1 of lay[a][1]) for (const y2 of lay[a + 1][1]) ink([[lay[a][0], y1], [lay[a + 1][0], y2]], { w: 2, color: 'rgba(42,29,24,0.45)', amt: 0.3, key: 'nl' + a + y1 + y2 });
  lay.forEach(([x, ys], a) => ys.forEach((y) => cut(ellipsePts(x, y, 20, 20, 0, 16), PAL.paper, { key: 'nn' + a + y, line: PAL.ink, lw: 3, sb: 2 })));
  [[-60, -150], [60, -150]].forEach(([y0], i) => {});
  ink([[130, -170], [-130, -170]], { w: 6, color: '#3a5aa8', key: 'bpa', frac: ev(22.75, 0.5) }); if (TT >= 23.25) { ink([[-112, -184], [-132, -170], [-112, -156]], { w: 6, color: '#3a5aa8', key: 'bpah' });
  handText('error, sent back', -110, -178, 28, '#3a5aa8', { key: 'bpt' }); }
  ctx.restore();
  // desk, candle, crumpled tries on the floor
  cut(rect(-30, 1150, W + 60, 900, 0), PAL.woodD, { key: 'bdesk', tear: 0, pat: pat.grainWood('rgba(40,20,5,0.25)'), sy: -6 });
  ctx.save(); const g = ctx.createRadialGradient(240, 1060, 10, 240, 1060, 420); g.addColorStop(0, 'rgba(255,214,120,0.5)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(-100, 700, 700, 800); ctx.restore();
  cut(rect(222, 1050, 34, 110, 4), '#f3ead0', { key: 'bcan' }); cut([[239, 1004], [256, 1040], [239, 1056], [222, 1040]], PAL.yellow, { key: 'bflame', sb: 4 });
  ctx.save(); ctx.translate(560, 1230); ctx.rotate(0.05); cut(rect(-200, -90, 400, 180, 4), PAL.paper, { key: 'bnote', pat: pat.lines('rgba(90,130,190,0.3)', 34, 20) });
  handText('try again', -170, -10, 48, PAL.ink, { key: 'bn1', frac: ev(22.25, 0.5) }); handText('closer...', -170, 50, 48, PAL.ink, { key: 'bn2', frac: ev(23.5, 0.5) }); ctx.restore();
  const C2 = RNG('crump'); for (let i = 0; i < 7; i++) { const x = C2.r(100, 900), y = C2.r(1380, 1500), rr = C2.r(0, 3); if (TT < 22.1 + i * 0.4) continue; cut(ellipsePts(x, y - 300 * (1 - EZ.i2(ev(22.1 + i * 0.4, 0.2))), 36, 32, rr, 9), '#f1ebdc', { key: 'cr' + i, tear: 5, sb: 6 }); }
  // the spark, with a pencil, determined
  spark(400, 1060, 92, { rays: 8, mood: TT >= 24.25 ? 'happy' : 'focus', key: 'sp86' });
  drawPencil(470, 1120, -0.5, 170, 0.8, 'bpen');
  cut(rect(830, 1100, 80, 56, 6), '#e58f8c', { key: 'eraser2', sb: 4 });
  yearTag('1986');
  capStrip('neural nets learn from their mistakes');
}
// ---- 1997: Deep Blue (close-up at the board): a big human hand tips over its king; the spark sits on the blue cabinet
function sChess() {
  wall('#2b2f45', pat.dots('rgba(255,255,255,0.06)', 6, 50));
  // camera flashes in the dark audience
  [[140, 330], [420, 280], [860, 360], [300, 420], [700, 250]].forEach(([x, y], i) => { if ((B + i * 3) % 7 > 1) return; sparkle(x, y, 40, 'rgba(255,255,255,0.85)'); sparkle(x, y, 18, '#ffffff'); });
  for (let i = 0; i < 8; i++) { const x = 60 + i * 130, y = 600 + (i % 2) * 30; cut(rect(x - 70, y + 30, 140, 160, 60), '#1b1e2e', { key: 'auds' + i, shadow: false }); cut(ellipsePts(x, y, 44, 50, 0, 20), '#1b1e2e', { key: 'aud' + i, shadow: false }); }
  // the cabinet
  cut(rect(600, 420, 300, 700, 10), '#2f55a8', { key: 'cab', pat: pat.stripes('rgba(255,255,255,0.08)', 4, 28) });
  const R = RNG('leds', B >> 1); for (let i = 0; i < 30; i++) dot(640 + (i % 6) * 44, 480 + Math.floor(i / 6) * 40, 7, R.f() < 0.4 ? '#79c27a' : R.f() < 0.5 ? PAL.yellow : '#9fb4e8');
  spark(750, 360, 84, { rays: 8, mood: TT < 27.0 ? 'focus' : TT < 27.75 ? 'wow' : 'happy', key: 'sp97' });
  // the board, low and close
  cut([[-30, 1000], [1110, 1000], [1110, 1600], [-30, 1600]], '#6e4a30', { key: 'table', tear: 0, sy: -4 });
  ctx.save(); for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? '#8a5a34' : '#e9d3a8'; const y = 1040 + r * 120, h = 120; ctx.fillRect(-60 + c * 150 + r * 0, y, 150, h); } ctx.restore();
  ink([[-30, 1040], [1110, 1040]], { w: 4, key: 'bedge' });
  chessPiece(260, 1260, 1.6, 'king', '#2f2a2c', 'kk', -1.3 * EZ.i2(ev(26.75, 0.25)));
  chessPiece(560, 1150, 1.5, 'queen', '#f3ead6', 'wq');
  chessPiece(840, 1180, 1.4, 'rook', '#f3ead6', 'wr');
  // the human hand, tipping its king
  hand(lerp(-170, 110, EZ.io(ev(25.5, 1.25))), 1150, 1.2, 0.35, PAL.skin1, '#3b3a44', { key: 'kh' });
  yearTag('1997');
  capStrip('Deep Blue beats Kasparov');
}
function chessPiece(x, y, s, kind, fill, key, r = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  cut(ellipsePts(0, 0, 42, 13, 0, 24), fill, { key: key + 'b', sb: 6 });
  cut([[-30, -2], [-18, -88], [18, -88], [30, -2]], fill, { key: key + 't', sb: 6 });
  if (kind === 'king') { cut(ellipsePts(0, -98, 24, 16, 0, 20), fill, { key: key + 'h' }); cut(rect(-5, -150, 10, 44, 2), fill, { key: key + 'c1' }); cut(rect(-16, -136, 32, 10, 2), fill, { key: key + 'c2' }); }
  if (kind === 'queen') { cut(ellipsePts(0, -100, 26, 18, 0, 20), fill, { key: key + 'h' }); cut(ellipsePts(0, -126, 9, 9, 0, 12), fill, { key: key + 'd' }); }
  if (kind === 'rook') cut([[-26, -88], [-26, -120], [-12, -120], [-12, -106], [12, -106], [12, -120], [26, -120], [26, -88]], fill, { key: key + 'h' });
  ctx.restore();
}
// ---- 2012: AlexNet; a wall of photos, the spark in glasses finds the cat; two graphics cards run hot
function sPhotos() {
  wall('#e7c79a', pat.dots('rgba(255,255,255,0.25)', 5, 40));
  cut(rect(50, 250, 860, 860, 8), '#b88a5a', { key: 'cork', pat: pat.dots('rgba(90,50,20,0.25)', 3, 14) });
  const kinds = ['car', 'mug', 'fish', 'dog', 'house', 'bird', 'apple', 'cat', 'car', 'dog', 'fish', 'mug'], R = RNG('ph');
  kinds.forEach((k, i) => { const x = 170 + (i % 4) * 205, y = 380 + Math.floor(i / 4) * 230; photo(x, y, 170, 190, k, i, R.n(0.08)); pin(x, y - 86); });
  const cx = 170 + 3 * 205, cy = 380 + 230;
  ink(rect(cx - 98, cy - 106, 196, 212, 6), { closed: true, w: 8, color: PAL.orange, key: 'catbox', frac: ev(31.0, 0.25) });
  if (TT >= 31.25) { const k = popS(31.25); ctx.save(); ctx.translate(cx - 98, cy - 150); ctx.scale(k, k); cut(rect(0, 0, 110, 46, 4), PAL.orange, { key: 'catlab' }); handText('cat!', 14, 36, 38, '#fff', { key: 'catt' }); ctx.restore(); }
  // desk, the GPUs, the pile of photos
  cut(rect(-30, 1150, W + 60, 900, 0), PAL.wood, { key: 'pdesk', tear: 0, pat: pat.grainWood('rgba(120,60,20,0.18)'), sy: -6 });
  [[200, 1210], [470, 1230]].forEach(([x, y], i) => { cut(rect(x - 120, y - 60, 240, 120, 8), '#2f6b46', { key: 'gpu' + i, pat: pat.lines('rgba(255,255,255,0.12)', 16) }); cut(ellipsePts(x - 50, y, 38, 38, 0, 22), '#3b3f4a', { key: 'fan' + i, sb: 3 }); cut(ellipsePts(x + 50, y, 38, 38, 0, 22), '#3b3f4a', { key: 'fanb' + i, sb: 3 }); for (const fx of [x - 50, x + 50]) for (let b2 = 0; b2 < 3; b2++) { const a = TT * 12 + b2 * TAU / 3 + fx; ink([[fx, y], [fx + Math.cos(a) * 30, y + Math.sin(a) * 30]], { w: 6, color: '#8e9aa6', amt: 0.2, key: 'bl' + i + b2 + fx }); } for (let k = 0; k < 3; k++) { const P = []; for (let j = 0; j <= 8; j++) P.push([x - 40 + k * 40 + Math.sin(j) * 6, y - 70 - j * 10]); ink(P, { w: 4, color: 'rgba(255,255,255,0.7)', key: 'heat' + i + k }); } });
  const P2 = RNG('pile'); for (let i = 0; i < 6; i++) photo(780 + P2.n(60), 1280 + P2.n(30), 150, 160, ['bird', 'house', 'apple', 'dog', 'car', 'fish'][i], 20 + i, P2.n(0.5));
  // the spark: glasses, a magnifier, pointing at the cat
  const mu = EZ.o3(ev(30.75, 0.4)), mgx = lerp(Math.sin(TT * 2.6) * 220 - 160, 65, mu) * 0.6, mgy = lerp(Math.cos(TT * 1.9) * 160 - 120, -240, mu) * 0.6;
  ctx.save(); ctx.translate(mgx, mgy);
  spark(560, 1000, 96, { rays: 9, mood: TT >= 31.25 ? 'happy' : 'focus', key: 'sp12' });
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(545, 996, 16, 0, TAU); ctx.moveTo(591, 996); ctx.arc(575, 996, 16, 0, TAU); ctx.stroke();
  cut(capsulePts(640, 960, 700, 880, 14), '#6e4a30', { key: 'maghd' }); ink(ellipsePts(720, 850, 40, 40, 0, 24), { closed: true, w: 8, color: '#5a5560', key: 'mag' });
  ctx.restore();
  yearTag('2012');
  capStrip('AlexNet: neural nets learn to see');
}
// ---- 2016: AlphaGo (extreme close-up): the spark places move 37
function sGo() {
  wall('#e2b878', (bb) => { pat.grainWood('rgba(150,100,50,0.25)')(bb); });
  for (let i = 0; i < 9; i++) { ink([[-20, 300 + i * 150], [1100, 300 + i * 150]], { w: 4, color: '#3a2a1a', amt: 0.5, key: 'gh' + i }); ink([[60 + i * 150, 180], [60 + i * 150, 1700]], { w: 4, color: '#3a2a1a', amt: 0.5, key: 'gv' + i }); }
  const stone = (i, j, white, k) => cut(ellipsePts(60 + i * 150, 300 + j * 150, 66, 62, 0, 30), white ? '#f3efe6' : '#2b2a2e', { key: 'st' + k, sb: 10, sy: 8 });
  [[1, 1, 0], [2, 1, 1], [1, 2, 1], [4, 2, 0], [5, 3, 1], [2, 4, 0], [3, 3, 1], [4, 5, 0], [6, 6, 1], [1, 6, 0], [2, 6, 1], [5, 6, 0], [3, 1, 1], [6, 4, 0], [0, 4, 1], [6, 2, 0]].forEach(([i, j, w], k) => stone(i, j, w, k));
  // move 37: placed by the spark, ringed in orange
  if (TT >= 35.0) { const k = 1 + 0.45 * (1 - EZ.i2(ev(35.0, 0.2))); ctx.save(); ctx.translate(660, 900); ctx.scale(k, k); ctx.translate(-660, -900); stone(4, 4, 0, 'm37'); ctx.restore(); }
  if (TT >= 35.1) ink(ellipsePts(660, 900, 92, 88, 0, 30), { closed: true, w: 8, color: PAL.orange, key: 'ring', frac: ev(35.1, 0.3) });
  spark(800 - 60 * (1 - EZ.o3(ev(34.5, 0.5))), 760, 92, { rays: 9, mood: TT < 35.0 ? 'focus' : 'happy', key: 'sp16' });
  tag('move 37', 300, 1090, 52, { rot: -0.06, color: PAL.orangeD, s: popS(35.5) });
  // the opponent's hand hovers at the edge, a cup of tea
  hand(1120 + 60 * EZ.o3(ev(35.0, 0.3)), 1320 + Math.sin(TT * 1.6) * 14, 1.2, Math.PI + 0.35, PAL.skin1, '#2f3440', { key: 'goh' });
  mug(160, 560, 0.9, '#d6e8cf', 'gotea');
  yearTag('2016');
  capStrip('AlphaGo beats Lee Sedol');
}
// ---- 2017: the transformer; a detective wall, every word tied to every other, "it" tied hardest to "animal"
function sAttention() {
  wall('#7e9fc8', pat.stripes('rgba(255,255,255,0.08)', 30, 80));
  cut(rect(40, 240, 880, 1000, 8), '#b88a5a', { key: 'cork2', pat: pat.dots('rgba(90,50,20,0.25)', 3, 14) });
  ctx.save(); ctx.translate(600, 380); ctx.rotate(-0.02); cut(rect(-270, -46, 540, 92, 3), PAL.paper, { key: 'aian' }); handText('Attention Is All You Need', -245, 16, 42, PAL.ink, { key: 'aiant' }); ctx.restore();
  const words = [['the', 150, 520], ['animal', 420, 500], ["didn't", 720, 540], ['cross', 160, 720], ['the', 420, 760], ['street', 700, 720], ['because', 190, 950], ['was', 640, 960], ['tired', 800, 1100]], pos = {};
  words.forEach(([w, x, y], i) => { const ww = handW(w, 50) + 40; ctx.save(); ctx.translate(x, y); ctx.rotate(((i * 37) % 7 - 3) * 0.02); cut(rect(-ww / 2, -40, ww, 80, 3), PAL.paper, { key: 'wc' + i, sb: 6 }); handText(w, -ww / 2 + 20, 16, 50, PAL.ink, { key: 'wt' + i }); ctx.restore(); pos[w + i] = [x, y]; });
  const IT = [430, 1000];
  const att = [1, 6, 1, 1, 1, 2, 1, 1, 2]; // index weight: animal strongest
  const ORD = [0, 2, 3, 4, 5, 6, 7, 8, 1];
  words.forEach(([w, x, y], i) => { const f = ev(37.5 + ORD.indexOf(i) * 0.375, 0.2); if (f > 0) stringLine(IT[0], IT[1] - 30, x, y + 34, 'str' + i, PAL.orange, i === 1 ? 10 : 2 + att[i], f); });
  pin(IT[0], IT[1] - 40, PAL.orangeD);
  // "it" is the spark itself, holding the strings
  spark(IT[0], IT[1] + 70, 100, { rays: 10, mood: TT >= 40.5 ? 'happy' : 'focus', key: 'sp17' });
  tag('it', IT[0] + 120, IT[1] + 160, 54, { rot: 0.08, s: popS(37.25) });
  words.forEach(([w, x, y], i) => pin(x, y - 40));
  // desk details: a magnifier? a coffee
  mug(110, 1320, 0.9, '#f3ead6', 'amug');
  yearTag('2017');
  capStrip('the transformer: attention');
}
// ---- 2020: GPT-3; the spark reads a library and gets big
function sScale() {
  wall('#e9dfc7', pat.stripes('rgba(160,120,70,0.10)', 3, 40));
  const R = RNG('lib'), cols = [PAL.teal, PAL.pink, PAL.purple, PAL.yellow, PAL.blue, PAL.green, '#e7dcc0', '#b9867a'];
  // towers of books, floor to ceiling
  [[90, 0.9], [230, 1.2], [870, 1.1], [990, 0.8]].forEach(([x, k], t) => { let y = 1500; for (let i = 0; y > 260; i++) { const h = R.r(40, 64), w = R.r(140, 200) * k; cut(rect(x - w / 2 + R.n(14), y - h, w, h, 4), cols[R.i(0, 7)], { key: 'tw' + t + i, sb: 5, pat: pat.stripes('rgba(255,255,255,0.3)', 6, 1000) }); y -= h; } });
  // books flying into the spark
  for (let i = 0; i < 14; i++) { const a = R.r(0, TAU) + TT * 0.6, d0 = R.r(330, 470), d = 250 + mod(d0 - TT * 300, 420), x = 470 + Math.cos(a) * d, y = 860 + Math.sin(a) * d * 0.9, r0 = R.r(0, 3) + TT * 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r0); cut([[-50, -30], [0, -40], [50, -30], [50, 30], [0, 20], [-50, 30]], i % 2 ? PAL.paper : cols[i % 8], { key: 'fb' + i, sb: 8 }); ink([[0, -40], [0, 20]], { w: 3, color: 'rgba(42,29,24,0.5)', key: 'fbs' + i }); ctx.restore();
    ink([[x - Math.cos(a) * 60, y - Math.sin(a) * 60], [x - Math.cos(a) * 140, y - Math.sin(a) * 140]].map(([px, py]) => [px, py]), { w: 4, color: 'rgba(255,255,255,0.9)', key: 'fl' + i }); }
  for (let i = 0; i < 26; i++) { const x0 = R.r(320, 640), y0 = R.r(560, 1200), rr = R.r(0, 3), ang = TT * 1.4, x = 470 + (x0 - 470) * Math.cos(ang) - (y0 - 880) * Math.sin(ang), y = 880 + (x0 - 470) * Math.sin(ang) + (y0 - 880) * Math.cos(ang); ctx.save(); ctx.translate(x, y); ctx.rotate(rr + TT * 4); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(-14, -18, 28, 36); ctx.restore(); }
  spark(470, 880, lerp(150, 230, ev(41, 3)), { rays: 10, mood: 'wow', key: 'sp20' });
  tag('175 billion parameters', 470, 1260, 44, { rot: -0.03, s: popS(42.0) });
  yearTag('2020');
  capStrip('GPT-3: bigger models, more text');
}
// ---- November 30, 2022 (close-up): one empty box, a cursor, the spark peeking up from below
function sHush() {
  wall('#141a33', pat.dots('rgba(255,255,255,0.05)', 3, 40));
  ctx.save(); const g = ctx.createRadialGradient(470, 900, 40, 470, 900, 700); g.addColorStop(0, 'rgba(160,190,255,0.32)'); g.addColorStop(1, 'rgba(160,190,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  cut(rect(60, 560, 820, 640, 30), '#f6f1e6', { key: 'scrn', sb: 30, shc: 'rgba(150,180,255,0.35)' });
  cut(rect(110, 1040, 720, 120, 50), '#ffffff', { key: 'box', line: '#c9c2b4', lw: 3 });
  const typed = TT >= 45.75 ? 'hi' : TT >= 45.5 ? 'h' : '';
  if (typed) handText(typed, 170, 1116, 56, PAL.ink, { key: 'ty' + typed }); else handText('Message...', 170, 1116, 50, '#a29a8c', { key: 'msg' });
  if (typed || Math.floor(TT * 2) % 2 === 0) { ctx.fillStyle = PAL.ink; ctx.fillRect(typed ? 176 + handW(typed, 56) : 160, 1068, 6, 66); }
  cut(ellipsePts(770, 1100, 38, 38, 0, 24), TT >= 45.75 ? PAL.ink : '#cfc6b4', { key: 'send' });
  // the spark peeks over the bottom edge of the screen
  ctx.save(); ctx.beginPath(); ctx.rect(0, 1150, W, 400); ctx.clip(); spark(470, 1330 + (1 - EZ.o3(ev(44.5, 0.75))) * 170, 120, { rays: 11, mood: TT >= 45.5 ? 'wow' : 'smile', key: 'sp22a' }); ctx.restore();
  cut(rect(60, 1196, 820, 30, 6), '#2a2a36', { key: 'bezel' });
  yearTag('Nov 30, 2022');
  capStrip('a new chat box appears');
}
// ---- the end: back at Turing's desk; the spark answers in orange
function sEnd() { sStudy({ end: true }); }
