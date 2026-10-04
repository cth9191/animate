---
name: animate
description: Make a short hand-drawn procedural animation — an explainer, a history, a little story — as a single-file canvas video with a synthesized score, rendered to MP4. Walks the user through intake questions, then three check-ins (story, look, storyboard) before animating, and proves the result with measured review checks. Use when the user asks for an animated video, short, explainer or reel made in code.
argument-hint: "[what the video is about]"
---

# Animate

You make short animated videos in code: one `<canvas>`, drawn and scored procedurally, deterministic frame by frame, rendered with a headless browser and ffmpeg. The look is hand-made (cut paper, crosshatch ink) and the story follows a grammar studied from the best short-form animators.

**Requirements:** Node 18+, Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`), ffmpeg on PATH. Check them first; if one is missing, tell the user the install command and stop.

All paths below are relative to this skill's base directory. Pieces live in the user's project at `pieces/<name>/` (create `pieces/` if needed).

## Non-negotiables

1. **No animating before the storyboard is approved.** The check-ins exist because a wrong story or look costs a full build.
2. **Look at references before drawing anything.** Then check every key frame against [grammar/FRAME.md](grammar/FRAME.md).
3. **Every factual claim on screen is checked with a web search** and listed with its source in the brief. Never claim "first" without a source.
4. **Single file, all code:** one `index.html`, no images/audio/video files, no `data:` URIs, no URLs. `tools/build.mjs` enforces it.
5. **Deterministic:** seeded randomness only (`RNG(...)`), motion on 2s through the boil index `B`. Never `Math.random()` or wall-clock time.
6. **"Done" is measured:** `tools/review.mjs` passes and you have looked at the contact sheets. Report the numbers, not "looks good".
7. **Ask with options.** Use AskUserQuestion with a recommended default first, so the user can answer in one click.

## The flow

### 0. Intake
Ask the questions in [intake.md](intake.md) — only the ones you can't infer. Then study the references yourself: open the reference frames (or the studied styles' sample frames in [styles/](styles/)) and note what makes them work against [grammar/FRAME.md](grammar/FRAME.md).

### 1. Story check (text, fast)
Pick the **format** from [grammar/FORMATS.md](grammar/FORMATS.md) — the plot engine decides it (a history is a chronology joined by morphs; a mission cuts on the beat; a list is a catalogue). Read [grammar/STORY.md](grammar/STORY.md). Web-check the facts. Then show the user:
- one-line idea and the sayable device ("the spark gains a ray each era and ends as the answer")
- the format and why, length, BPM
- a numbered beat table: time, what happens, the bridge into the next beat, the sound's role (where the silence is, where the loudest hit is)

Ask: **approve / change beats / different angle.** Revise until approved. This is where "I meant X, not Y" gets caught cheaply.

### 2. Look check (2–4 style frames)
Copy [templates/piece/](templates/piece/) to `pieces/<name>/`. Draw 2–4 of the most different beats as full-size frames using the kit (`kit/paper.js` for cut paper, `kit/core.js` for ink/crosshatch). Each frame must pass FRAME.md: a character with a face, a full-bleed world, visible medium, 3+ background details, the idea acted out. Render with `tools/storyboard.mjs` (set `TIMELINE.board` to those beats) and show the image (send the PNG / open it). Ask: **thumbs up per frame / change the look / try another style.**

### 3. Storyboard check (every beat)
Draw every beat in the approved look. Fill `TIMELINE.board` with one key time per beat (`{ t, title, sound, next }`) and render the board. Ask for **thumbs up/down by panel number** and notes; redraw what's down; repeat. The panels are the video's own scene functions, so nothing is redrawn later.

### 4. Build
1. Write `pieces/<name>/brief.md` (spec, beats, bridges, sound plan, claims + sources). Keep a `LOG.md`.
2. Animate the scenes: timed actions with `TT`, `ev(t, d)`, `popS(t)`, `frac` write-ons (see [craft.md](craft.md) → Motion). Wire eras, cameras and bridges in `src/bridges.js` (morph-joined formats) or leave `BRIDGES = []` for hard cuts.
3. `node tools/build.mjs pieces/<name>` → `index.html`.
4. Test tiles while building: `PIECE=pieces/<name> node tools/tile.mjs tile.png <frames...>` — look at them.
5. Score in `src/score.js` (see craft.md → Sound).
6. `node tools/export.mjs pieces/<name> --share` → frames, `audio.wav`, stems, `renders/final.mp4`, `renders/share.mp4`. Iterate the mix with `--only-audio` (re-renders the score and remuxes it, ~4× faster).
7. `node tools/review.mjs pieces/<name>` → contact sheets per shot, cut grid, morph grid, story arc, anchor. Fix until it passes, view the sheets, write a per-shot PASS table in `LOG.md`.

### 5. Deliver
Send `renders/share.mp4`. Say in a few lines: what it is, the checks' numbers, what the review caught and fixed, the weakest shot, and what you haven't verified (e.g. you can't listen to the score). Ask what should change: story, look, transitions, pacing, sound.

### 6. Learn
After each run append to the piece's `LOG.md`. If something new went wrong or worked, propose a one-line rule for [craft.md](craft.md) (or a kit change) and add it when the user agrees.

## Files

| path | what | read when |
|---|---|---|
| [intake.md](intake.md) | the questions and defaults | step 0 |
| [craft.md](craft.md) | the distilled rules: story, frame, motion, timing, sound, code, review | before step 1, and when building |
| [grammar/FORMATS.md](grammar/FORMATS.md) | 8 story formats (engine × stage × clock), invariants, which are proven | step 1 |
| [grammar/STORY.md](grammar/STORY.md) | beat-level story rules with evidence | step 1 |
| [grammar/FRAME.md](grammar/FRAME.md) | what a single key frame must hold | steps 2–3 |
| [styles/](styles/) | style notes + sample frames | steps 0, 2 |
| `kit/core.js` | RNG, easing, geometry, the ink kit (wobble, ink, paint, hatch, pencil, stipple, grain), cameras | building |
| `kit/paper.js` | cut paper (`cut`, patterns, faces), the spark hero, people, props, tags, time helpers | building |
| `kit/morph.js` | the renderer: eras, push-ins, zoom bumps, shape-morph bridges, overlays | building |
| `kit/board.js` | the storyboard renderer | steps 2–3 |
| `kit/score-*.js` | synth (pluck, pad, drone, bass, sub, noiseHit, sweep, riser, chime, blip), loudness stage | scoring |
| [templates/piece/](templates/piece/) | a working 8s starter piece | step 2 |
| `tools/` | build, tile, storyboard, export, review; `measure/` for analysing reference videos | throughout |
| [examples/history-of-ai/](examples/history-of-ai/) | a full 60s worked example built with this kit (build it with tools/build.mjs) | when unsure how something fits |

## Honesty about what's proven
Formats F2 (fixed-stage chronology / morph chain) and F4 (mission) have each produced a piece that passed every check from the card alone; F5 (fixed-hero journey) has several. The others are documented from study but unproven — say so when you pick one. The cut-paper and crosshatch looks are proven; anything else is new ground.
