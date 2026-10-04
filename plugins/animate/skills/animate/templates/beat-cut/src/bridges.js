// =====================================================================
//  CAMERAS AND (NO) BRIDGES — beat-cut starter (read by kit/morph.js)
//  Every era boundary is a hard cut because BRIDGES is empty. Each shot's framing is a camera on its scene:
//  camOf({ z, p, to }) puts world point p on screen point to at zoom z.
// =====================================================================
const ERA_BG = ERA_LIST.map((_, i) => (SHOT_LIST[i][1] === 'night' ? '#26315f' : '#a9d9c6'));
const CAMS = {
  wide: null,
  close: { z: 1.6, p: [500, 1000], to: [470, 900] },     // the hero, mid shot
  xclose: { z: 2.6, p: [500, 1000], to: [470, 860] },    // the hero's face: it holds its screen spot across the rush
};
function pieceCam(era, t) { const c = CAMS[SHOT_LIST[era][2]]; return c ? camOf(c) : null; }
const BRIDGES = [];
