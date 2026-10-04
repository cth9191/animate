// =====================================================================
//  SCENES — math demo. World coordinates 1080x1920 (no camera moves: a manim stage holds still); TT on 1s.
//  One colour per quantity, everywhere: a / cos θ red, b / sin θ green, c / 1 yellow, θ blue.
// =====================================================================
const QA = MC.red, QB = MC.green, QC = MC.yellow, QT = MC.blue;
// era 1: a 4-3-5 right triangle, 70px per unit, right angle at TRI_O; a runs right, b runs up
const TRI_U = 70, TRI_O = [330, 1070], TRI_A = [TRI_O[0] + 4 * TRI_U, TRI_O[1]], TRI_B = [TRI_O[0], TRI_O[1] - 3 * TRI_U];
const SQ_A = squareOn(TRI_O[0], TRI_O[1], TRI_A[0], TRI_A[1], -1);   // below a
const SQ_B = squareOn(TRI_O[0], TRI_O[1], TRI_B[0], TRI_B[1], 1);    // left of b
const SQ_C = squareOn(TRI_B[0], TRI_B[1], TRI_A[0], TRI_A[1], 1);    // outside c: the bridge object
const centre = (Q) => [Q.reduce((s, p) => s + p[0], 0) / Q.length, Q.reduce((s, p) => s + p[1], 0) / Q.length];
// era 2: the unit circle, 300px per unit; θ starts at the same 4-3-5 angle (cos 0.8, sin 0.6), so the triangle is the same one
const UC_O = [CX, 910], UC_R = 300, TH0 = Math.atan2(3, 4), TH1 = 2.35;
// the formulas (ids tie the terms together for transformTex)
const EQ1 = [mv('a', QA, { sup: '2', id: 'a' }), '+', mv('b', QB, { sup: '2', id: 'b' }), '=', mv('c', QC, { sup: '2', id: 'c' })];
const EQ2 = [mn('cos', QA, { sup: '2', id: 'a' }), { sp: 0.08 }, mv('θ', QT, { id: 'a' }), '+', mn('sin', QB, { sup: '2', id: 'b' }), { sp: 0.08 }, mv('θ', QT, { id: 'b' }), '=', mn('1', QC, { id: 'c' })];
const SUM1 = [mn('16', QA, { id: 'a' }), '+', mn('9', QB, { id: 'b' }), '=', mn('25', QC, { id: 'c' })];
// the live line: cos² rounded to 2 places, sin² shown as 1 minus it (so the line on screen is exactly true at 2 places)
function liveSum(c) { const c2 = Math.round(c * c * 100) / 100; return [mn(c2.toFixed(2), QA, { id: 'a' }), '+', mn((1 - c2).toFixed(2), QB, { id: 'b' }), '=', mn('1', QC, { id: 'c' })]; }

function scenePythagoras() {
  const cu = TIMELINE.cues;
  fillAll(MC.bg);
  writeTex(EQ1, CX, 410, 100, runS(cu.eq, 0.9));
  writeTex(SUM1, CX, 510, 64, runS(cu.sum, 0.7));
  // the squares on each side: border, then a translucent fill, then the unit cells and the cell count
  const sq = runS(cu.squares, 1.0);
  [[SQ_A, QA, 4, '16'], [SQ_B, QB, 3, '9'], [SQ_C, QC, 5, '25']].forEach(([Q, c, n, area], i) => {
    showCreation(Q, lagged(sq, i, 3, 0.5), { c, w: 4, closed: true, fill: 0.14 });
    cellGrid(Q, n, c, 0.4 * runS(cu.cells + i * 0.12, 0.4));
    const [x, y] = centre(Q), k = i === 2 ? indicateS((TT - cu.flash) / 0.5, 0.25) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    writeTex([mn(area, c)], 0, 22, 62, runS(cu.cells + 0.15 + i * 0.12, 0.45), { dim: {} });
    ctx.restore();
  });
  // the triangle, drawn on side by side, and its labels
  const sd = runS(cu.sides, 0.8);
  showCreation([TRI_O, TRI_A], lagged(sd, 0, 3, 0.5), { c: QA, w: 7 });
  showCreation([TRI_O, TRI_B], lagged(sd, 1, 3, 0.5), { c: QB, w: 7 });
  showCreation([TRI_B, TRI_A], lagged(sd, 2, 3, 0.5), { c: QC, w: 7 });
  rightAngle(TRI_O[0], TRI_O[1], [1, 0], [0, -1], 24, MC.white, runS(cu.sides + 0.5, 0.3));
  const lp = runS(cu.sides + 0.45, 0.6);
  writeTex([mv('a', QA)], 532, 1058, 52, lagged(lp, 0, 3));
  writeTex([mv('b', QB)], 344, 1034, 52, lagged(lp, 1, 3), { align: 'left' });
  writeTex([mv('c', QC)], 446, 1008, 52, lagged(lp, 2, 3));
  flashAt(...centre(SQ_C), (TT - cu.flash) / 0.45, MC.yellowP, 70, 5);
  // the hero reads the equation, watches the triangle, then the big square
  const look = TT < 0.9 ? [CX, 380] : TT < 1.8 ? [440, 1010] : centre(SQ_C);
  piHero(790, 1365, 0.95, { key: 'pi', look, mood: TT >= cu.flash ? 'wow' : 'calm', hop: (TT - cu.flash) / 0.5 });
  mathTag('Pythagoras');
  mathCaption('the two small squares fill the big one');
}

function sceneCircle() {
  const cu = TIMELINE.cues;
  fillAll(MC.bg);
  const A = axes2({ at: UC_O, u: UC_R, x: [-1.2, 1.2], y: [-1.2, 1.1], p: 0 });
  numberPlane(A, { p: runS(3.0, 1.0), step: 0.5, sub: 2, x: [-1.25, 1.25], y: [-1.25, 1.1] });
  axes2({ at: UC_O, u: UC_R, x: [-1.2, 1.2], y: [-1.2, 1.1], ext: 0.12, p: runS(3.05, 0.8), step: 0.5, tick: 8 });
  const ta = runS(3.5, 0.4);
  mText('1', A.to(1, 0)[0] + 18, UC_O[1] + 40, 32, { color: MC.grey, alpha: ta, align: 'left' });
  mText('1', UC_O[0] + 18, A.to(0, 1)[1] - 12, 32, { color: MC.grey, alpha: ta, align: 'left' });
  // the circle (what the square on c became): every point at distance c = 1
  ctx.save(); ctx.strokeStyle = QC; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(UC_O[0], UC_O[1], UC_R, 0, TAU); ctx.stroke(); ctx.restore();
  // θ sweeps from the 4-3-5 angle; the triangle rides along
  const th = keysM([[3.0, TH0], [cu.sweep, TH0], [cu.sweep + 1.2, TH1]]), c = Math.cos(th), s = Math.sin(th);
  const P = A.to(c, s), FT = A.to(c, 0);
  angleArc(UC_O[0], UC_O[1], 50, 0, -th, QT, runS(3.45, 0.5), 4);
  writeTex([mv('θ', QT)], UC_O[0] + Math.cos(-th / 2) * 84, UC_O[1] + Math.sin(-th / 2) * 84 + 16, 44, runS(3.6, 0.5));
  segLine(UC_O[0], UC_O[1], P[0], P[1], QC, 6);
  segLine(UC_O[0], UC_O[1], FT[0], FT[1], QA, 7);
  segLine(FT[0], FT[1], P[0], P[1], QB, 7);
  rightAngle(FT[0], FT[1], [-Math.sign(c) || -1, 0], [0, -1], 20, MC.white, 0.8 * clamp(Math.abs(c) * 6));
  // labels sit beside their segments and fade when a segment gets too short to carry one
  // the "1" goes on the side of the radius away from the triangle; sin θ needs a cos leg long enough to sit beside
  const lp = runS(3.7, 0.6), nx = c >= 0 ? -s : s, ny = c >= 0 ? -c : c, room = clamp((Math.abs(c) * UC_R - 100) / 30);
  writeTex([mn('1', QC)], (UC_O[0] + P[0]) / 2 + nx * 34, (UC_O[1] + P[1]) / 2 + ny * 34 + 14, 48, lp);
  writeTex([mn('cos', QA), { sp: 0.1 }, mv('θ', QT)], (UC_O[0] + FT[0]) / 2, UC_O[1] + 56, 42, lp, { alpha: clamp(Math.abs(c) * 4) });
  // sin θ sits inside the triangle, low on its leg, where there is room between the leg and the radius
  writeTex([mn('sin', QB), { sp: 0.1 }, mv('θ', QT)], FT[0] + (c >= 0 ? -14 : 14), lerp(FT[1], P[1], 0.3) + 14, 42, lp, { align: c >= 0 ? 'right' : 'left', alpha: clamp(s * 4) * room });
  // the tracking dot and its coordinates
  trackDot(P[0], P[1], QC);
  const cp = runS(cu.live, 0.5), lx = P[0] + c * 60, ly = P[1] - s * 60 + 10;
  writeTex([mn('('), mn(fmtNum(c, 2), QA), mn(','), { sp: 0.15 }, mn(fmtNum(s, 2), QB), mn(')')], lx, ly, 38, cp, { align: c >= 0 ? 'left' : 'right' });
  // the equation Transforms; under it, the live check that the two squares still add to 1
  transformTex(EQ1, EQ2, CX, 410, 100, runS(cu.transform, 0.9));
  const lay = writeTex(liveSum(c), CX, 510, 64, runS(cu.live, 0.6)), one = texBox(lay, 'c');
  if (one) flashAt(one.cx, one.cy, (TT - cu.flash2) / 0.45, MC.yellowP, 36, 4);
  writeTex([mv('θ', QT), '=', mn((th * 180 / Math.PI).toFixed(1) + '°', QT)], 90, 1330, 46, runS(cu.live, 0.5), { align: 'left' });
  piHero(820, 1365, 0.95, { key: 'pi', look: P, mood: TT >= cu.flash2 ? 'happy' : TT < cu.transform + 0.8 ? 'wow' : 'calm', hop: (TT - cu.flash2) / 0.5 });
  mathTag('unit circle');
  mathCaption([{ s: 'with ' }, { s: 'c', c: QC, it: true }, { s: ' = 1, the triangle lives on a circle' }]);
}
