---
name: animate
description: Make a short procedural animation in any style — an explainer, a history, a little story — as a single-file canvas video with a synthesized score, rendered to MP4. Ships with styles (cut paper, crosshatch ink, riso print, sketchbook, manim-style math, pixel art) and makes new ones from the user's references. Walks the user through intake, then three check-ins (story, look, storyboard) before animating, and proves the result with measured review checks. Use when the user asks for an animated video, short, explainer or reel made in code, or wants a look matched from references.
argument-hint: "[what the video is about] [style or reference]"
---

# Animate

You make short animated videos in code: one `<canvas>`, drawn and scored procedurally, deterministic frame by frame, rendered with a headless browser and ffmpeg. The story follows a grammar studied from strong short-form animation; the look is a **style** — a plug-in kit chosen from [styles/](styles/README.md) or made from the user's references with [new-style.md](new-style.md).

**Requirements:** Node 18+, Playwright with Chromium (`npm i -g playwright && npx playwright install chromium`), ffmpeg on PATH. Check them first; if one is missing, tell the user the install command and stop.

All paths below are relative to this skill's base directory. Pieces live in the user's project at `pieces/<name>/` (create `pieces/` if needed); styles the user makes live in `<project>/styles/<name>/`.

## Non-negotiables

1. **No animating before the storyboard is approved.** The check-ins exist because a wrong story or look costs a full build.
2. **Look at references before drawing anything** — the user's, or the style's `sample.png` and demo. Then check every key frame against [grammar/FRAME.md](grammar/FRAME.md) and the style's own checklist in its `STYLE.md`.
3. **Every factual claim on screen is checked with a web search** and listed with its source in the brief. Never claim "first" without a source.
4. **Single file, all code:** one `index.html`, no images/audio/video files, no `data:` URIs, no URLs, no web fonts. `tools/build.mjs` enforces it.
5. **Deterministic:** seeded randomness only (`RNG(...)`), the boil index `B` for per-step variation. Never `Math.random()` or wall-clock time.
6. **Reference media stays local.** Never commit it, copy its code, or name its artist in published output unless the user asks to credit them.
7. **"Done" is measured:** `tools/review.mjs` passes and you have looked at the contact sheets. Report the numbers, not "looks good".
8. **Ask with options.** Use AskUserQuestion with a recommended default first, so the user can answer in one click.

## The flow

### 0. Intake
Ask the questions in [intake.md](intake.md) — only the ones you can't infer. For the look, show the gallery (`docs/styles.png` in the repo, or build it: `node tools/gallery.mjs <out.png> [<project>/styles]`) and ask: **which of these, or show me a reference?** Then study the references yourself against FRAME.md and the style's checklist.

### 1. Story check (text, fast)
Pick the **format** from [grammar/FORMATS.md](grammar/FORMATS.md) — the plot engine decides it (a history is a chronology joined by morphs; a mission cuts on the beat; a list is a catalogue). Read [grammar/STORY.md](grammar/STORY.md). Web-check the facts. Then show the user:
- the one-line idea and the sayable device ("the spark gains a ray each era and ends as the answer")
- the format and why, the style, length, BPM
- a numbered beat table: time, what happens, the bridge into the next beat, the sound's role (where the silence is, where the loudest hit is)

Ask: **approve / change beats / different angle.** Revise until approved. This is where "I meant X, not Y" gets caught cheaply.

### 2. Look check (2–4 style frames)
Copy [templates/piece/](templates/piece/) to `pieces/<name>/` and set `"style"` in its `piece.json`.
- **A shipped style:** read its `STYLE.md` and demo (`styles/<name>/demo/src/`) and draw with its kit.
- **The user's references:** follow [new-style.md](new-style.md) — measure, match 1–2 frames side by side with `tools/compare.mjs`, get a thumbs up, save the style.

Draw 2–4 of the most different beats as full-size frames. Each must pass FRAME.md and the style's checklist. Render them with `tools/storyboard.mjs` (set `TIMELINE.board` to those beats) or `tools/still.mjs`, and show the image. Ask: **thumbs up per frame / change the look / try another style.**

### 3. Storyboard check (every beat)
Draw every beat in the approved look. Fill `TIMELINE.board` with one key time per beat (`{ t, title, sound, next }`) and render the board. Ask for **thumbs up/down by panel number** and notes; redraw what's down; repeat. The panels are the video's own scene functions, so nothing is redrawn later.

### 4. Build
1. Write `pieces/<name>/brief.md` (spec, style, beats, bridges, sound plan, claims + sources). Keep a `LOG.md`.
2. Animate the scenes: timed actions with `TT`, `ev(t, d)`, `popS(t)`, write-ons (see [craft.md](craft.md) → Motion). Wire eras, cameras and bridges in `src/bridges.js` (morph-joined formats) or leave `BRIDGES = []` for hard cuts.
3. `node tools/build.mjs pieces/<name>` → `index.html` (the style's kit is pulled in from `piece.json` `"style"`).
4. Test tiles while building: `PIECE=pieces/<name> node tools/tile.mjs tile.png <frames...>` — look at them.
5. Score in `src/score.js` (see craft.md → Sound).
6. `node tools/export.mjs pieces/<name> --share` → frames, `audio.wav`, stems, `renders/final.mp4`, `renders/share.mp4`. Iterate the mix with `--only-audio` (re-renders the score and remuxes it, ~4× faster).
7. `node tools/review.mjs pieces/<name>` → contact sheets per shot, cut grid, morph grid, story arc, anchor. Fix until it passes, view the sheets, write a per-shot PASS table in `LOG.md`.

### 5. Deliver
Send `renders/share.mp4`. Say in a few lines: what it is, the checks' numbers, what the review caught and fixed, the weakest shot, and what you haven't verified (e.g. you can't listen to the score). Ask what should change: story, look, transitions, pacing, sound.

### 6. Learn
After each run append to the piece's `LOG.md`. If something new went wrong or worked, propose a one-line rule for [craft.md](craft.md), the style's `STYLE.md` or a kit change, and add it when the user agrees.

## Parallel agents (long pieces)

A 45–60s piece has 10–15 scenes; split the drawing across agents once the storyboard is approved:
- **One `src/` file per section or era, owned by one agent** (`src/era-01.js`, `src/era-02.js`, …). List them in `piece.json` `"build"` in order, between the style and `src/bridges.js`.
- **The shared parts stay with you:** `src/head.html` (TIMELINE, eras, shots, cues), `src/bridges.js`, the score, and the kit. Agents read them but never edit them; if a scene needs a kit helper, they write it in their own file under a prefixed name.
- **Brief each agent** with the approved board panel(s), the style's `STYLE.md`, the era's time range and cue names, its bridge objects (what must be in frame at the boundary), and the rules: deterministic, no new globals without the era prefix, tile its frames and look at them.
- **`build.mjs` joins them**; you build, tile across every boundary, and run the review.

## Files

| path | what | read when |
|---|---|---|
| [intake.md](intake.md) | the questions and defaults | step 0 |
| [craft.md](craft.md) | the distilled rules: story, frame, motion, timing, sound, code, review | before step 1, and when building |
| [grammar/FORMATS.md](grammar/FORMATS.md) | 8 story formats (engine × stage × clock), invariants, which are proven | step 1 |
| [grammar/STORY.md](grammar/STORY.md) | beat-level story rules with evidence | step 1 |
| [grammar/FRAME.md](grammar/FRAME.md) | what a single key frame must hold, in any style | steps 2–3 |
| [styles/](styles/README.md) | the styles: `STYLE.md` (rules + frame checklist), `kit.js`, `sample.png`, `demo/`; the STYLE hooks contract | steps 0, 2, building |
| [new-style.md](new-style.md) | making a new style from the user's references | step 2 |
| `kit/core.js` | RNG, easing, geometry, the hand-drawn line (wobble, ink, paint, hatch, pencil, stipple, grain), cameras, time helpers | building |
| `kit/morph.js` | the renderer: eras, push-ins, zoom bumps, shape-morph bridges, overlays — draws through the style's STYLE hooks | building |
| `kit/board.js` | the storyboard renderer | steps 2–3 |
| `kit/score-*.js` | synth (pluck, pad, drone, bass, sub, noiseHit, sweep, riser, chime, blip), loudness stage | scoring |
| [templates/piece/](templates/piece/) | a working 8s starter piece | step 2 |
| `tools/` | build, tile, still, storyboard, export, review, compare (reference vs frame), gallery, framehash (pixel-identity check); `measure/` for analysing reference videos | throughout |
| [examples/history-of-ai/](examples/history-of-ai/) | a full 60s worked example (cut paper) | when unsure how something fits |

## Honesty about what's proven
Formats F2 (chronology / morph chain) and F4 (mission) have each produced a piece that passed every check from the card alone; F5 (fixed-hero journey) has several. The others are documented from study but unproven — say so when you pick one. Cut paper and crosshatch have carried full pieces; riso, sketchbook, math and pixel each come from one or two finished pieces plus a demo; a style made from new references is new ground until it has carried a piece. WebGL motion design (ray-marched 3D, motion blur, bloom) is not a shipped style yet.
