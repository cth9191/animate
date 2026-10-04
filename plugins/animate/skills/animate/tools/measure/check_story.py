# Checks shot logs and story outlines. Prints PASS/FAIL per file.
#   shot log  (grammar/shotlogs/*.md): contiguous frames covering "frames: N"; every row has a step -> beat, a link
#             "type: reason" (except row 1), a pace mode and a sound note
#   outline   (pieces/study-story/outlines/*.md): beats contiguous on the 16th grid (0.125s), a link reason on every
#             cut, a hold/build >= 1.5s, a beat >= 4 cuts/s, loudest beat != busiest beat, every claim tagged [F1-F7]
#             or UNVERIFIED, narration <= 3.5 words/s
# usage: python check_story.py <file or directory> [...]
import os, re, sys

def rows(text):
    out = []
    for line in text.splitlines():
        if line.startswith('|') and not re.match(r'^\|\s*-', line):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0].isdigit(): out.append(cells)
    return out

def sections(text):
    secs, cur = {}, None
    for line in text.splitlines():
        if line.startswith('## '): cur = line[3:].strip(); secs[cur] = []
        elif cur: secs[cur].append(line)
    return secs

def nums(s): return [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', s.replace('−', '-'))]

def check_shotlog(p):
    t = open(p, encoding='utf8').read(); errs = []
    N = int(re.search(r'frames:\s*(\d+)', t).group(1)); expect = 0; R = rows(t)
    for r in R:
        if len(r) < 9: errs.append(f'row {r[0]}: {len(r)} columns'); continue
        a, b = [int(x) for x in re.findall(r'\d+', r[1])[:2]]
        if a != expect: errs.append(f'row {r[0]}: starts f{a}, expected f{expect}')
        expect = b + 1
        if '→' not in r[4]: errs.append(f'row {r[0]}: no "step → beat"')
        if r[0] != '1' and ':' not in r[5]: errs.append(f'row {r[0]}: link needs "type: reason"')
        if not r[6] or r[6] == '—': errs.append(f'row {r[0]}: no pace mode')
        if not r[8] or r[8] == '—': errs.append(f'row {r[0]}: no sound note')
    if expect != N: errs.append(f'rows cover f0-f{expect - 1}, video has {N} frames')
    return errs, f'{len(R)} shots, f0-f{expect - 1} of {N}'

RULE_SECS = ['THE TRUE PROCESS', 'THE HERO AND THE ANCHOR', 'THE PACE', 'THE CUT', 'THE SOUND', 'THE TITLE AND THE LOOP']
def check_outline(p):
    t = open(p, encoding='utf8').read(); S = sections(t); errs = []
    B = rows('\n'.join(S.get('Beats', [])))
    prev = 0.0; beats = []
    for r in B:
        if len(r) < 9: errs.append(f'beat {r[0]}: {len(r)} columns'); continue
        t0, t1 = nums(r[1])[:2]; t1 = abs(t1)
        for x in (t0, t1):
            if abs(x * 8 - round(x * 8)) > 1e-6: errs.append(f'beat {r[0]}: {x}s is off the 16th grid')
        if abs(t0 - prev) > 1e-6: errs.append(f'beat {r[0]}: starts {t0}, expected {prev}')
        prev = t1
        if r[0] != '1' and ':' not in r[7]: errs.append(f'beat {r[0]}: link needs "type: reason"')
        cps = max(nums(r[6]) or [0]); db = re.findall(r'(-?−?\d+(?:\.\d+)?)\s*dB', r[8])
        beats.append(dict(i=r[0], dur=t1 - t0, pace=r[5].lower(), cps=cps, db=float(db[-1].replace('−', '-')) if db else None))
    if not beats: return ['no beats'], ''
    if not any(b['dur'] >= 1.5 and b['pace'].startswith(('hold', 'build', 'write')) for b in beats): errs.append('no hold/build of 1.5s or more')
    if not any(b['cps'] >= 4 for b in beats): errs.append('no beat at 4 or more cuts/s')
    withdb = [b for b in beats if b['db'] is not None]
    loud = max(withdb, key=lambda b: b['db']) if withdb else None; busy = max(beats, key=lambda b: b['cps'])
    if loud is None: errs.append('no dB targets in the sound column')
    elif loud['i'] == busy['i']: errs.append(f'loudest beat {loud["i"]} is also the busiest')
    claims = [l for l in S.get('Claims', []) if l.startswith('- ')]
    if not claims: errs.append('no claims listed')
    unver = 0
    for c in claims:
        if 'UNVERIFIED' in c: unver += 1
        elif not re.search(r'\[(F[1-7]|P\d+)\]', c): errs.append(f'untagged claim: {c[:60]}')  # P# = a piece's own pipeline facts
    words = sum(len(re.findall(r"[A-Za-z0-9/']+", l.split('"')[1] if l.count('"') >= 2 else '')) for l in S.get('Narration', []))
    wps = words / prev if prev else 0
    if wps > 3.5: errs.append(f'narration {wps:.2f} words/s > 3.5')
    return errs, f'{len(beats)} beats, {prev:.3f}s, loudest beat {loud["i"] if loud else "-"} ({loud["db"] if loud else "-"} dB), busiest beat {busy["i"]} ({busy["cps"]:g} cuts/s), {len(claims)} claims ({unver} UNVERIFIED), narration {words} words = {wps:.2f} w/s'

def check(p):
    base = os.path.basename(p)
    if os.sep + 'shotlogs' in p or '/shotlogs' in p: errs, info = check_shotlog(p)
    else: errs, info = check_outline(p)
    print(f'{"PASS" if not errs else "FAIL"}  {p}  ({info})')
    for e in errs: print('   -', e)
    return not errs

if __name__ == '__main__':
    files = []
    for a in sys.argv[1:]:
        files += sorted(os.path.join(a, f) for f in os.listdir(a) if f.endswith('.md')) if os.path.isdir(a) else [a]
    ok = all([check(f) for f in files])
    print('all:', 'PASS' if ok else 'FAIL')
