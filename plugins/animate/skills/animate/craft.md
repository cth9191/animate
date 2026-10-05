# Craft: the rules that came out of building these pieces

Each rule was learned the hard way on a real piece. Follow them unless the user asks otherwise; if one turns out wrong, propose a change.

## Story
- **The plot is a true process.** The real steps, in their real order; every beat follows from the one before. Pace belongs to what a beat *means*, not to fixed seconds.
- **One constant the eye can hold** — a hero, a stage, a page — while everything else changes.
- **Colour means one thing** for the whole piece (e.g. orange = the machine's mind, red = sound). Never spend that colour on decoration.
- **Silence before the payoff, loudest on the payoff.** A 0.5–4s drop to near-silence on a held image, then the single loudest hit. Find the beat the true story already has (video models were silent until 2025; ChatGPT appeared on an empty box).
- **The busiest moment is not the loudest.** Peak density goes just before the silence; the loud hit is the turn.
- **The end is the start, changed.** Return to the opening image with the difference that the story made (Turing's page, now answered).
- **One device you can say in a sentence** ("the spark gains a ray each era").
- **A history's facts can supply the arc** — and must be true. Web-check every date and number; say "a", not "the first", unless sourced.

## Frame (see grammar/FRAME.md and the style's own checklist in its STYLE.md)
- **Banned defaults** (they read as generic AI video): a centred title on a gradient; everything fading in; labels or frame borders in the corners; glows on UI chrome; generic particle bursts; a logo sting as the only ending. Every frame should look like *this* style and *this* subject.
- **Something new every 2–4 seconds:** a move, a reveal, a cut, a reaction. `review.mjs` → DEAD BEATS flags longer still stretches (silence acts are exempt; set `review.deadMax` to change the limit). Read `review/phone.jpg` — one frame a second at 360px wide — before calling a piece done.
- **One constant the eye can hold** in every frame: a hero with a face in character styles, the object or the axes in diagram styles.
- **The medium shows** at phone size: torn edges in cut paper, hatching in ink, dots in riso, graphite in sketchbook, crisp pixels in pixel art.
- **Small life even in held frames** (steam, a blink, a blinking LED, a cursor); character styles want 3+ details of background life per frame.
- **Act ideas out literally** ("AI winter" = snow on a closed lab and an empty piggy bank).
- **Vary scale across the board**, including at least one extreme close-up.
- **Phone scale:** anything that matters is ≥ ~100px on the 1080-wide frame; captions ≥ 50px; keep 9:16 content inside x 60–940, y 250–1500 (the platform UI covers the rest).
- **Eras that differ only in motion look identical on a contact sheet** — give each a still-visible signature.

## Transitions
- **Match the transition to the format.** Chronologies transition *from the scene*: a shape morph (sun → eye) or draw-off/draw-on. Character and catalogue pieces cut hard on the beat.
- **Keep at most one hard cut in a morph-joined piece** — the slam on the payoff.
- **Budget morphs in short pieces.** Each bridge costs 1.2s by default (0.4s of it blank paper): under 30s use 3 morphs or fewer, or shorten them with `{ tc, d: 0.4, ... }` (0.8s). Bridge objects should be ≥ 200px at the boundary, or the world shrinks into a tiny window early.
- **Shape-morph bridge (kit/morph.js):** the old world closes in on one object through a window shaped like it (the style draws the window: a torn hole, an inked iris, a printed circle), the object blends into its counterpart on blank paper, the new world opens out of the counterpart. Write one bridge per beat at the storyboard stage and build those bridges.
- **The bridge object must be in frame at the boundary** — pull push-ins back first.
- **Hero-to-hero bridges draw the hero itself** (blended position/size), not two outlines.
- **Morph on the style's blank sheet** (`STYLE.paper`), not a blend of two wall colours (mud).

## Motion
- **Springs over easing curves** for anything with mass: `springMove` / `springTrack` (kit/core.js). A tiny overshoot on UI, none on big type. A value with many targets gets one spring per change (`springTrack`), never a restarted ease.
- **Everything moves on 2s:** time is `TT = B * 2 / FPS`; the boil, the camera and every move share the boil index `B = floor(F / 2)`.
- **Event helpers:** `ev(t, d)` (0..1 progress), `popS(t)` (back-eased pop-in), `handText(..., { frac })` / `ink(..., { frac })` write-ons, `monoText(..., { count })` typing. Schedule actions on cue times listed in `TIMELINE.cues`.
- **Idle life is free:** the spark bobs, blinks and sways on its own; keep heroes alive in held shots.
- **Cameras put a world point on a screen point** (`camOf({ z, p, to })`, `push()`), never "zoom about a point" — that drops the subject under the caption.
- **Pin the hero in the fastest stretch** by centring zoom bumps on it; `review.mjs` checks the anchor.
- **Hard cuts land on finished frames:** what defines the new shot is fully drawn on its first frame; write-ons start a few frames early.
- **What existed before the step is on screen from frame 0.** Only the step's own effects animate in (the files were staged before `git commit`; they don't pop in during it).
- **Beat-cut pieces: a shot is complete on its first frame.** Tags and captions that pop or write on after `E0` never appear in shots under ~1s; give short shots no caption, or draw it finished. Cuts on 16ths land on odd frames at 24fps — the renderer picks the era by frame, so they're exact (start from `templates/beat-cut/`).
- **Captions hold:** each on screen ≥ 1.25s and ≤ 3.5 words/s; pop the year tag, write the caption on just after.

## Timing
- **24fps + 120 BPM:** an 8th = 6 frames, a 16th = 3 — every cut and morph is a whole frame. (30fps → 112.5 BPM; 60fps → 900/7 BPM.)
- **Cuts and morph centres on the 8th grid**, proven by `review.mjs`, not by eye.
- **Loop length = NFRAMES / FPS** so the loop point sits on the frame grid; fold the audio tail over the start.

- **Act roles** (`TIMELINE.acts[].role`, read by `review.mjs` → STORY ARC): `build`, `journey`, `peak` (the busiest), `silence` (the drop before the turn), `gift` (the payoff: the loudest), `goodbye` (the decay). Leave a role out when the piece has no such act.

## Sound
- **With a voice-over, the voice is the clock and the payoff sits in a pause.** Each beat starts ~0.3s after a sentence ends; land the payoff hit (and the picture's return) in the silence *before* the line that names it — under speech the duck swallows it. Judge the arc on the score without the voice.
- **With the user's track, the song is the arc.** Find its drop and its biggest hit in `beats.json` and put the turn and the payoff there; cut on its beats (`onBeat`), keep the score to sound effects.
- **The score improves with the story** (thin early, fullest at the peak); motifs carry characters (the spark = a rising fifth).
- **A loudness stage** (RMS-normalise to −17 dBFS, look-ahead limiter at −1 dBFS) is in `kit/score-tail.js`; stems share the mix gain so they sum back to it.
- **Under that stage, balance by removing energy, not adding it** — every relative boost is partly undone.
- **The sustained pad sets a section's p90**, not the plucks; cut the pad to quiet a section.
- **Payoff recipe:** a short chord stab (~0.4s) + a sub on the hit, a *flat* chord after it, nothing busy on top. Otherwise the held chord or a busy section outscores the hit.
- **Silence needs a hard stop:** dry sends in the last beat before it, every event ending before it, a faint room tone at most.
- **You can't hear the score.** Measure it (`review.mjs` arc table, the loudest 100ms window) and tell the user to listen.

## Code
- **A style is a plug-in:** `piece.json` `"style"` picks `styles/<name>/kit.js`; the renderer only calls its `STYLE` hooks. One style per piece (kits share names).
- **Every frame starts from a clean sheet:** never rely on what the last frame left on a canvas (the renderer clears the era layer to `STYLE.paper`); `tile.mjs` catches it as `deterministic: false`.
- **`trace()` rounds corners through midpoints:** give it dense points (`resample(P, true, 30)`) for boxes that must cover the frame.
- **One file, built:** `tools/build.mjs` concatenates `src/` parts with `kit/` files; edit the parts, never the built `index.html`.
- **Deterministic:** `RNG(...)` seeded by keys; `wobble(..., key)` reseeds per boil step; never `Math.random`/`Date`. `tools/tile.mjs` prints a determinism check.
- **Write big files in ~200-line parts**, one per message; write scripts with the Write tool rather than long shell heredocs.
- **`paint()`/`hatch()`/`pencil()` reset `globalAlpha`** — to hide a prop, skip it; don't fade it.
- **Offscreen layers** for windows, masks and resolution tricks (render at the true resolution, scale up nearest-neighbour).

## Review
- **Three layers, every time:** test tiles while building (look at them), `review.mjs` numbers, and the contact sheets per shot with a written PASS table.
- **Don't trust your eye for text.** A fresh run passed a shot whose commit sheet was cut off at the frame edge with a tag over its hash; `review.mjs` → TEXT finds those. Deliberate crowding goes in `piece.json` `review.textIgnore` with a reason.
- **Name the weakest shot and what would fix it** in the log — it's the next run's to-do list.
- **Iterate the mix with `export.mjs --only-audio`** (re-renders the score and remuxes the master).

## References
- **Reference media stays local and uncommitted** — it's other people's work, kept for study.
- **Measure a reference into a timed table before writing** (`tools/measure/shotlog.py`; pass the real fps): cuts, holds, what's on screen, the loudest moment, the silence.
- **Map its beats to the new subject; don't reskin them.** Find its thesis, its spine, its problem and its callback, and give each a true counterpart.
- **Compare proportions, not pixels** (element width as % of frame) when matching a look.
