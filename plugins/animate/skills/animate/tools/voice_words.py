#!/usr/bin/env python3
"""Word timings for a voice-over, read from the audio itself (faster-whisper, local, no API).
   usage: python tools/voice_words.py <voice.wav> [--model small.en]
   prints JSON: [{"w": "word", "t0": 1.23, "t1": 1.51}, ...]
Called by tools/voice.mjs; it falls back to an estimate when faster-whisper isn't installed (pip install faster-whisper)."""
import json
import sys


def main():
    args = sys.argv[1:]
    model = 'small.en'
    if '--model' in args:
        i = args.index('--model')
        model = args[i + 1]
        del args[i:i + 2]
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(args[0], word_timestamps=True, vad_filter=False, beam_size=5, language='en')
    out = []
    for s in segs:
        for w in s.words or []:
            out.append({'w': w.word.strip(), 't0': round(w.start, 3), 't1': round(w.end, 3)})
    print(json.dumps(out))


if __name__ == '__main__':
    main()
