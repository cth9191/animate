# Cut paper

![sample](sample.png)

Torn-edge shapes with soft drop shadows, paper grain and crayon in the fills, patterns (stripes, dots, gingham, wood grain), full-bleed colour worlds, characters with simple faces. Inspired by collage-style animation.

**Kit:** `kit/paper.js` — `cut(points, fill, { pat, crayon, grain, shadow, tear })`, `pat.*`, `face()`, `spark()` (the hero), `person()`, `hand()`, `clock()`, `cat()`, `mug()`, `plant()`, `books()`, `tag()`, `yearTag()`, `capStrip()`.

**Rules:** one dominant wall colour per scene; one reserved colour for the hero (orange = the spark); every frame passes `grammar/FRAME.md`; the hand font is a local system font (`HAND` in the head).

**Proven on:** `examples/history-of-ai` (60s, 15 worlds, 13 shape morphs).
