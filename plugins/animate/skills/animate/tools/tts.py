#!/usr/bin/env python3
"""Local, free text-to-speech for a piece's voice-over: one take per line of <piece>/voice/script.json.
   usage: python tools/tts.py <piece> [--only id1,id2] [--models DIR] [--force]
Then:  node tools/voice.mjs <piece>   (places the takes, times every word with faster-whisper, writes voice.json)

script.json gains a "voices" table; each line names one with "voice" (and may override "speed", "exaggeration", "fx"):
  "voices": {
    "narrator": { "engine": "kokoro", "voice": "pm_alex", "lang": "pt-br", "speed": 0.95, "fx": "<ffmpeg -af chain>" },
    "host":     { "engine": "chatterbox", "lang": "pt", "ref": "refs/host.wav", "exaggeration": 0.7, "cfg": 0.4 },
    "robot":    { "engine": "piper", "model": "pt_BR-faber-medium", "length": 1.1, "fx": "asetrate=22050*0.8,..." }
  }
Engines (all run on your machine, no API, no credits):
  kokoro      Kokoro-82M (Apache-2.0) via kokoro-onnx: natural, fast on CPU. Voices: af_*/am_* (en-us), bf_*/bm_* (en-gb),
              pf_dora/pm_alex/pm_santa (pt-br; "voice" may be a blend, { "pm_alex": 0.5, "pm_santa": 0.5 }), ef_dora/em_alex (es), ff_siwis (fr), if_sara/im_nicola (it), jf_*/jm_* (ja) ...
              pip install kokoro-onnx soundfile   (model files download once from Hugging Face)
  chatterbox  Chatterbox Multilingual (MIT): the most expressive; "exaggeration" 0.25 (flat) .. 1.0 (theatrical), "cfg" pace;
              "ref" = a few seconds of a voice to speak in (a voice you own or have the right to use). Slow on CPU, fast on a GPU.
              pip install chatterbox-tts
  piper       Piper (MIT): small and very fast, a bit robotic — good for machines and as a fallback. pip install piper-tts
"fx" is an ffmpeg audio filter chain applied after synthesis (tape, phone, radio, monster ...). Takes are skipped when the
text, voice and settings are unchanged (a hash in <id>.wav.json); --force remakes them."""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

args = sys.argv[1:]


def opt(k, d=None):
    if k in args:
        i = args.index(k); v = args[i + 1]; del args[i:i + 2]; return v
    return d


only = opt('--only')
force = '--force' in args
if force:
    args.remove('--force')
models = os.path.expanduser(opt('--models', os.environ.get('TTS_MODELS', '~/.cache/animate-tts')))
if not args:
    print(__doc__); sys.exit(2)
piece = args[0]
vdir = os.path.join(piece, 'voice')
S = json.load(open(os.path.join(vdir, 'script.json'), encoding='utf-8'))
_engines = {}


def hf(repo, filename):
    p = os.path.join(models, repo.replace('/', '__'), filename)
    if not os.path.exists(p):
        from huggingface_hub import hf_hub_download
        hf_hub_download(repo, filename, local_dir=os.path.dirname(p))
        got = os.path.join(os.path.dirname(p), filename)
        if got != p:
            os.makedirs(os.path.dirname(p), exist_ok=True); os.replace(got, p)
    return p


def kokoro(text, V, out):
    if 'kokoro' not in _engines:
        from kokoro_onnx import Kokoro
        _engines['kokoro'] = Kokoro(hf('fastrtc/kokoro-onnx', 'kokoro-v1.0.onnx'), hf('fastrtc/kokoro-onnx', 'voices-v1.0.bin'))
    import soundfile as sf
    voice = V.get('voice', 'pm_alex')
    if isinstance(voice, dict):   # a blend makes a voice of its own: { "pm_alex": 0.5, "pm_santa": 0.5 }
        voice = sum(_engines['kokoro'].get_voice_style(n) * w for n, w in voice.items())
    audio, sr = _engines['kokoro'].create(text, voice=voice, speed=float(V.get('speed', 1.0)), lang=V.get('lang', 'en-us'))
    sf.write(out, audio, sr)


def chatterbox(text, V, out):
    if 'chatterbox' not in _engines:
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        dev = 'cuda' if torch.cuda.is_available() else 'mps' if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available() else 'cpu'
        _engines['chatterbox'] = ChatterboxMultilingualTTS.from_pretrained(device=dev)
    import torchaudio
    m = _engines['chatterbox']
    ref = V.get('ref')
    kw = dict(language_id=V.get('lang', 'en'), exaggeration=float(V.get('exaggeration', 0.5)), cfg_weight=float(V.get('cfg', 0.5)))
    if ref:
        kw['audio_prompt_path'] = os.path.join(vdir, ref) if not os.path.isabs(ref) else ref
    wav = m.generate(text, **kw)
    torchaudio.save(out, wav, m.sr)


def piper(text, V, out):
    name = V.get('model', 'en_US-lessac-medium')
    lang = name.split('_')[0]; region, voice, quality = name.split('-')
    rel = f'{lang}/{region}/{voice}/{quality}/{name}.onnx'
    onnx = hf('rhasspy/piper-voices', rel); hf('rhasspy/piper-voices', rel + '.json')
    if not os.path.exists(onnx + '.json'):
        os.replace(onnx.replace('.onnx', '.onnx.json'), onnx + '.json')
    subprocess.run([sys.executable, '-m', 'piper', '-m', onnx, '-f', out, '--length-scale', str(V.get('length', 1.0))],
                   input=text.encode('utf-8'), check=True, capture_output=True, env={**os.environ, 'PYTHONUTF8': '1'})   # Windows reads stdin as cp1252 otherwise, and accents come out as symbol names


ENGINES = {'kokoro': kokoro, 'chatterbox': chatterbox, 'piper': piper}
made = 0
for L in S['lines']:
    if only and L['id'] not in only.split(','):
        continue
    V = dict(S['voices'][L['voice']])
    for k in ('speed', 'exaggeration', 'cfg', 'fx', 'length'):
        if k in L:
            V[k] = L[k]
    out = os.path.join(vdir, f"{L['id']}.wav")
    sig = hashlib.sha1(json.dumps([L['text'], V], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    meta = out + '.json'
    if not force and os.path.exists(out) and os.path.exists(meta) and json.load(open(meta)).get('sig') == sig:
        L['file'] = f"{L['id']}.wav"; continue
    with tempfile.TemporaryDirectory() as td:
        raw = os.path.join(td, 'raw.wav')
        ENGINES[V.get('engine', 'kokoro')](L['text'], V, raw)
        # "{sr}" in an fx chain is the take's own sample rate (asetrate={sr}*0.8 pitches down by 20%, whatever the engine)
        sr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', raw], capture_output=True, text=True).stdout.strip() or '24000'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', V.get('fx', 'anull').replace('{sr}', sr), '-ar', '48000', '-ac', '1', out], check=True)
    json.dump({'sig': sig, 'engine': V.get('engine', 'kokoro')}, open(meta, 'w'))
    L['file'] = f"{L['id']}.wav"; made += 1
    print(f"{L['id']:6} {L['voice']:10} {V.get('engine', 'kokoro'):10} {L['text']}")

json.dump(S, open(os.path.join(vdir, 'script.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{made} take(s) made; next: node tools/voice.mjs {piece}')
