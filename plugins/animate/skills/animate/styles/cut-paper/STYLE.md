# Cut paper

![sample](sample.png)

Torn-edge paper shapes with soft drop shadows, paper grain and crayon in the fills, patterns (stripes, dots, gingham, wood grain), full-bleed colour worlds, and characters with simple faces. Collage-style animation: playful, warm, busy with small life.

## Palette

`PAL` in `kit.js`. Warm and saturated, on cream: ink `#2a1d18`, paper `#fbf6ea`, cream `#f3ead6`, navy `#26315f`, wood `#c08048`, mustard `#d9a441`, yellow `#f6cf55`, teal `#3f9f9a`, mint `#a9d9c6`, pink `#f3a3bf`, sky `#cfe2ee`, purple `#8c7ad8`, blue `#4c6fb5`, green `#5aa05a`, skin tones, charcoal. **Orange `#ec7a4f` is reserved for the spark** (the hero) — never decoration.

## The medium

- `cut(points, fill, { pat, crayon, grain, shadow, tear, sy, sb })`: every shape is torn paper — a wobbly torn edge (`tear`), a soft shadow (`sy` offset, `sb` blur), grain and an optional crayon scribble in the fill.
- Patterns: `pat.stripes`, `pat.dots`, `pat.gingham`, `pat.grainWood`, … clipped inside the shape.
- One dominant wall colour per scene, a floor or table, then props in front.
- The morph window is a torn hole with a paper rim (`STYLE.window`); morphs happen on blank cream paper `#efe5cf`.

## Motion habits

- On 2s: everything (boil, camera, moves) keys on `B = floor(F / 2)`.
- Pops (`popS`) for things arriving, write-ons (`handText(..., { frac })`) for words.
- The spark idles on its own: bob, blink, ray sway.
- Chronologies join worlds with shape morphs (the sun becomes an eye); character pieces cut hard on the beat.

## Frame checklist (on top of grammar/FRAME.md)

1. **A character with a face, acting** — the spark, a person, an animal, a mug with eyes. Things happen to it and it reacts (wow, sad, delighted, focused).
2. **A full-bleed world:** wallpaper, sky, a table, gingham, a starry night or a flat colour card for the beat's mood. Never an object floating on blank paper, unless blank is the stage.
3. **Paper you can feel:** torn edges, shadows, crayon, at least one pattern per frame.
4. **3+ details of background life** that don't carry the plot: a sleeping cat, birds on a wire, a moth at the lamp, steam from a mug, confetti, a clock, sticky notes, bunting.
5. **Hand-lettered text on paper tags** (`yearTag`, `capStrip`, `tag`), never bare type.
6. **The spark's ray count tells time** in a chronology (one more per era).

## Kit API

`styles/cut-paper/kit.js`: `cut`, `rect`, `pat.*`, `torn`, `grainIn`, `face(x, y, s, mood)`, `spark(x, y, r, { rays, mood, key, s })`, `person`, `hand`, `clock`, `cat`, `mug`, `plant`, `books`, `sparkle`, `tag`, `yearTag`, `capStrip`, `handText`, `handW`, `dot`, `capsulePts`, `rot`, `PAL`. Needs `HAND` (font stack) and `CX` (caption centre x) from the piece head.

## Do / don't

- **Do** give every scene its own wall colour so it reads on a contact sheet; make the bridge object big and in frame at the morph.
- **Don't** fade props with `globalAlpha` (the textures reset it); skip them instead. Don't blend two wall colours in a morph (mud): morph on blank paper.

## Proven on

`examples/history-of-ai` (60s, 15 worlds, 13 shape morphs, one hard cut on the payoff) and `demo/` (8s, the moon becomes the sun).
