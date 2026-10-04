# Crosshatch ink

![sample](sample.png)

A sketchy ink line that boils on 2s, crosshatch and pencil shading clipped inside shapes, stipple, paper grain, warm cream paper by day and navy "inside the computer" worlds.

**Kit:** `kit/core.js` — `ink(points, { w, color, amt, key, frac })`, `paint(points, { fill, tex: [{ k: 'hatch' | 'cross' | 'pencil' | 'stipple', ... }] })`, `wobble`, `grain()`, `monoText()` (jittered mono type for code and terminals), `drawPencil()`, `asterisk()`.

**Rules:** shade with a density function (`dens(x, y)`) rather than flat fills; world-anchor textures when the camera pans; dark close-ups on 9:16 need ~1.2× zoom; tool-call pills like `Read(src/app.ts)` make agent steps readable but must be true.

**Proven on:** several Claude Code explainers (a deadline mission, a subagent story).
