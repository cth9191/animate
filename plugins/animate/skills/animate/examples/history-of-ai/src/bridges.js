
// =====================================================================
//  A SHORT HISTORY OF AI — eras, cameras and shape-morph bridges (rendered by kit/morph.js)
// =====================================================================
const ERA_BG = ['#26315f', '#f0cf78', '#cfdccf', '#c9b9da', '#cfe2ee', '#2f5a5c', '#2b2f45', '#e7c79a', '#e2b878', '#7e9fc8', '#e9dfc7', '#141a33', '#f3a3bf', '#a9d9c6', '#26315f'];
// cameras: eased push-ins (pulled back before the next bridge) and the library's zoom bumps on the beat
function pieceCam(era, t) {
  if (era === 2) return push(t, 10.5, 11.0, { z: 1.7, p: [780, 1250], to: [560, 1000] });
  if (era === 6) return push(t, 26.5, 27.0, { z: 1.6, p: [260, 1230], to: [430, 1000] }, 28.0, 28.4);
  if (era === 7) return push(t, 30.75, 31.25, { z: 1.7, p: [785, 610], to: [500, 760] }, 32.0, 32.35);
  if (era === 10) return bump(t, 41, [470, 880]);
  return null;
}
const PAGE = () => rot(rect(210, 1050, 620, 380, 4), 520, 1240, -0.05);
const photosSpark = () => { const mu = EZ.o3(ev(30.75, 0.4)), mgx = lerp(Math.sin(TT * 2.6) * 220 - 160, 65, mu) * 0.6, mgy = lerp(Math.cos(TT * 1.9) * 160 - 120, -240, mu) * 0.6; return [560 + mgx, 1000 + mgy]; };
// each bridge: the object at the end of one era (A) and its counterpart at the start of the next (B)
const BRIDGES = [
  { tc: 4, A: () => ({ P: PAGE(), c: PAL.paper }), B: () => ({ P: rect(60, 640, 830, 490, 10), c: '#2d463b' }) },                       // Turing's page -> the chalkboard
  { tc: 8, A: () => SP(680, 1030, 84, 6), B: () => SP(420, 760, 80, 6) },                                                                // the spark carries over
  { tc: 12, A: () => ({ P: ellipsePts(780, 1240, 46, 46, 0, 64), c: '#79c27a' }), B: () => ({ P: [[790, 820], [850, 820], [880, 1200], [760, 1200]], c: '#b7a0e8' }) },   // the "yes" lamp -> the lava lamp
  { tc: 16, A: () => ({ P: rot(rect(130, 380, 600, 820, 4), 430, 860, -0.02), c: PAL.paper }), B: () => ({ P: [[-40, 1120], [200, 1090], [500, 1130], [800, 1100], [1120, 1120], [1120, 2000], [-40, 2000]], c: PAL.snow }) },   // ELIZA's paper -> the snowfield
  { tc: 22, A: () => ({ P: [[441, 1094], [454, 1132], [441, 1146], [428, 1132]], c: PAL.yellow }), B: () => ({ P: [[239, 1004], [256, 1040], [239, 1056], [222, 1040]], c: PAL.yellow }) },   // the candle flame carries over
  { tc: 25, A: () => ({ P: rot(rect(360, 1140, 400, 180, 4), 560, 1230, 0.05), c: PAL.paper }), B: () => ({ P: rect(-60, 1040, 1200, 360, 2), c: '#e9d3a8' }) },   // the note -> the chessboard
  { tc: 29, A: () => SP(750, 360, 84, 8), B: () => SP(...photosSpark(), 96, 9) },
  { tc: 33, A: () => ({ P: rect(50, 250, 860, 860, 8), c: '#b88a5a' }), B: () => ({ P: rect(0, 0, W, H, 0), c: '#e2b878' }) },          // the cork board -> the Go board
  { tc: 37, A: () => ({ P: ellipsePts(660, 900, 66, 62, 0, 64), c: '#2b2a2e' }), B: () => SP(430, 1070, 100, 10) },                      // the move-37 stone -> the spark
  { tc: 41, A: () => SP(430, 1070, 100, 10), B: () => SP(470, 880, 150, 10) },
  { tc: 44, A: () => SP(470, 880, 230, 10), B: () => ({ P: rect(60, 560, 820, 640, 30), c: '#f6f1e6' }) },                               // the spark collapses into a screen
  { tc: 51, A: () => SP(470, 920, 150, 11), B: () => SP(800, 732, 88, 12) },
  { tc: 56, A: () => ({ P: rect(126, 456, 218, 168, 2), c: PAL.paper }), B: () => ({ P: PAGE(), c: PAL.paper }) },                        // the framed 1950 page -> Turing's page
];
