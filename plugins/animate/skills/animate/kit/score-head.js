// =====================================================================
//  kit/score-head.js — live preview (click to hear), noise/impulse/WAV helpers, and the synth.
//  buildScore() opens here; the piece's score body follows (src/score.js), then kit/score-tail.js closes it.
//  Helpers inside buildScore: pluck, noiseHit, sub, sweep, riser, chime, bass, blip, pad, drone, out, osc, env.
//  Set `to = 'm'` (music bus) or `to = 's'` (sfx bus) before calling them. Notes: nz('D4').
// =====================================================================
// live preview: rAF on the 24fps grid; click to hear the score (?t=1.5 freezes a frame)
const QS = new URLSearchParams(location.search);
const LIVE = { audio: null, t0: 0, start: performance.now() };
if (!QS.has('export')) {
  const cv = document.getElementById('c');
  if (QS.has('t')) renderFrame(parseFloat(QS.get('t')));
  else {
    const tick = () => {
      const sec = LIVE.audio ? LIVE.audio.currentTime - LIVE.t0 : (performance.now() - LIVE.start) / 1000;
      const t = ((sec % LOOP_T) + LOOP_T) % LOOP_T;
      renderFrame(Math.floor(t * FPS) / FPS);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  cv.addEventListener('click', async () => {
    if (LIVE.audio || typeof buildScore !== 'function') return;
    const ac = new AudioContext(), score = await buildScore(ac.sampleRate);
    const buf = ac.createBuffer(2, score.left.length, score.sampleRate);
    buf.copyToChannel(score.left, 0); buf.copyToChannel(score.right, 1);
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(ac.destination);
    LIVE.t0 = ac.currentTime + 0.05; src.start(LIVE.t0); LIVE.audio = ac;
  });
}

const HZ = {
  A1: 55.0, D2: 73.42, F2: 87.31, A2: 110.0, D3: 146.83, F3: 174.61, A3: 220.0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  Fs4: 369.99, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880.0, D6: 1174.66, A6: 1760.0,
};
function makeNoise(ac, sec) {
  const b = ac.createBuffer(1, Math.floor(sec * ac.sampleRate), ac.sampleRate), d = b.getChannelData(0), R = RNG('noise');
  for (let i = 0; i < d.length; i++) d[i] = R.f() * 2 - 1;
  return b;
}
function makeImpulse(ac, sec, decay) {
  const n = Math.floor(sec * ac.sampleRate), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c), R = RNG('ir', c); for (let i = 0; i < n; i++) d[i] = (R.f() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}
function encodeWav(left, right, sr) {
  const n = left.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  ws(36, 'da' + 'ta'); v.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) { v.setInt16(o, Math.round(clamp(left[i], -1, 1) * 32767), true); v.setInt16(o + 2, Math.round(clamp(right[i], -1, 1) * 32767), true); o += 4; }
  return new Uint8Array(buf);
}


const MIDI = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { D2: 38, A2: 45, D3: 50, E3: 52, Fs3: 54, A3: 57, D4: 62, E4: 64, Fs4: 66, G4: 67, A4: 69, B4: 71, Cs5: 73, D5: 74, E5: 76, Fs5: 78, A5: 81, B5: 83, D6: 86, E6: 88, Fs6: 90, A6: 93 };
// any note name: 'D4', 'Fs4' / 'F#4' (sharp), 'Bb3' (flat); the table above is the fast path
function noteNum(n) {
  if (NOTE[n] != null) return NOTE[n];
  const m = /^([A-G])(s|#|b)?(-?\d)$/.exec(n); if (!m) throw new Error(`unknown note "${n}"`);
  return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === 'b' ? -1 : m[2] ? 1 : 0);
}
const nz = (n) => MIDI(noteNum(n));
async function buildScore(sampleRate = 48000, part = 'mix', normIn = null) {
  const TAIL = 3.0, len = Math.ceil((LOOP_T + TAIL) * sampleRate);
  const ac = new OfflineAudioContext(2, len, sampleRate);
  const master = ac.createGain(); master.gain.value = 0.8;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
  master.connect(comp); comp.connect(ac.destination);
  const musicBus = ac.createGain(), sfxBus = ac.createGain();
  musicBus.gain.value = part === 'sfx' ? 0 : 1; sfxBus.gain.value = part === 'music' ? 0 : 1;
  musicBus.connect(master); sfxBus.connect(master);
  // ducking + presence dip, driven by the narration (lines closer than 0.29s are merged)
  const duck = ac.createGain(), dip = ac.createBiquadFilter();
  dip.type = 'peaking'; dip.frequency.value = 2500; dip.Q.value = 1;
  duck.connect(dip); dip.connect(musicBus);
  const lines = [];
  for (const n of TIMELINE.narration) { const L = lines[lines.length - 1]; if (L && n.t0 - L.t1 < 0.29) L.t1 = n.t1; else lines.push({ t0: n.t0, t1: n.t1 }); }
  const DUCK = 10 ** (-3 / 20);
  duck.gain.setValueAtTime(1, 0); dip.gain.setValueAtTime(0, 0);
  for (const L of lines) {
    duck.gain.setValueAtTime(1, Math.max(0, L.t0 - 0.1)); duck.gain.linearRampToValueAtTime(DUCK, L.t0);
    duck.gain.setValueAtTime(DUCK, L.t1 + 0.03); duck.gain.linearRampToValueAtTime(1, L.t1 + 0.18);
    dip.gain.setValueAtTime(0, Math.max(0, L.t0 - 0.1)); dip.gain.linearRampToValueAtTime(-6, L.t0);
    dip.gain.setValueAtTime(-6, L.t1 + 0.03); dip.gain.linearRampToValueAtTime(0, L.t1 + 0.18);
  }
  const mkVerb = (dest, sec = 1.6, decay = 2.8, level = 0.3) => { const v = ac.createConvolver(); v.buffer = makeImpulse(ac, sec, decay); const g = ac.createGain(); g.gain.value = level; v.connect(g); g.connect(dest); return v; };
  const verbs = { m: mkVerb(duck), s: mkVerb(sfxBus) }, shortVerb = verbs.m, longVerb = mkVerb(duck, 3.6, 1.6, 0.55);
  const noise = makeNoise(ac, 3.0);
  let to = 'm';   // which bus the helpers below write to

  // the gain is silent until the envelope starts (a GainNode defaults to 1: a note whose oscillator starts first would click)
  const env = (g, t, a, peak, d) => { g.gain.value = 0.0001; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const out = (node, pan = 0, send = 0) => {
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); p.connect(to === 'm' ? duck : sfxBus);
    if (send) { const s = ac.createGain(); s.gain.value = send; node.connect(s); s.connect(verbs[to]); }
  };
  const osc = (type, f, t, stop) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; };
  function pluck(t, f, vel, pan = 0, dur = 0.32, bright = 3200, send = 0.25) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const g = ac.createGain(); env(g, t, 0.003, vel, dur);
    const g2 = ac.createGain(); g2.gain.value = 0.3;
    osc('triangle', f, t, t + dur + 0.05).connect(lp);
    osc('sine', f * 2.004, t, t + dur + 0.05).connect(g2); g2.connect(lp);
    lp.connect(g); out(g, pan, send);
  }
  function noiseHit(t, dur, type, freq, q, vel, pan = 0, send = 0, sweepTo = 0) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ac.createGain(); env(g, t, Math.min(0.004, dur * 0.3), vel, dur);
    src.connect(f); f.connect(g); out(g, pan, send);
    src.start(t, (t * 7.31) % 2.0); src.stop(t + dur + 0.05);
  }
  function sub(t, vel) {
    const o = osc('sine', 120, t, t + 0.8); o.frequency.exponentialRampToValueAtTime(36, t + 0.3);
    const g = ac.createGain(); env(g, t, 0.004, vel, 0.6); o.connect(g); out(g);
    noiseHit(t, 0.07, 'lowpass', 1100, 0.7, vel * 0.45);
  }
  function sweep(t0, t1, vel, f0, f1, pan = 0) {
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vel, t1 - 0.03); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.005);
    src.connect(f); f.connect(g); out(g, pan, 0.2); src.start(t0, (t0 * 3.1) % 1.0); src.stop(t1 + 0.05);
  }
  function riser(t0, t1, vel) {
    const o = osc('sawtooth', 110, t0, t1 + 0.02); o.frequency.exponentialRampToValueAtTime(1320, t1);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(300, t0); lp.frequency.exponentialRampToValueAtTime(5000, t1);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vel, t1 - 0.01); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.01);
    o.connect(lp); lp.connect(g); out(g, 0, 0.3);
    sweep(t0, t1, vel * 0.9, 400, 7000);
  }
  function chime(t, freqs, vel, pan = 0) {
    freqs.forEach((f, i) => { const g = ac.createGain(), ti = t + i * 0.012; env(g, ti, 0.002, vel / (1 + i * 0.4), 1.3); osc('sine', f, ti, ti + 1.5).connect(g); out(g, pan + (i - 1) * 0.25, 0.6); });
  }
  function bass(t, f, vel) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; const g = ac.createGain(); env(g, t, 0.006, vel, 0.28); osc('triangle', f, t, t + 0.35).connect(lp); lp.connect(g); out(g); }
  function blip(t, f0, f1, dur, vel, pan = 0) { const o = osc('sine', f0, t, t + dur + 0.05); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = ac.createGain(); env(g, t, 0.002, vel, dur); o.connect(g); out(g, pan, 0.2); }

  // ---- v2 instruments built from the helpers above
  function pad(t0, t1, notes, peak, o = {}) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 1200; lp.Q.value = 0.7;
    const g = ac.createGain(), hold = o.swellTo ?? peak;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + (o.att ?? 0.4));
    if (o.swellTo) g.gain.linearRampToValueAtTime(o.swellTo, o.swellAt);
    g.gain.setValueAtTime(hold, t1 - (o.rel ?? 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    notes.forEach((n, i) => { for (const det of [-7, 7]) { const oo = osc(o.type ?? 'sawtooth', nz(n), t0, t1 + 0.05); oo.detune.value = det + i; oo.connect(lp); } });
    lp.connect(g); out(g, o.pan ?? 0, o.send ?? 0.4);
  }
  function drone(t0, t1, f, peak, o = {}) {
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + (o.att ?? 0.5));
    g.gain.setValueAtTime(peak, t1 - (o.rel ?? 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc('sine', f, t0, t1 + 0.05).connect(g); out(g, 0, 0);
  }
  const claudeMotif = (t, notes, vel) => notes.forEach(([n, dt], i) => pluck(t + dt, nz(n), vel, -0.15 + i * 0.1, 0.6, 1300, 0.35));
  const childMotif = (t, notes, vel, bright = 5200, send = 0.3) => notes.forEach(([n, dt], i) => pluck(t + dt, nz(n), vel, 0.2 - i * 0.1, 0.32, bright, send));
