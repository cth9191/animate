  // ================= A SHORT HISTORY OF AI: the arc =================
  // warm and sparse (1950-66) -> a cold drone (the winter) -> the groove comes back (1986) and builds (1997-2017)
  // -> fullest at the library (2020) -> dead silence (Nov 30 2022) -> the enter key: the loudest hit -> warm (2025) -> the opening note
  const T = TIMELINE, cu = T.cues, R = RNG('score');
  const FIG = [['D4', 'A4', 'Fs4', 'A4', 'D5', 'A4', 'Fs4', 'A4'], ['D4', 'A4', 'B4', 'A4', 'E5', 'A4', 'B4', 'A4'],
    ['Fs4', 'A4', 'Cs5', 'A4', 'E5', 'A4', 'Cs5', 'A4'], ['D4', 'Fs4', 'A4', 'D5', 'Fs5', 'D5', 'A4', 'Fs4']];
  const SPARK = [['D4', 0], ['A4', E8]];   // the spark's motif: a rising fifth
  const sparkMotif = (t, vel, notes = SPARK) => notes.forEach(([n, dt], i) => pluck(t + dt, nz(n), vel, 0.1 - i * 0.1, 0.6, 2600, 0.35));
  const each = (t0, t1, step, fn) => { for (let k = 0; t0 + k * step < t1 - 1e-6; k++) fn(t0 + k * step, k); };

  // ================= MUSIC =================
  to = 'm';
  // 1950: night, a soft pad; the spark's motif when it opens its eyes
  pad(0.0, 4.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 800, att: 0.05, rel: 0.2 });
  sparkMotif(cu.born, 0.2);
  // 1956-1966: quarter-note plucks, then 8ths, a bass on the beat from 1958
  pad(4.0, 16.1, ['D3', 'A3', 'E4'], 0.032, { cut: 900, att: 0.3, rel: 0.2, send: 0.3 });
  each(4.0, 8.0, BEAT, (t, k) => pluck(t, nz(FIG[0][(k * 2) % 8]), 0.06, Math.sin(k) * 0.3, 0.4, 2600, 0.25));
  each(8.0, 16.0, E8, (t, k) => { pluck(t, nz(FIG[k < 8 ? 1 : 2][k % 8]), 0.065 * (k % 2 ? 0.75 : 1), Math.sin(k * 0.9) * 0.3, 0.32, 3200, 0.2); if (k % 2 === 0) bass(t, nz(Math.floor(k / 4) % 2 ? 'A2' : 'D2'), 0.17); });
  // 1974: the winter, a cold drone and a high note now and then
  drone(16.0, 22.3, nz('D2'), 0.04, { att: 0.6, rel: 0.6 });
  pad(16.0, 22.3, ['A2', 'D3'], 0.018, { type: 'triangle', cut: 500, att: 0.8, rel: 0.6 });
  [16.5, 18.0, 19.5, 21.0].forEach((t, i) => pluck(t, nz(['A5', 'Fs5', 'E5', 'D5'][i]), 0.035, 0.3 - i * 0.2, 0.9, 1800, 0.6));
  // 1986: the beat comes back
  pad(22.0, 41.1, ['D3', 'A3', 'E4'], 0.034, { cut: 1000, att: 0.4, swellTo: 0.048, swellAt: 40.9, rel: 0.1, send: 0.25 });
  each(22.0, 41.0, E16, (t, k) => {
    const sec = t < 25 ? 0 : t < 29 ? 1 : t < 33 ? 2 : t < 37 ? 3 : 4, fig = FIG[Math.floor(k / 8) % 4], acc = k % 4 === 0 ? 1.25 : k % 2 === 0 ? 1.0 : 0.75;
    const dens = [k % 4 === 0, k % 2 === 0, k % 2 === 0 || k % 8 === 3, true, true][sec];
    if (dens) pluck(t, nz(fig[k % 8]), (0.05 + sec * 0.004) * acc, Math.sin(k * 0.9) * 0.35, 0.3, 3400 + sec * 400, 0.16);
    if (k % 2 === 0) bass(t, nz(Math.floor(k / 8) % 2 ? 'A2' : 'D2'), 0.15 + sec * 0.01);
    if (sec >= 2 && k % 4 === 0) sub(t, 0.06 + sec * 0.005);
    if (sec >= 3 && k % 4 === 2) noiseHit(t, 0.02, 'highpass', 8000, 0.7, 0.024, k % 8 ? 0.3 : -0.3);
  });
  // 2020: the library, the fullest; stops dead at 44.0 (dry in the last beat)
  pad(41.0, 44.0, ['D3', 'A3', 'E4', 'A4'], 0.03, { cut: 1300, att: 0.05, rel: 0.02, send: 0.08 });
  each(41.0, 44.0, E16, (t, k) => {
    const fig = FIG[Math.floor(k / 8) % 4], acc = k % 4 === 0 ? 1.3 : 0.9, dry = t >= 43.5 ? 0.02 : 0.1;
    pluck(t, nz(fig[k % 8]), 0.062 * acc, Math.sin(k * 0.9) * 0.4, t >= 43.75 ? 0.18 : 0.28, 5600, dry);
    pluck(t, nz(fig[k % 8]) * 2, 0.018 * acc, -Math.sin(k * 0.9) * 0.4, 0.18, 7000, dry * 0.5);
    if (k % 2 === 0) bass(t, nz(Math.floor(k / 8) % 2 ? 'A2' : 'D2'), 0.15);
    if (k % 4 === 0) sub(t, 0.07);
    noiseHit(t, 0.016, 'highpass', 8500, 0.7, k % 2 ? 0.018 : 0.03, k % 2 ? 0.3 : -0.3);
  });
  riser(43.0, 43.95, 0.015);
  // enter: the stab on the hit, then a flat warm chord (no swell) and a few notes
  ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(cu.enter + i * 0.006, nz(n), 0.36, (i - 2.5) * 0.15, 0.7, 5200, 0.4));
  pad(cu.enter, cu.enter + 0.4, ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'], 0.5, { cut: 3600, att: 0.008, rel: 0.35, send: 0.3 });
  pad(46.0, 51.3, ['D3', 'A3', 'D4', 'Fs4', 'A4'], 0.05, { cut: 1300, att: 0.25, rel: 0.4, send: 0.5 });
  drone(46.0, 51.3, nz('D2'), 0.07, { att: 0.12, rel: 0.4 });
  [[47.0, 'A4'], [47.5, 'D5'], [48.0, 'Fs5'], [49.0, 'E5'], [49.5, 'D5'], [50.0, 'A4']].forEach(([t, n], i) => pluck(t, nz(n), 0.038, (i - 2) * 0.15, 0.6, 3000, 0.4));
  // 2025: warm, quieter, 8ths
  pad(51.0, 56.2, ['D3', 'A3', 'D4', 'Fs4'], 0.045, { cut: 1000, att: 0.3, rel: 0.3, send: 0.4 });
  each(51.0, 56.0, E8, (t, k) => { if (k % 2 === 0 || k % 8 === 5) pluck(t, nz(FIG[3][k % 8]), 0.045, Math.sin(k) * 0.3, 0.35, 2600, 0.25); if (k % 4 === 0) bass(t, nz(Math.floor(k / 8) % 2 ? 'A2' : 'D2'), 0.13); });
  // the answer: back to the opening pad; the spark's motif, then the loop
  pad(56.0, 60.0, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 800, att: 0.3, rel: 0.35 });
  sparkMotif(58.0, 0.2, [['D4', 0], ['A4', E8], ['D5', BEAT]]);

  // ================= SFX =================
  to = 's';
  const scratch = (t0, t1, vel = 0.03) => { for (let t = t0; t < t1 - 1e-6; t += E16) noiseHit(t + 0.01, 0.1, 'bandpass', 2800 + R.n(500), 1.4, vel * (0.7 + R.f() * 0.5), 0.2); };
  const clicks = (t0, t1, vel = 0.05, f = 4200) => { for (let fr = Math.round(t0 * FPS); fr < Math.round(t1 * FPS); fr += 2) if (R.f() < 0.85) noiseHit(fr / FPS + 0.004, 0.012, 'bandpass', f + R.n(600), 3, vel, R.n(0.4)); };
  // 1950: the pen, the ? opens its eyes
  scratch(0.25, 2.25);
  blip(cu.born, 500, 900, 0.08, 0.12); chime(cu.born + 0.02, [nz('D6')], 0.05);
  // 1956: chalk on 8ths, the drop, the name tag
  for (let t = 4.0; t < 5.75; t += E8) noiseHit(t, 0.03, 'highpass', 2600, 0.8, 0.05, -0.2);
  blip(cu.drop, 1200, 300, 0.28, 0.06); sub(cu.drop + 0.3, 0.12); noiseHit(cu.tag, 0.05, 'lowpass', 1400, 0.8, 0.12);
  // 1958: knob clicks, the "yes" ding
  for (let t = 8.5; t < 10.5; t += E8) noiseHit(t, 0.012, 'bandpass', 4500, 2, 0.04, 0.3);
  chime(cu.yes, [nz('A5'), nz('D6')], 0.08); blip(cu.yes, 880, 1320, 0.08, 0.06);
  // 1966: typing, then the teletype prints the reply
  clicks(12.25, 13.0, 0.06); clicks(14.0, 14.75, 0.06);
  clicks(13.0, 13.5, 0.05, 3000); clicks(14.9, 15.4, 0.05, 3000); chime(13.5, [nz('E6')], 0.03);
  // 1974: wind
  sweep(16.0, 19.0, 0.012, 300, 900, -0.3); sweep(19.0, 22.0, 0.012, 900, 300, 0.3);
  // 1986: pencil, crumples
  scratch(22.25, 22.75, 0.025); scratch(23.5, 24.0, 0.025);
  for (let i = 0; i < 7; i++) noiseHit(22.1 + i * 0.4 + 0.2, 0.14, 'bandpass', 1800 + R.n(400), 1.0, 0.04, R.n(0.4));
  // 1997: flashes, the king falls
  [25.25, 25.75, 26.25, 27.5, 28.25].forEach((t) => noiseHit(t, 0.02, 'highpass', 6000, 0.8, 0.03, R.n(0.5)));
  sub(cu.king + 0.25, 0.15); noiseHit(cu.king + 0.25, 0.2, 'lowpass', 600, 0.8, 0.13);
  // 2012: shutter clicks, fans, "cat!"
  [29.0, 29.5, 30.0, 30.5].forEach((t) => { noiseHit(t, 0.012, 'highpass', 5000, 0.8, 0.05); noiseHit(t + 0.05, 0.012, 'highpass', 4000, 0.8, 0.04); });
  { const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 2;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, 29.0); g.gain.exponentialRampToValueAtTime(0.01, 29.3); g.gain.setValueAtTime(0.01, 32.8); g.gain.exponentialRampToValueAtTime(0.0001, 33.0);
    src.connect(f); f.connect(g); out(g, -0.2); src.start(29.0); src.stop(33.05); }
  chime(cu.cat + 0.25, [nz('D6'), nz('A6')], 0.06);
  // 2016: stone clacks on the beat; move 37
  for (let t = 33.0; t < 35.0; t += BEAT) noiseHit(t, 0.025, 'bandpass', 2600, 2, 0.06, 0.3);
  noiseHit(cu.move37 + 0.2, 0.03, 'bandpass', 2400, 2, 0.16); sub(cu.move37 + 0.2, 0.12); chime(cu.move37 + 0.22, [nz('Fs6')], 0.05);
  // 2017: a string pluck as each string ties; "animal" last and loudest
  for (let i = 0; i < 9; i++) pluck(37.5 + i * 0.375 + 0.1, nz(['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6', 'E6', 'Fs6', 'A6'][i]), i === 8 ? 0.06 : 0.035, 0.3 - i * 0.07, 0.25, 6000, 0.2);
  // 2020: pages whoosh
  for (let t = 41.0; t < 44.0 - 1e-6; t += E8) sweep(t, t + 0.2, 0.009, 1200, 4000, R.n(0.5));
  // Nov 30 2022: silence; then two keys; enter is the loudest hit
  cu.keys.forEach((t) => noiseHit(t, 0.012, 'bandpass', 4200, 3, 0.05));
  sub(cu.enter, 0.75); sub(cu.enter + 0.004, 0.35); noiseHit(cu.enter, 0.012, 'highpass', 6000, 0.8, 0.25); noiseHit(cu.enter, 0.3, 'lowpass', 900, 0.7, 0.3, 0, 0.4);
  chime(cu.enter + 0.02, [nz('D5'), nz('Fs5'), nz('A5'), nz('D6')], 0.09);
  for (let i = 0; i < 22; i++) blip(46.2 + i * 0.07, 700 + (i % 5) * 120, 1100 + (i % 5) * 150, 0.04, 0.025, R.n(0.6));
  // 2025: typing, tools pop, the tests pass
  clicks(51.5, 52.25, 0.04);
  cu.pills.forEach((t, i) => { blip(t, 900, 1400, 0.05, 0.07, i % 2 ? 0.2 : -0.2); noiseHit(t, 0.02, 'highpass', 5000, 0.8, 0.04); });
  chime(cu.pass, [nz('D6'), nz('A6')], 0.06);
  // the morphs: a paper swish into each one (the 44.0 one ends before the silence)
  T.morphs.forEach((tc, i) => { if (tc === 44) { sweep(43.5, 43.92, 0.01, 2600, 500, 0); return; } sweep(tc - 0.3, tc + 0.05, 0.011, 500, 2600, (i % 2 ? 0.25 : -0.25)); noiseHit(tc + 0.2, 0.08, 'bandpass', 1500, 0.9, 0.03, 0); });
  // the answer: the spark writes
  scratch(cu.reply[0], cu.reply[1], 0.025);
