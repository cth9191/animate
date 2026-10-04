  // SCORE BODY — math demo (inside buildScore(); see kit/score-head.js). Soft plucks on every Write, chimes on the flashes.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.03, { type: 'triangle', cut: 1000, att: 0.3, rel: 0.3 });
  pad(3.0, 6.05, ['D3', 'A3', 'E4', 'Fs4'], 0.035, { type: 'triangle', cut: 1300, att: 0.3, rel: 0.3, send: 0.5 });
  [['D4', 0], ['Fs4', E8], ['A4', BEAT]].forEach(([n, dt], i) => pluck(cu.eq + 0.1 + dt, nz(n), 0.14, -0.2 + i * 0.2, 0.5, 2600, 0.35));
  [['A4', 0], ['B4', E8], ['D5', BEAT]].forEach(([n, dt], i) => pluck(cu.squares + dt, nz(n), 0.12, -0.3 + i * 0.3, 0.5, 3000, 0.35));
  chime(cu.flash, [nz('D5'), nz('A5'), nz('Fs6')], 0.06);
  [['E5', 0], ['Fs5', E8]].forEach(([n, dt], i) => pluck(cu.transform + dt, nz(n), 0.12, 0.1 * i, 0.5, 3200, 0.4));
  chime(cu.flash2, [nz('D5'), nz('Fs5'), nz('A5'), nz('D6')], 0.07);
  to = 's';
  sweep(2.55, 3.0, 0.01, 600, 3200, 0);                                                        // into the morph
  for (let i = 0; i < 10; i++) blip(cu.sweep + i * E16 * 0.5, 1500 + i * 60, 1300, 0.025, 0.022);  // θ ticking round
