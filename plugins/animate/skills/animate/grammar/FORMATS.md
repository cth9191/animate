# Formats: the structures short animations are built on

**Where it sits:** a piece = **grammar** ([STORY.md](STORY.md), rules every piece follows) + **a format** (this file: what drives the plot and how we get from one thing to the next) + **a style** (`styles/`: the medium) + **a subject** (something true).

These come from measured shot logs of 16 short-form animations. The key finding: about half of them don't cut on a beat grid at all — several run 48–80s with no hard cuts. Structure comes from the plot *engine*, so pick the format first.

## The formula: four choices

Every piece is one choice from each column. Read a format as a proven combination.

| 1. Plot engine (what makes the next thing happen) | 2. Stage (how we get from one thing to the next) | 3. Clock (what the changes land on) | 4. Medium |
|---|---|---|---|
| **chronology:** real time order, often with an on-screen counter | **beat-cut:** held frames joined by hard cuts | **music grid:** 120 BPM 8ths/16ths at 24fps, 90 BPM 16ths, or a 1.00s clock at 30fps | a style |
| **token through stations:** one object travels; each station does one thing to it | **one sheet, follow-camera:** one huge drawing, eased pans between stations, a zoom-out at the end | **voice:** the change lands ~0.2–0.4s after a sentence ends | |
| **call → catalogue:** a question answered by a list, gathered into one image | **morph chain:** the scene closes down to one shape that becomes the next scene (shape morph, draw-off / draw-on) | **even stations:** equal 7–8s blocks with no grid | |
| **goal + helper:** someone wants something; the helper solves it step by step | **locked-off build:** one framing; layers accumulate | | |
| **fixed subject, N variations:** the same armature redrawn N ways | | | |
| **claims → proof:** a card says it, footage shows it | | | |

**How the columns couple** (no exceptions in the study):
- **Spatial plots get a follow-camera.** When the plot is a *path* (stations, a machine), the camera travels one sheet and never cuts. (F1 is still unproven: when a chronology or a fixed-hero journey tells the same process, prefer the proven card and say so.)
- **Chronologies transition from the scene.** Time passing — on one stage or across many worlds — is joined by morphs and draw-offs, not cuts.
- **Characters and lists get cuts on the beat.** A story with several places/people, or a catalogue, cuts held frames on a music grid.
- **A voice takes over the clock.** Narrated pieces drop the beat grid and change picture on sentence ends; the music sits under at −20 to −25 dB.

## Invariants: every format, every time

1. **One constant the eye can hold** — a hero, a stage, a silhouette or a page that never changes while everything else does.
2. **Colour means one thing** for the whole piece (visited/not, a lineage, the AI, a plan, a side, love, trouble).
3. **Silence before the payoff, loudest on the payoff.** A drop of 15–35 dB for 0.5–4s while the picture holds, then the loudest hit on the turn or reveal. (Pieces with no turn skip it.)
4. **The end is the start, changed.** Most return to their opening image; many loop pixel-exactly.
5. **One device you can say in a sentence**, usually revealed at the 80–95% mark.
6. **A helper character, when present, is small, with one hard-edged identity** — it helps a human and is rarely the hero.

**Optional, not invariant:** a handwritten title or signature, a music beat grid, acceleration toward the end, on-screen text.

**A useful device: the flash-forward open.** Open on the finished result, then rewind or erase and earn it. It makes the loop automatic.

## The formats

"Checks" are things `tools/review.mjs` proves when `TIMELINE.format` is set.

### F1. Machine (token through stations, one sheet)
- **Engine:** a token (a ball, a marble) moves through N stations; each does one literal thing to it. Order = the path.
- **Stage:** one large drawing; hold on a station most of the time, then a ~1.0s eased pan to the next. A zoom-in at the start, a zoom-out reveal of the whole layout in the last 4–7s.
- **Clock:** even stations of ~7–9s (music only) or speech-paced stations of 2–7s (narrated).
- **Reveal:** the zoom-out shows the layout *means* something (it's a clock face; the stations spiral into a rainbow).
- **Device:** the token visibly accumulates each station's effect, then spends it at the end.
- **Fits:** an agent loop (the prompt is the ball; Read, Grep, Edit, tests are stations).
- **Status:** studied, not yet built with this kit.

### F2. Chronology, morph chain
- **Engine:** chronology with a visible clock — a year tag or counter.
- **Stage:** either one fixed frame (things drawn on and off it) or a new world per era. Eras are joined by **shape morphs** (one shape carries into the next scene: the sun becomes an eye) and draw-offs, not cuts.
- **Clock:** music-led (no strict grid) or voice-led. Scenes ~1.5–4s each. A bridge costs 1.2s by default: under 30s keep to 3 morphs or shorten them (`d: 0.4`).
- **Turn:** a silence on a held image, then a slam, then a dark stretch with the longest quiet.
- **Device:** the last era reveals a survivor or successor, then returns to the first image.
- **Fits:** any history; a session's context window filling over time.
- **Checks (`format: 'F2'`, fixed stage):** 0 hard cuts; the stage still ≥85% of frames; ≥4 morph bridges on the grid; the counter present ≥80%; ≤−40 dB for ≥0.4s before the loudest hit. Morph-chain pieces across many worlds use `format: 'morph-chain'` (cuts + morph grid + story arc).
- **Status: proven** — a fixed-stage history of AI video, and a 60s cut-paper history of AI across 15 worlds (13 morphs, one hard cut on the payoff; `examples/history-of-ai`).

### F3. Call → catalogue
- **Engine:** a call goes out; the answer is a catalogue, one item per beat, gathered into one image; the answer goes back.
- **Stage:** beat-cut held frames; recurring framings that each side lives in, plus one card per catalogue item (each its own flat colour, the label in the lower third).
- **Clock:** 120 BPM; cards 0.5s × ~8, one held 1.0s, then 0.25s × 4, then a ~2s gather.
- **Turn:** a quiet beat while the question lands, then the catalogue.
- **Device:** a reversal at the end (the answer was the asker).
- **Checks:** ≥80% of cuts on the 120 BPM 8th grid; the cards accelerate; a gather shot ≥1.5s after the fastest run.
- **Status:** studied, not yet built with this kit.

### F4. Mission (goal + helper, step by step)
- **Engine:** someone wants something and can't; the helper solves it one problem at a time. A flash-forward open on the goal achieved, then rewind.
- **Stage:** beat-cut, wide ↔ close alternation; a recurring prop that marks time (a wall clock).
- **Clock:** 120 BPM 8ths, or 90 BPM 16ths.
- **Rhythm:** vignettes of 3–4s, one per problem → a rush of 4 × 0.5s → brake into a wait → the deadline in silence → the payoff held ~2s.
- **Device:** the helper shows its plan before doing it (a dashed sketch over the scene, then the same thing done for real).
- **Framing:** close-ups fill the phone-safe area (~1.2× on 9:16).
- **Payoff sound:** a short chord stab on the hit, a flat chord after it, and the rush's hits never stacked on the groove's kick.
- **Checks (`format: 'F4'`):** ≥80% of cuts on the grid; last frame ≈ frame 0; a 4-shot rush one beat apart; ≤−40 dB before the loudest hit, which falls in the payoff act.
- **Status: proven** — a 32s Claude Code deadline story, built from this card alone.

### F5. Fixed-hero journey (the world changes, the hero stays put)
- **Engine:** chronology or a voyage; the hero changes worlds.
- **Stage:** beat-cut; in the fastest section the hero holds its exact screen position while the world cuts around it. Iris and match-position links.
- **Clock:** 120 BPM; the cut rate accelerates on a fixed tempo (beat → 8th → 16th).
- **Fits:** anything with one carried thing (a context jar carried across tasks, a message passed through tools).
- **Checks:** the cut grid, the story arc, the anchor (`TIMELINE.anchor` + `window.anchorAt`).
- **Status: proven** — several short explainers. Fully specified by STORY.md.

### F6. Process loop (result → blank → the true making steps → result)
- **Engine:** the real order of making something, on one locked-off framing. Open on the finished thing, dissolve to blank, rebuild.
- **Rhythm:** fast early stages (~1.3s each), long near-still holds late.
- **Sound:** one crescendo that brightens as detail gets finer; the loudest note on the single reveal.
- **Ending:** pixel-identical to frame 0.
- **Fits:** a feature from blank to merged (the app → blank editor → plan → tests → code → green tests → the app).
- **Checks:** 0 hard cuts; 1 dissolve; last frame = frame 0; stage starts on note attacks.
- **Status:** studied, not yet built with this kit.

### F7. Variation reel (one subject, N techniques)
- **Engine:** none — the same armature redrawn N ways, one per second.
- **Stage:** held stills, hard match-position cuts, exactly 1.00s each; the silhouette never moves.
- **Clock:** a 1.00s clock, an attack on every cut; the arc lives in the music's swell.
- **Fits:** a brand or style reel. Weak for explaining.
- **Checks:** every shot 1.00s; the armature overlaps ≥95% across cuts.
- **Status:** studied, not yet built with this kit.

### F8. Trailer (claims → proof) — provisional
- **Engine:** a handwritten claim card, then footage that proves it; a cold-open hook; a set-piece climax; a win screen; the title twice.
- **Stage:** close crops (median ~1.3s), cards 1.2–2.5s as the quiet beats.
- **Fits:** feature launches ("it can now …" → proof).
- **Status:** one example studied; treat as a sketch.

## Format-specific rules (don't apply them everywhere)

1. **"Cuts land on the beat grid"** holds for beat-cut formats (F3, F4, F5, F7). F1, F2 and F6 have few or no hard cuts; with a voice the clock is the sentence.
2. **"The journey is the fastest section"** — F1 with even stations never accelerates; F6 decelerates; F4's fastest stretch is a 2s rush just before the deadline.
3. **"Travel is one continuous camera move"** — in F1 the whole piece is travel; F2 may have no camera at all.
4. **"A handwritten title at the end"** — a signature, not structure.
5. **"One small hero from first frame to last"** — F2 can use a relay of heroes sharing one identity cue; F6 and F7 have only a fixed subject.

## Measuring a reference

`tools/measure/shotlog.py` misreads three kinds of footage: animation on 2s hides real cuts, dissolves of 6–8 frames read as one hard cut, and windows that straddle a cut look like stepping. For cut counts use a coarse 16×16 colour diff; for grids, test the specific BPM against chance (the fraction of a frame window over the grid period). Pass the real fps.
