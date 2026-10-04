// =====================================================================
//  ERAS, CAMERAS, BRIDGES — riso demo (read by kit/morph.js)
//  Colours for the renderer are the printed colours of plate tones (inkRGB), so the morph fades stay in the inks.
// =====================================================================
const ERA_BG = [rgbHex(inkRGB({ teal: 0.1, pink: 0.25, yellow: 0.5 })), rgbHex(inkRGB({ yellow: 0.5, pink: 0.2, teal: 0.04 }))];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.3, 2.0, { z: 1.08, p: [520, 1100], to: [540, 1110] }, 2.0, 2.3);
  return push(t, 4.4, 5.6, { z: 1.1, p: [330, 1100], to: [420, 1110] });
}
const BRIDGES = [
  { tc: 3.0,   // the sun -> the best orange in the crate
    A: () => ({ P: sunPts(SUN.x, sunY(), SUN.r, sunRot()), c: rgbHex(inkRGB({ yellow: 1, pink: 0.3 })) }),
    B: () => ({ P: ellipsePts(ORANGE.x, ORANGE.y, ORANGE.r, ORANGE.r * 0.96, 0, 64), c: rgbHex(inkRGB(ORANGE.c)) }) },
];
