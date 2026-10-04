// =====================================================================
//  ERAS, CAMERAS, BRIDGES — sketchbook demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#f2ead8', '#efe3c4'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 1.9, 2.4, { z: 1.2, p: [540, 700], to: [540, 760] });                    // lean in on the idea
  return camMix(camOf({ z: 1.1, p: [540, 760], to: [540, 760] }), CAM0, EZ.io(seg(t, 3.6, 5.2)));     // then pull back to see the world
}
const BRIDGES = [
  { tc: 3.0, A: () => ({ P: bulbPts(BULB.x, BULB.y, BULB.r), c: SK.hilite }), B: () => ({ P: ellipsePts(SUN.x, SUN.y, SUN.r, SUN.r, 0, 64), c: SK.hilite }) },   // the lightbulb -> the sun
];
