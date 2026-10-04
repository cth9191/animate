  // SCORE BODY — pixel demo (inside buildScore(); see kit/score-head.js). Chiptune: square and pulse plucks,
  // a triangle bass, noise hats; a jump sweep and a two-note coin ding. D major, 120 BPM.
  const T = TIMELINE, cu = T.cues;
  const chip = (t, n, vel, dur = 0.11, pan = 0, type = 'square', cut = 3600) => {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    const g = ac.createGain(); env(g, t, 0.002, vel, dur);
    osc(type, typeof n === 'number' ? n : nz(n), t, t + dur + 0.05).connect(lp); lp.connect(g); out(g, pan, 0.12);
  };
  const tri = (t, n, vel, dur = 0.2) => { const g = ac.createGain(); env(g, t, 0.003, vel, dur); osc('triangle', nz(n), t, t + dur + 0.05).connect(g); out(g, 0, 0); };
  const hat = (t, vel) => noiseHit(t, 0.03, 'highpass', 7000, 0.8, vel, 0.15);
  const jumpFx = (t) => { const o = osc('square', 300, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(900, t + 0.16); const g = ac.createGain(); env(g, t, 0.002, 0.05, 0.16); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; o.connect(lp); lp.connect(g); out(g, -0.1, 0.1); };
  const coin = (t) => { chip(t, 'B5', 0.06, 0.07, 0.15); chip(t + 0.07, 'E6', 0.06, 0.3, 0.15); };
  to = 'm';
  // era 1: a slow handheld lullaby, pulse arps on 8ths over a triangle bass
  const arp1 = ['D4', 'Fs4', 'A4', 'Fs4'];
  for (let i = 0; i < 12; i++) chip(i * E8, arp1[i % 4], 0.035, 0.1, -0.15, 'square', 2200);
  [['D3', 0], ['A2', 1], ['D3', 2], ['A2', 3], ['D3', 4], ['A2', 5]].forEach(([n, k]) => tri(k * BEAT, n, 0.12, 0.35));
  // era 2: the arcade, 16th-note arps, bass on 8ths, hats
  const arp2 = ['D5', 'A4', 'Fs5', 'A4', 'E5', 'A4', 'D5', 'B4'];
  for (let i = 0; i < 24; i++) chip(3.0 + i * E16,arp2[i % 8], 0.03, 0.08, 0.1, 'square', 3600);
  for (let i = 0; i < 12; i++) tri(3.0 + i * E8, ['D3', 'D3', 'A2', 'A2', 'E3', 'E3', 'Fs3', 'Fs3', 'D3', 'D3', 'A2', 'A2'][i], 0.12, 0.18);
  to = 's';
  for (let i = 0; i < 6; i++) hat(i * BEAT + E8, 0.015);
  for (let i = 0; i < 12; i++) hat(3.0 + i * E8 + E16, 0.022);
  blip(cu.spot, 1200, 1900, 0.06, 0.05);          // the '!'
  jumpFx(cu.hop);
  sweep(2.5, 3.0, 0.012, 600, 3200, 0);          // into the morph
  chip(3.0, 'D5', 0.05, 0.25, -0.2); chip(3.0, 'Fs5', 0.04, 0.25, 0); chip(3.0, 'A5', 0.04, 0.25, 0.2);
  jumpFx(cu.jump1); coin(cu.jump1 + 0.25);
  for (let i = 0; i < 4; i++) noiseHit(cu.walk + i * E16, 0.02, 'bandpass', 2400, 3, 0.03);   // footsteps
  jumpFx(cu.jump2); coin(cu.jump2 + 0.25);
