# Brief: A short history of AI (run 1, the video)

Built through the storyboard check-ins: the 15 storyboard panels (`TIMELINE.board`) are the key frames, and their drawing code is the video's.

## Spec

- **Size and timing:** 1080×1920, 24fps, 120 BPM. **60.0s = 1440 frames = 30 bars.**
- **Look:** cut paper.
  - Torn-edge shapes with soft drop shadows, paper grain, crayon, patterns. Everything boils on 2s through the kit's `wobble`.
  - Rules: `grammar/FRAME.md`.
- **Format: F5 fixed-hero journey** (`grammar/FORMATS.md`): the engine is chronology and the hero changes worlds.
  - Era boundaries are hard cuts on the beat. A few cut-ins (camera zooms on the same scene) vary the scale.
  - The fastest section is the 2020 "library" beat (41–44s): a cut every 0.5s alternating two zooms centred on the spark, so the hero holds its screen spot (anchor check).
- **The hero:** the spark, the machine's mind. It gains a ray every era (5 → 12) and idles with a bob and blinks. Orange is used for the spark only.
- **Overlay:** the year tag (pops in at each era) and one caption (written on). Neither is zoomed by the cut-ins.
- **No narration.**

## Shots (cuts on the 8th grid)

| shot | t (s) | what moves |
|---|---|---|
| study | 0–4 | Turing's hand writes "Can machines think", a dashed "?"; the spark pops out of it at 2.25 |
| dart | 4–8 | the chalk writes "artificial intelligence"; the spark drops onto the tray (5.75); its name tag slaps on (6.5) |
| perc | 8–10.5 | the knobs turn; the photocell eye fills in a triangle |
| perc-yes | 10.5–12 | cut-in: the lamp turns green, "yes!" |
| eliza | 12–16 | typed line, printed reply, typed line, printed reply; the spark rises over the paper (13.25) |
| winter | 16–22 | snow falls, the spark shivers, the candle flickers, the CLOSED sign swings |
| backprop | 22–25 | "try again" … "closer…", the error arrow runs backwards, crumpled tries drop |
| chess | 25–27 | flashes; the hand reaches for the king |
| chess-fall | 27–29 | cut-in: the king falls (27.0) |
| photos | 29–31 | the magnifier scans the wall |
| photos-cat | 31–33 | cut-in: the box snaps around the cat, "cat!" |
| go | 33–37 | move 37 drops (35.0), the ring, the tag |
| attn | 37–41 | 9 strings tie on 8ths-ish, "animal" last and thickest |
| scale | 41–44 | 6 cuts at 0.5s, zooms alternating about the spark; the spark grows; books fly in |
| hush | 44–46 | the cursor blinks; silence; "h", "hi" at 45.5 / 45.75 |
| hi | 46–51 | enter → the bubble storm, phones up, confetti (the loudest hit at 46.0) |
| work | 51–56 | the prompt typed, Read / Edit / Bash pop, "12 passed" ✓ |
| end | 56–60 | Turing's page; the spark writes "good question." |

## Sound

- 120 BPM in D, with the synth helpers from v2.
- Thin and warm at first (pen, chalk taps, knob clicks, a "yes" ding, teletype clatter), then the winter drone (quiet).
- The groove returns at 1986, builds through 2012–2017, and is fullest at 2020.
- **Silence 44.0–45.5s;** two soft key clicks.
- **The loudest hit is the enter key at 46.0:** a stab + sub, then a flat warm chord (the F4/F2 payoff recipe).
- Warm and quieter at 2025; the opening note at the end.
- Loudness stage as in ship-by-five.

## Checks

- **`review.mjs`:**
  - all cuts on the grid
  - the story arc: the gift (46–51) loudest; ≥ peak + 1 dB; silence ≤ peak − 15 dB; the peak has the highest cut rate; the gift held
  - anchor 41–44s (the spark within 40px of (470, 880))
- **The muted sheet:** every shot passes `grammar/FRAME.md` (a character, a full world, visible medium, background life).

## Claims (on screen) and sources (checked 2026-10-03)

- **1950:** Turing, "Computing Machinery and Intelligence", opens with "Can machines think?"
- **1956:** the Dartmouth summer research project; the term "artificial intelligence" is from its 1955 proposal.
- **1958:** Rosenblatt's perceptron (1958 paper). The Mark I (1958–60) had a 20×20 photocell retina and weights in motor-driven potentiometers (Wikipedia, "Mark I Perceptron").
- **1966:** Weizenbaum's ELIZA, *Communications of the ACM*, Jan 1966; the DOCTOR script. The dialogue shown is illustrative, in its style.
- **1974:** the first AI winter, 1974–80 (the Lighthill report 1973; DARPA cuts 1974).
- **1986:** Rumelhart, Hinton, Williams, "Learning representations by back-propagating errors", *Nature* 323 (Oct 1986).
- **1997:** IBM's Deep Blue beats Kasparov (match).
- **2012:** AlexNet wins ImageNet, trained on two GPUs.
- **2016:** AlphaGo beats Lee Sedol 4–1; move 37 in game 2.
- **2017:** "Attention Is All You Need" (the transformer).
- **2020:** GPT-3, 175 billion parameters.
- **Nov 30, 2022:** ChatGPT; millions of users within weeks.
- **2025:** Claude Code (research preview Feb 24, generally available May 22, 2025).
