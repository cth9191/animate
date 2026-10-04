# Story grammar: beat by beat

**The one idea:** tell a *true process* as a story. The process gives the order, the hero carries you through it, and the pace changes with what each step means. Every cut or transition has a reason you could say out loud.

These rules come from measured shot logs of short story-driven animations. Several are specific to beat-cut formats (the beat grid, the journey being fastest, travel as one camera move, the hero held in place) — read [FORMATS.md](FORMATS.md) first, and its "Format-specific rules" section, before applying them to a piece that isn't a fixed-hero journey (F5).

## The true process

- **The plot is a real process with its own order, so nothing needs explaining** (egg → larva → adult; written → folded → launched → arrives → unfolded; 1950 → 2025).
- **Each beat is one true step, shown by the image that step naturally produces** (the egg hatches onto the food it eats; the letter folds into a boat).
- **The process has a turn:** a moment where it could go wrong or change direction (a threat, a storm, being alone, a winter).
- **The subject can be quietly about the maker,** and the ending can say so.

## The hero and the anchor

- **One small, simple hero from the first frame to the last.**
- **In the fastest section the hero holds its screen position while the world changes around it** (`review.mjs` checks this as the anchor).
- **The hero changes form but keeps one identity cue** (a colour, the eyes, the same paper and handwriting, a ray count that grows).

## The pace

- **Open still and quiet:** 1–1.5s held, quiet sound.
- **A build holds one framing while detail accrues, for 3–6s.** A build alone isn't a story; it needs a process.
- **Travel is one continuous camera move, not cuts** (stepped on 2s).
- **In beat-cut formats the journey is the fastest section and speeds up on a fixed tempo** (0.5s → 0.25s → 0.125s at 120 BPM).
- **A turn builds slowly, then changes in 1–3 frames.**
- **The connection is held:** 0–1 cuts/s for 3–7s.

## The cut

- **Every cut has a reason you could say out loud** — one of the link types below.
- **In beat-cut formats, cuts land on the beat grid** (120 BPM at 24fps: 8ths = 6 frames, 16ths = 3).
- **Most "quick cuts" are steps of one move on 2s, not new shots.**
- **Late shots call back to early framings, changed.**

| link type | reason it gives | frame recipe |
|---|---|---|
| next-step | the process continues | hard cut on the grid, same world or the next one |
| match-position | the hero holds its spot, the world changes | hard cut or wipe; the hero drawn identically across it |
| shape morph | this thing *becomes* that thing | the scene closes in on one object, it morphs into its counterpart, the next scene opens out of it (`kit/morph.js`) |
| iris-in / iris-out | into or out of the hero | a circle on the hero over 2–4 frames |
| scale-in / scale-out | inside it, or everything around it | the same subject 5–20× bigger or smaller |
| pov | what the hero sees | cut to the hero's view, same moment |
| cause-effect | this made that happen | a build shot, then the effect on the grid |
| time-cut | later | a flicker on 2s, or the light/sky changes on the same framing |
| callback | back to an earlier image, changed | reuse an earlier framing exactly |

## The sound

- **Sound drops before a chapter turn**, 8–30 dB for about a second, while the picture holds.
- **The loudest single hit marks a turn, not the busiest cutting.**
- **The journey is a flat groove:** loudness steady within ~3 dB for 5–9s.
- **Each step or world voices itself** (a bell rings, a pencil scratches, a teletype clatters).

## The title and the loop

- **A handwritten title in the last 2–4s is optional** — a signature, not what makes the story work.
- **The ending returns to the opening image, changed by the story.**

## What varies (choose per piece)

- **Beat order:** start → build → change → journey → turn → connection → title is common, but the connection can come before the quiet beat, and some pieces have no separate peak.
- **Where the loudest sustained section sits:** the connection, a journey plateau, or the payoff.
- **Number of shots:** ~12–16 in 25–30s for beat-cut pieces; far fewer when worlds morph.
- **How fixed the hero is:** fixed on screen the whole way, or only while travelling.
- **Tempo and medium:** 100 or 120 BPM; crosshatch, cut paper, riso, flat picture book.
- **The ending:** a literal loop or a fade.
- **What the turn is:** danger, the scale of the world, loneliness, a winter, a silence.

## Beat types (pace per beat type, measured)

| beat type | what it does | pace mode | cuts/s | loudness | length |
|---|---|---|---|---|---|
| start | the hero at rest | hold | 0 | quiet (−22 to −44 dB) | 1–1.5s |
| build | one framing, detail added | build | 0–1 | rising | 3–6s |
| change | the hero's form changes | step on 8ths | 1–5 | a hit on the change | 2–3s |
| travel | getting there | one camera move on 2s | steps | a building pad or groove | 2–4s |
| journey | the world, many places | step → montage, speeding up | 3–8 | flat groove | 5–9s |
| turn | it could go wrong, or everything gathers | build, then slam | 0 → 2 | a drop, then the loudest hit | 1–3s |
| quiet | alone, still | hold | 0 | the lowest (−20 to −44 dB) | 1–1.5s |
| connection | the hero meets what it was for | hold, slow movement | 0–1 | warm, swelling | 3–7s |
| time passes | later | flicker on 2s | steps | no onsets | ~1s |
| title + loop | the ending; back to the start | write-on hold | 0 | fading or held | 2–4s |

## Common mistakes

1. **Assuming one fixed arc order.** The beat *types* and their pace recur; the order varies.
2. **Making the connection the loudest moment by default.** The rule that holds is that the loudest *hit* marks a turn.
3. **Treating "fast" as many shots.** Speed mostly comes from steps of one move on 2s.
4. **Putting one long silence act everywhere.** Short dips of about a second before each chapter are as common.
