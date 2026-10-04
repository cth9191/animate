// =====================================================================
//  ERAS, BRIDGES — math demo (read by kit/morph.js). No camera moves: a manim stage holds still.
// =====================================================================
const ERA_BG = [MC.bg, MC.bg];
const BRIDGES = [
  { tc: 3.0, A: () => ({ P: SQ_C, c: MC.yellow }), B: () => ({ P: ellipsePts(UC_O[0], UC_O[1], UC_R, UC_R, 0, 96), c: MC.yellow }) },   // the square on c -> the unit circle
];
