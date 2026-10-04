<!-- Part of the animate skill. Evidence cites Kevin Ngo's publicly posted animations, studied for craft; this project is not affiliated with him. Paths like pieces/... and review.mjs refer to the project these notes came from. -->

# Formats: the structures Kevin's videos are built on

Extracted 2026-10-02 from shot logs of **16** of Kevin Ngo's videos (`grammar/shotlogs/`): the 4 from the story study plus 12 logged in the formats study (Aug 27 – Oct 1 posts). Each log ends in a `## Structure` section; this file compares them.

**Where it sits:** a piece = **grammar** (`STORY.md`, rules every piece follows) + **a format** (this file: what drives the plot and how the camera gets from one thing to the next) + **a style pack** (`styles/`: the medium) + **a subject** (a true thing about Claude Code).

**The finding that forced this file:** `STORY.md` was written from three 24–28s beat-cut videos. Across 16, half of his pieces don't cut on a beat grid at all: four have no hard cuts in 48–80s. Their structure comes from a different *engine*, so several `STORY.md` rules are format-specific, not universal (see "What STORY.md got wrong" at the end).

## The formula: four choices

Every one of the 16 is one choice from each column. Read a format as a proven combination.

| 1. Plot engine (what makes the next thing happen) | 2. Stage (how we get from one thing to the next) | 3. Clock (what the changes land on) | 4. Medium |
|---|---|---|---|
| **chronology:** real time order, often with an on-screen counter | **beat-cut:** held frames joined by hard cuts | **music grid:** 120 BPM 8ths/16ths at 24fps, 90 BPM 16ths (4 frames), or a 1.00s clock at 30fps | a style pack |
| **token through stations:** one object travels; each station does one thing to it | **one sheet, follow-camera:** one huge drawing, eased pans between stations, a zoom-out at the end | **voice:** the change lands ~0.2–0.4s after a sentence ends | |
| **call → catalogue:** a question answered by a list, gathered into one image | **one page, morph chain:** no camera; the scene is erased down to one shape that becomes the next scene (draw-off / draw-on) | **even stations:** equal 7–8s blocks with no grid | |
| **goal + helper:** someone wants something; the helper solves it step by step | **locked-off build:** one framing; layers accumulate | | |
| **fixed subject, N variations:** the same armature redrawn N ways | | | |
| **claims → proof:** a card says it, footage shows it | | | |

**How the columns couple** (from the 16, no exceptions):
- **Spatial plots get a follow-camera.** When the plot is a *path* (stations, a machine), the camera travels one sheet and never cuts (rainbow, narrated machine).
- **Chronology on one place gets a fixed stage.** When time passes in one place, nothing moves but the drawing (dinosaurs, engineer day, both Mona Lisas).
- **Characters and lists get cuts on the beat.** Story with several places/people, or a catalogue, cuts held frames on a music grid (boat, answer, love, Clawd, tortoise, self-portraits).
- **A voice takes over the clock.** Both narrated pieces drop the beat grid entirely and change picture on sentence ends; the music sits under at −20 to −25 dB.

## Invariants: every format, every time

Counts are out of the 15 Kevin animations (the Fable control is excluded).

1. **One constant the eye can hold.** A hero, a stage, a silhouette or a page: something never changes while everything else does (15/15). It doesn't need to hold screen position except in the beat-cut journey formats.
2. **Colour means one thing.** Each piece assigns meaning to colour and never breaks it: visited/not (rainbow), survivor lineage (dinosaurs yellow), the AI (engineer green), Claude's plans (tortoise red line), side (chess red/blue), love (red circle), trouble (red racks). At least 10/15; the exceptions are the two painting reproductions, the Sep self-portrait reel and the narrated machine (decorative colour, though its hero is always the darkest navy).
3. **Silence before the payoff, loudest on the payoff.** A drop of 15–35 dB for 0.5–4s while the picture holds, then the loudest hit on the turn or reveal: dinosaurs (−45 dB 0.45s → impact), engineer (−49 on the flatline), tortoise (−40 → sunrise, −45 → lift-off), Clawd (−45.5 on the clock → door), love (quiet at 8s → "!"), fly, answer, boat. 10/15. The exceptions are pieces with no turn (rainbow, both self-portraits, both Mona Lisas).
4. **The end is the start, changed.** 12/15 return to their opening image; 6 loop pixel-exactly (both Mona Lisas, Clawd, engineer, dinosaurs ≈, love ≈). Only chess and the two self-portrait reels don't.
5. **One device you can say in a sentence.** "The idioms are built literally." "The answer was her." "The robin is still a dinosaur." "The face sits blank, then the loudest note." Every log could name one; the device is usually a reveal at the 80–95% mark.
6. **Claude, when present, is a small helper with one hard-edged identity.** The asterisk (love, self-portraits), the starburst that teaches by drawing (tortoise), Clawd the pixel crab, "the one hard-edged shape in a soft world" (Clawd), a green dot (engineer). It helps a human; it is rarely the hero.

**Not invariant** (useful, optional): a handwritten title or signature (7/15), a music beat grid (7/15, plus chess weakly), acceleration toward the end (6/15), on-screen text (8/15).

**New device, 4/15: the flash-forward open.** Open on the finished result (both Mona Lisas, tortoise's dream, Clawd's party), then rewind or erase and earn it. It makes the loop automatic.

## The formats

Each card: what it is, the numbers to hit, its evidence, and what it could carry for Claude Code. "Checks" are things `review.mjs` could prove.

### F1. Machine (token through stations, one sheet)
- **Engine:** a token (ball, marble) moves through N stations; each station does one literal thing to it. Order = the path.
- **Stage:** one large drawing; the camera holds on a station (83% of runtime in rainbow, 62% in the narrated one), then makes a ~1.0s eased pan (motion blur on the fast ones) to the next. A zoom-in at 1s, a zoom-out reveal of the whole layout in the last 4–7s.
- **Clock:** even stations of 7.2–8.6s (rainbow, music-only) or speech-paced stations of 2–7s (narrated).
- **Rhythm:** no acceleration with even stations; with a voice, the last lines shorten and moves come 0.7–1.8s apart before the zoom-out.
- **The reveal:** the zoom-out shows the layout *means* something (the machine is a clock face; the stations spiral into the rainbow).
- **Device:** the token visibly accumulates the stations' effects (stripes of colour), then spends them at the end.
- **Evidence:** `rainbow-explainer`, `narrated-wustep`.
- **Claude Code:** the agent loop. The prompt is the ball; Read, Grep, Edit, Bash/tests are stations; each leaves a mark on it (context gathered, a diff, a green tick); it arrives at "done"; the zoom-out shows the stations form a loop. Narrated, each line can be an idiom the machine performs ("it reads the room", "it runs the tests").
- **Checks:** 0 hard cuts; pans ≤1.2s; the anchor in frame ≥95%; a final zoom-out ≥2s; last frame = full layout.

### F2. Fixed-stage chronology (one page, time moves, the camera doesn't)
- **Engine:** chronology with a visible clock: a counter caption ("230 → 0 million years ago") or the time of day in the narration.
- **Stage:** one fixed frame (a ground line, the sun in a corner, the caption bottom-centre) held ~88–100% of runtime. Things are *drawn on* (line, then fill) and *drawn off* (colour drains, then the line erases). Morph match-cuts carry one shape into the next scene (sun → eye; sun → clock; graph line → waveform; one window → her room).
- **Clock:** music-led (no grid evident) or voice-led (change ~0.2s after the sentence ends). Scenes median 1.5s (dinosaurs) to 2.9s (engineer).
- **Turn:** a silence on a held image, then a slam (the impact; the flatline), then a dark stretch (ash, night) with the longest quiet (5s at −49 dB).
- **Device:** the last era/scene reveals a survivor or successor ("still here."; "I've got the morning"), then redraws frame 0.
- **Evidence:** `dinosaurs`, `engineer-day-9x16` (the narrated, 9:16 variant).
- **Claude Code:** a session's context window over time, with a token counter as the caption ("12k … 180k / 200k"). Files and tool output are drawn on as it fills; the turn is the window nearly full (silence), compaction is the impact, and the summary is the small survivor that carries on ("still here."), ending on a fresh, near-empty window.
- **Checks:** 0 hard cuts; the frame static ≥85%; ≥4 shape-bridge morphs; a counter or caption present ≥80%; silence ≤−40 dB for ≥0.4s right before the loudest hit.
- **Proven (2026-10-03):** `pieces/history-of-ai-video` was built from this card and passes all checks (`review.mjs` FORMAT F2 section, `TIMELINE.format = 'F2'`). The variant: a *screen inside the stage*, with eras drawn in it, and the morph bridge is one yellow block through noise. What the card lacked, now part of it:
  - **"The frame static" means the stage outside the content window and text boxes** (`TIMELINE.stage.ignore`). The content inside it may move, and here even has its own tracking camera.
  - **A counter loops only if frame 0 has none.** Write it on at ~0.5s and erase it before the end.
  - **The arc checks need F2 scoping:** "peak has the most cuts" can't apply; "most motion" fails on noise/boil; "music under the voice" applies only with a voice.
  - **The payoff sound:** the F4 recipe (a short stab on the hit, a flat chord after it, nothing busy on top) worked on the first audio pass.

- **Built (2026-10-03, `pieces/history-of-ai` run 2): the morph chain in cut paper.**
  - The old era is seen through a window *shaped like the bridge object*, which shrinks onto it.
  - On blank paper the object's outline blends into its counterpart's, resampled by angle around the centroid.
  - The new era opens out of the counterpart's shape.
  - It works across *different* worlds, not only one fixed stage, so it extends F2 to chronologies that change place. Keep at most one hard cut, for the slam.

### F3. Call → catalogue (a question answered by a list)
- **Engine:** a call goes out; the answer is a catalogue, one item per beat, gathered into one image; the answer goes back.
- **Stage:** beat-cut held frames; recurring framings that each side "lives in" (the girl's window; Claude's sky) plus one card per catalogue item, each card its own flat colour, the label in the lower third.
- **Clock:** 120 BPM; cards 0.5s (1 beat) × 8, one held 1.0s, then 0.25s × 4, then a 2s gather (the heart; `answer`'s mandala). 83% of cuts on the 8th grid.
- **Turn:** a quiet beat while the question lands (the lowest second at 8s), then "!" and the catalogue.
- **Device:** a reversal at the end (the reply circles "you": the answer was the asker).
- **Evidence:** `what-do-you-love` (648K views, his most-viewed animation of Sep 16 – Oct 2), `answer`.
- **Claude Code:** "What can you do?" answered by a catalogue of real tool uses and tasks, one per beat, gathered into the one project the dev is working on. Or a question round trip: a dev asks, subagents fan out (the catalogue), the results gather into one answer.
- **Checks:** ≥80% of cuts on the 120 BPM 8th grid; the catalogue cards accelerate (0.5 → 0.25s); a gather shot of ≥1.5s after the fastest run.

### F4. Mission (goal + helper, step by step)
- **Engine:** someone wants something and can't; the helper solves it one problem at a time. Flash-forward open on the goal achieved, then rewind.
- **Stage:** beat-cut held frames, wide ↔ close alternation (shot/reaction); a recurring prop that marks time (a wall clock top-left in every interior; day/night wipes).
- **Clock:** 120 BPM (Clawd: 90% of cuts on the 8th grid) or 90 BPM 16ths (tortoise: 81% on the 4-frame grid).
- **Rhythm:** vignettes of 3–4s, one per problem → a rush of 4 × 0.5s → brake into a wait → the deadline in silence → the payoff held ~2s.
- **Device:** the helper shows its plan before doing it (tortoise: a red line sketch over the scene, then the same thing in full colour). The payoff converges back to the opening image.
- **Evidence:** `clawd-grandma`, `tortoise`.
- **Claude Code:** the most direct fit, and Kevin already casts Clawd. A dev must ship by 5pm; four problems (a failing test, a missing file, a merge conflict, a review comment); Claude Code fixes each in a vignette, showing its plan first (plan mode as the red sketch, F4/F2 facts allowed); the rush; the clock; the merge.
- **Checks:** ≥80% of cuts on the grid; a flash-forward: last frame ≈ frame 0; a 4-shot rush at 1 beat each; silence ≤−40 dB before the loudest hit.
- **Proven (2026-10-03):** `pieces/ship-by-five` was built from this card alone and passes all checks (`review.mjs` FORMAT F4 section, `TIMELINE.format = 'F4'`). What the card lacked, now part of it:
  - **Framing:** close-ups fill the phone-safe area (content ≥ 80% of its width; ~1.2× on 9:16).
  - **The payoff sound:** the hit is a short chord stab (~0.4s body), the chord after it stays flat (no swell), and the rush's hits never stack with the groove's kick. Otherwise the loudness stage makes the held chord, or the rush, louder than the hit.
  - **Outline checks:** `check_story.py`'s "a beat at ≥ 4 cuts/s" is F5-only; F4's rush is 2 cuts/s.

### F5. Fixed-hero journey (the world changes, the hero stays put)
- **Engine:** chronology or a voyage; the hero changes worlds.
- **Stage:** beat-cut; in the fastest section the hero holds its exact screen position while the world cuts around it. Iris and match-position links.
- **Clock:** 120 BPM; the cut rate accelerates on a fixed tempo (beat → 8th → 16th).
- **Evidence:** `paper-boat`, `answer`, `fruit-fly` (its journey sections). Fully specified by `STORY.md`; our subagent pieces are this format.
- **Claude Code:** anything with one carried thing: a context jar carried across tasks, a message passed through tools.
- **Checks:** what `review.mjs` already checks (cut grid, story arc, anchor).

### F6. Process loop (result → blank → the true making steps → result)
- **Engine:** the real order of making something, on one locked-off framing. Open on the finished thing, dissolve to blank (6–8 frames), rebuild.
- **Stage:** 100% locked off; each stage starts in place on a note attack; each stage looks like its real material.
- **Rhythm:** fast early stages (one per ~1.3s), long near-still holds late; or passes of 2.4–4.0s getting finer.
- **Sound:** one crescendo that brightens as the detail gets finer; the loudest note on the single reveal (the blank face gets its features).
- **Ending:** pixel-identical to frame 0.
- **Evidence:** `mona-lisa`, `mona-lisa-strokes`.
- **Claude Code:** a feature from blank to merged: the finished app → blank editor → plan → scaffold → failing tests → code → green tests → refactor → the finished app. Locked off on one editor window; the loudest note when the tests go green.
- **Checks:** 0 hard cuts; 1 dissolve; last frame = frame 0 (diff < 1); stage starts within 1 frame of note attacks.

### F7. Variation reel (one subject, N techniques)
- **Engine:** none: the same armature redrawn N ways, one per second.
- **Stage:** held stills, hard match-position cuts, exactly 1.00s each (30 frames at 30fps); the silhouette never moves.
- **Clock:** the 1.00s clock. The Sep remake puts a piano attack on every cut with a 1/3s note grid inside (92% on grid); the arc lives in the music's swell, not the picture.
- **Evidence:** `self-portraits` (Aug), `self-portraits-piano` (Sep). `fable-recreation` (control) is a loose relative.
- **Claude Code:** weak for explaining; useful as a brand or style reel (Claude's asterisk drawn 20 ways). Low priority.
- **Checks:** every shot 1.00s; the armature mask overlap ≥95% across cuts.

### F8. Trailer (claims → proof)
- **Engine:** a handwritten claim card, then footage that proves it; a cold-open hook; a famous set piece as the climax (the 1858 Opera Game); a win screen; the title twice.
- **Stage:** cut close crops (median 1.34s), cards 1.2–2.5s as the quiet beats.
- **Evidence:** `chess-doodles` only. **Provisional:** one example.
- **Claude Code:** feature launches ("Claude Code can now …" card → proof).

## What STORY.md got wrong (format-specific rules stated as universal)

1. **"Cuts land on the beat grid."** True for beat-cut formats (F3, F4, F5, F7: 81–92% on grid). F1, F2 and F6 have 0 hard cuts; with a voice the clock is the sentence, not the bar.
2. **"The journey is the fastest section and speeds up."** F1 with even stations never accelerates; F6 *decelerates* hard; F4's fastest stretch is a 2s rush just before the deadline.
3. **"Travel is one continuous camera move."** In F1 the *whole piece* is travel; in F2 there's no camera at all.
4. **"A handwritten title in the last 2–4s."** 7/15. Not part of any format's structure; a signature choice.
5. **"One small hero from first frame to last."** F2 can use a *relay* of heroes sharing one identity cue (dinosaurs: small and yellow); F6 and F7 have no hero, only a fixed subject.
6. **Missing:** the flash-forward open (4/15), and the morph chain as a transition type (draw-off to one shape → draw-on).

## Measurement notes

- `pieces/study-story/measure/shotlog.py` misreads three kinds of footage: animation on 2s hides real cuts (love: 1 reported, 31 real), dissolves of 6–8 frames read as one hard cut (both Mona Lisas), and windows straddling a cut look like stepping (self-portraits). For cut counts use a coarse 16×16 colour diff; for grids, test the specific BPM against chance (fraction of a frame window over the grid period).
- Per-video measurements, transcripts and sheets: `references/measure/`, `references/sheets/` (local only).
