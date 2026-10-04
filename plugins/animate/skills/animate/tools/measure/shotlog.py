# Measure a video's editing and sound per second, so a shot log can be written against numbers.
#   cuts            frame diff > max(8, 4 x rolling median of +-12 frames)
#   stepped         runs where motion alternates high/low on 2s (a camera or card stepped every 2 frames)
#   flicker         frame n ~ n-2 but != n-1 (A/B alternation on 2s)
#   per second      cuts, mean motion, loudness median / p90 (dBFS, 100ms RMS), onsets (energy flux), brightness (centroid Hz)
# usage: python shotlog.py references/some-video.mp4 [more videos] [--fps N]   (default: the video's own fps, via ffprobe)
import subprocess, sys
import numpy as np

S = 270
def frames(v):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', f'scale={S}:{S}:flags=area,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, S, S).astype(np.int16)
def audio(v, sr=16000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768, sr

def runs(mask, minlen):
    out, start = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None: start = i
        if not m and start is not None:
            if i - start >= minlen: out.append((start, i - 1))
            start = None
    return out

def measure(v, fps=24):
    F = frames(v); n = len(F)
    d = np.zeros(n); d2 = np.zeros(n)
    for f in range(1, n): d[f] = np.abs(F[f] - F[f - 1]).mean()
    for f in range(4, n): d2[f] = np.abs(F[f] - F[f - 4]).mean()
    med = np.array([np.median(d[max(1, f - 12):f + 13]) for f in range(n)])
    cuts = [f for f in range(1, n) if d[f] > max(8, 4 * med[f]) and d[f] >= d[max(0, f - 1)] and d[f] >= d[min(n - 1, f + 1)]]
    # stepped on 2s: in a 12-frame window, one parity carries the motion
    step = np.zeros(n, bool)
    for f in range(12, n):
        w = d[f - 11:f + 1]; a, b = w[0::2].mean(), w[1::2].mean(); hi, lo = max(a, b), min(a, b)
        if hi > 6.0 and lo < hi / 4: step[f - 11:f + 1] = True
    flick = np.zeros(n, bool)
    for f in range(4, n):
        if d[f] > 8 and d2[f] < 0.35 * d[f]: flick[f] = True
    # audio per 100ms
    x, sr = audio(v); win = sr // 10; nw = len(x) // win
    rms = np.array([np.sqrt((x[i * win:(i + 1) * win] ** 2).mean() + 1e-12) for i in range(nw)])
    db = 20 * np.log10(rms + 1e-9)
    flux = np.maximum(0, np.diff(rms, prepend=rms[0])); onset = (flux > 2.5 * (np.median(flux) + 1e-6)) & (flux > 0.01)
    secs = int(np.ceil(n / fps))
    print(f'\n=== {v}: {n} frames @ {fps}fps ({n / fps:.2f}s), {len(cuts)} hard cuts')
    real = [c for c in cuts if not step[c] and not flick[c]]
    print(f'hard cuts outside stepped/flicker runs: {len(real)}: ' + ', '.join(f'{c}/{c / fps:.2f}s' for c in real))
    print('stepped on 2s: ' + (', '.join(f'f{a}-{b} ({a / fps:.2f}-{(b + 1) / fps:.2f}s)' for a, b in runs(step, 12)) or 'none'))
    print('flicker A/B: ' + (', '.join(f'f{a}-{b} ({a / fps:.2f}-{(b + 1) / fps:.2f}s)' for a, b in runs(flick, 4)) or 'none'))
    print(' sec  cuts  motion  held%   dB med  dB p90  onsets  bright Hz   (cuts = hard cuts outside stepped/flicker runs; motion = mean frame diff)')
    for s in range(secs):
        f0, f1 = s * fps, min(n, (s + 1) * fps)
        w0, w1 = s * 10, min(nw, (s + 1) * 10)
        seg = x[s * sr:(s + 1) * sr]
        if len(seg) > 256:
            spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fr = np.fft.rfftfreq(len(seg), 1 / sr); cen = (spec * fr).sum() / (spec.sum() + 1e-9)
        else: cen = 0
        c = sum(1 for k in real if f0 <= k < f1)
        held = (d[f0:f1] < 0.8).mean() * 100
        if w1 <= w0: print(f'{s:4d}  {c:4d}  {d[f0:f1].mean():6.1f}  {held:5.0f}  (no audio)'); continue
        print(f'{s:4d}  {c:4d}  {d[f0:f1].mean():6.1f}  {held:5.0f}  {np.median(db[w0:w1]):7.1f}  {np.percentile(db[w0:w1], 90):6.1f}  {onset[w0:w1].sum():6d}  {cen:8.0f}')
    secs = min(secs, nw // 10)
    print(f'loudest 100ms: {db.max():.1f} dB at {db.argmax() / 10:.1f}s; quietest second (median): {min(np.median(db[s * 10:(s + 1) * 10]) for s in range(secs - 1)):.1f} dB')

if __name__ == '__main__':
    args = sys.argv[1:]
    want = float(args[args.index('--fps') + 1]) if '--fps' in args else None
    if want: i = args.index('--fps'); del args[i:i + 2]
    for v in args:
        fps = want
        if not fps:
            r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout.strip()
            a_, b_ = (r.split('/') + ['1'])[:2]; fps = float(a_) / float(b_ or 1) if a_ else 24
        measure(v, max(1, round(fps)))   # frame indexing needs a whole fps (29.97 -> 30)
