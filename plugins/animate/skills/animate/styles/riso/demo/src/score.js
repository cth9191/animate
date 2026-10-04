  // SCORE BODY — riso demo (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 1100, att: 0.4, rel: 0.2 });   // dawn
  [['D4', 0], ['Fs4', E8], ['A4', BEAT]].forEach(([n, dt], i) => pluck(cu.stretch + dt, nz(n), 0.18, -0.1 + i * 0.1, 0.5, 2600, 0.35));
  pad(3.0, 6.05, ['D3', 'Fs3', 'A3', 'E4'], 0.04, { type: 'triangle', cut: 1400, att: 0.2, rel: 0.3, send: 0.4 });   // market
  pluck(cu.pick, nz('A5'), 0.22, 0.2, 0.4, 4200, 0.3);
  [['D5', 0], ['Fs5', E16], ['A5', E8]].forEach(([n, dt], i) => pluck(cu.hop + dt, nz(n), 0.16, 0.1 * i, 0.3, 4800, 0.3));
  to = 's';
  for (let i = 0; i < 6; i++) blip(0.5 + i * BEAT * 0.75, 2600 + (i % 3) * 400, 3400 + (i % 2) * 300, 0.05, 0.03, -0.3 + i * 0.1);   // birds
  sweep(2.6, 3.05, 0.012, 400, 2400, 0);                                                                              // into the morph
  for (let i = 0; i < 8; i++) noiseHit(3.5 + i * E8, 0.05, 'bandpass', 5200, 3, 0.02, -0.2);                           // the bee
  noiseHit(cu.pick, 0.12, 'bandpass', 900, 1.5, 0.06, 0.1, 0.2, 2400);                                                  // the pick (whoosh)
