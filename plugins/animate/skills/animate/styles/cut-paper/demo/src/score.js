  // =====================================================================
  //  SCORE BODY — runs inside buildScore() (kit/score-head.js). to = 'm' (music) or 's' (sfx).
  //  pluck(t, freq, vel, pan, dur, bright, send) · pad(t0, t1, ['D3', 'A3'], peak, { cut, att, rel, send, swellTo, swellAt })
  //  drone(t0, t1, freq, peak) · bass(t, freq, vel) · sub(t, vel) · noiseHit(t, dur, type, freq, q, vel, pan)
  //  sweep(t0, t1, vel, f0, f1, pan) · riser(t0, t1, vel) · chime(t, [freqs], vel) · blip(t, f0, f1, dur, vel)
  //  Notes: nz('D4'). Payoff recipe: a short stab + sub on the hit, a flat chord after it (craft.md -> Sound).
  // =====================================================================
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 4.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 800, att: 0.05, rel: 0.2 });
  [['D4', 0], ['A4', E8]].forEach(([n, dt], i) => pluck(cu.wake + dt, nz(n), 0.2, 0.1 - i * 0.1, 0.6, 2600, 0.35));   // the hero's motif
  pad(4.0, 8.05, ['D3', 'A3', 'D4', 'Fs4'], 0.05, { cut: 1200, att: 0.3, rel: 0.3, send: 0.4 });
  for (let i = 0; i < 6; i++) pluck(cu.flowers + i * 0.25, nz(['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6'][i]), 0.08, 0.3 - i * 0.12, 0.4, 4200, 0.3);
  to = 's';
  sweep(3.7, 4.05, 0.011, 500, 2600, 0);   // a paper swish into the morph
