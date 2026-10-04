  // SCORE BODY — sketchbook demo (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.03, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  [['D5', 0], ['Fs5', E16], ['A5', E8]].forEach(([n, dt], i) => pluck(cu.pop + dt, nz(n), 0.22 - i * 0.04, -0.1 + i * 0.1, 0.5, 4200, 0.4));   // the idea lights
  pad(3.0, 6.05, ['D2', 'A2', 'Fs3', 'E4'], 0.045, { cut: 800, att: 0.3, rel: 0.3, send: 0.4 });
  [cu.hop1, cu.hop2].forEach((t, i) => pluck(t, nz(i ? 'A4' : 'Fs4'), 0.2, 0.15, 0.4, 3000, 0.3));                                          // the hops
  to = 's';
  for (let i = 0; i < 12; i++) noiseHit(cu.draw + i * E16, 0.07, 'bandpass', 3600 + (i % 3) * 300, 2, 0.05, -0.2);                      // pencil construction
  for (let i = 0; i < 8; i++) noiseHit(cu.fill + i * E16 / 2, 0.05, 'bandpass', 2600, 1.4, 0.06, 0.1);                                  // the scribble fill
  sweep(2.5, 3.0, 0.012, 500, 2800, 0);                                                                                                 // into the morph
  chime(3.0, [nz('D5'), nz('A5'), nz('E6')], 0.07, 0);                                                                                  // the sun
  for (let i = 0; i < 4; i++) blip(3.75 + i * E8, 2200 + (i % 2) * 400, 1800, 0.03, 0.025, 0.3);                                       // birds
