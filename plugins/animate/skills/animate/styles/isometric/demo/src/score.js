  // SCORE BODY — isometric demo (inside buildScore(); see kit/score-head.js). Calm pad, soft clicks.
  const T = TIMELINE, q = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.03, { type: 'triangle', cut: 1400, att: 0.4, rel: 0.3, send: 0.5 });
  pad(3.0, 6.05, ['A2', 'E3', 'Cs5'], 0.032, { type: 'triangle', cut: 1200, att: 0.3, rel: 0.3, send: 0.5 });
  pluck(q.open, nz('A4'), 0.14, 0.1, 0.6, 2200, 0.35);
  pluck(q.slide, nz('E4'), 0.14, -0.1, 0.6, 2200, 0.35);
  pluck(q.slide + E8, nz('A4'), 0.1, 0.1, 0.6, 2200, 0.35);
  to = 's';
  for (let i = 0; i < 4; i++) blip(q.plates + i * 0.08, 900 + i * 120, 700, 0.03, 0.03);   // plates landing
  for (let i = 0; i < 8; i++) blip(q.keys + i * E16 * 0.5, 2600 + (i % 3) * 200, 2200, 0.012, 0.022, (i % 2 ? 0.2 : -0.2));   // keys rising
  for (let i = 0; i < 10; i++) blip(q.type + i * 0.0625, 3000, 2600, 0.01, 0.018);   // typing
  blip(q.hop, 500, 1100, 0.1, 0.04); blip(q.hop2, 500, 1100, 0.1, 0.04);
  sweep(2.6, 3.05, 0.008, 600, 2400, 0);
  noiseHit(q.slide, 0.35, 'bandpass', 900, 1.2, 0.03, 0, 0.2, 2200);   // the blade sliding out
