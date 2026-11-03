#!/usr/bin/env python3
"""Word timings for a voice-over, read from the audio itself (faster-whisper, local, no API).
   usage: python tools/voice_words.py <take.wav> [<take.wav> ...] [--model small.en] [--lang en]
   prints JSON, one list per file: [[{"w": "word", "t0": 1.23, "t1": 1.51}, ...], ...]
Called by tools/voice.mjs; it falls back to an estimate when faster-whisper isn't installed (pip install faster-whisper)."""
import json
import sys


def main():
    args = sys.argv[1:]
    model, lang = 'small.en', 'en'
    if '--model' in args:
        i = args.index('--model')
        model = args[i + 1]
        del args[i:i + 2]
    if '--lang' in args:   # e.g. pt: use a multilingual model (small, or a local folder), not small.en
        i = args.index('--lang')
        lang = args[i + 1]
        del args[i:i + 2]
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device='cpu', compute_type='int8')
    # decode with ffmpeg ourselves (16 kHz mono float): avoids PyAV version clashes inside faster-whisper
    import subprocess
    import numpy as np
    out = []
    for f in args:
        pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        audio = np.frombuffer(pcm, dtype=np.float32)
        segs, _ = m.transcribe(audio, word_timestamps=True, vad_filter=False, beam_size=5, language=lang)
        out.append([{'w': w.word.strip(), 't0': round(w.start, 3), 't1': round(w.end, 3)} for s in segs for w in s.words or []])
    print(json.dumps(out))


if __name__ == '__main__':
    main()
