  // SCORE BODY — crosshatch demo (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  [['D4', 0], ['A4', E8]].forEach(([n, dt], i) => pluck(cu.read + dt, nz(n), 0.2, 0.1 - i * 0.1, 0.6, 2600, 0.35));
  pad(3.0, 6.05, ['D2', 'A2', 'F3', 'C4'], 0.045, { cut: 700, att: 0.3, rel: 0.3, send: 0.4 });
  to = 's';
  for (let i = 0; i < 6; i++) noiseHit(cu.plan + i * E16, 0.06, 'bandpass', 3800, 2, 0.05, -0.2);   // pencil scratches
  sweep(2.7, 3.05, 0.011, 500, 2600, 0);
  for (let i = 0; i < 12; i++) blip(cu.type + i * E16, 1400 + (i % 3) * 300, 1200, 0.03, 0.04);     // typing
