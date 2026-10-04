  // =====================================================================
  //  kit/score-tail.js — render, fold the tail over the loop point, loudness stage
  //  (RMS-normalise to -17 dBFS, look-ahead limiter at -1 dBFS; stems share the mix gain curve)
  // =====================================================================
  const buf = await ac.startRendering();
  // fold the tail over the loop point so the loop is seamless
  const N = Math.round(LOOP_T * sampleRate), L = new Float32Array(N), Rr = new Float32Array(N);
  const c0 = buf.getChannelData(0), c1 = buf.getChannelData(1);
  for (let i = 0; i < N; i++) { L[i] = c0[i] + (i + N < len ? c0[i + N] : 0); Rr[i] = c1[i] + (i + N < len ? c1[i + N] : 0); }
  // loudness for a phone (subagents-short): RMS-normalise to -17 dBFS, then a look-ahead limiter at -1 dBFS.
  // Stems reuse the mix's gain and gain curve, so they sum back to the mix.
  let k = normIn?.k, g = normIn?.g;
  if (!g) {
    let sum = 0; for (let i = 0; i < N; i++) sum += (L[i] * L[i] + Rr[i] * Rr[i]) / 2;
    k = 10 ** (-17 / 20) / Math.sqrt(sum / N || 1e-12);
    const ceil = 0.89; g = new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(Rr[i])) * k; g[i] = p > ceil ? ceil / p : 1; }
    const att = Math.exp(-1 / (0.0015 * sampleRate)), rel = Math.exp(-1 / (0.09 * sampleRate));
    for (let i = N - 2; i >= 0; i--) g[i] = Math.min(g[i], 1 - (1 - g[i + 1]) * att);
    let r = 1; for (let i = 0; i < N; i++) { r = Math.min(g[i], 1 - (1 - r) * rel); g[i] = r; }
  }
  for (let i = 0; i < N; i++) { L[i] *= k * g[i]; Rr[i] *= k * g[i]; }
  return { left: L, right: Rr, sampleRate, norm: { k, g } };
}
function wavB64(s) {
  const bytes = encodeWav(s.left, s.right, s.sampleRate);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function renderAudioWav() { return wavB64(await buildScore(48000, 'mix')); }
async function renderAudioStems() {
  const mix = await buildScore(48000, 'mix');
  const music = await buildScore(48000, 'music', mix.norm), sfx = await buildScore(48000, 'sfx', mix.norm);
  return { music: wavB64(music), sfx: wavB64(sfx) };
}
window.renderAudioWav = renderAudioWav;
window.renderAudioStems = renderAudioStems;
</script>
</body>
</html>
