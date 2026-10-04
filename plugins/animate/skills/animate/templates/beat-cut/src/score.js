  // SCORE BODY — beat-cut starter (inside buildScore(); see kit/score-head.js)
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 2.55, ['D3', 'A3', 'Fs4'], 0.03, { type: 'triangle', cut: 900, att: 0.05, rel: 0.15 });
  for (let b = 1.0; b < 2.5 - 1e-6; b += E8) pluck(b, nz(['D4', 'Fs4', 'A4'][Math.round(b / E8) % 3]), 0.16, 0, 0.3, 2800, 0.2);   // a pluck on every 8th cut
  for (let i = 0; i < 4; i++) noiseHit(2.5 + i * E16, 0.07, 'bandpass', 1800 + i * 500, 1.5, 0.5, (i % 2 ? 0.3 : -0.3));            // the rush: a hit on every 16th
  to = 's';
  sweep(2.6, 2.98, 0.012, 600, 3200, 0);
  to = 'm';
  // payoff recipe (craft.md): a short stab + sub on the hit, then a flat chord
  chime(3.0, [nz('D5'), nz('Fs5'), nz('A5')], 0.12); sub(3.0, 0.5);
  pad(3.05, 6.05, ['D3', 'A3', 'D4', 'Fs4'], 0.045, { cut: 1200, att: 0.25, rel: 0.3, send: 0.4 });
