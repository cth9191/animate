# vhs — analog horror on a worn tape

A lit, shaded scene (as realistic as code drawing gets: key light with flicker, soft shading, felt, wool, metal, glass eyes, light cones, dust) played back through a worn VHS deck: tape-resolution luma, smeared and offset chroma, lifted blacks, halation, line jitter, a rolling tracking band, head-switching noise, dropouts, snow, scanlines, vignette and the deck's OSD (PLAY ▶, SP, date, clock).

Proven on: `pieces/animatronic-test` (10s, an original animatronic lamb waking on a party stage).

## Motion
- On 1s (`ones: true`). Machines move with `servo(keys, v0)`: stepped moves that snap with an underdamped spring (stop, start, stop), never smooth easing.
- `twitch(t0, t1, amp, key)` for per-frame jitter; `flicker(steps)` for a light that clunks on and buzzes.
- The camera is a camcorder: slow drift, a little shake, a slow zoom; the scare is a hard cut.

## Driving the tape (optional hooks in the piece)
- `pieceGlitch(t)` 0..1: how badly the tape tracks (0.06 is a worn baseline; ramp to 1 before a signal loss).
- `pieceSignal(t)`: `null | 'black' | 'static' | 'blue'` replaces the picture.
- `pieceOSD(t)`: `{ tl, tr, bl, br }` strings; `pieceGrade(t)`: `{ tint, amt }` an extra colour cast.

## Lighting
- One key light per scene: set `vhLight = { wx, wy, k, c }`, call `vhWorld()` at the top of the scene and `vhLocal()` after every transform, so shading follows the light inside rotated or scaled parts.
- `k` is the light level (0..1): every helper darkens with it; draw a final `(1 - k)` dim over the scene for consistent exposure.

## Kit
`vhShade(P, base, { hi, lo, ao, rim, spec, tex, edge })`, `vhFelt`, `vhGrime`, `vhWool`, `vhMetal`, `vhScrew`, `vhEye(x, y, r, { look, lid, bar, dilate })`, `vhCone`, `vhPool`, `vhDust`, `vhShadow`, `servo`, `twitch`, `flicker`, `vhMix` / `vhMixH` / `vhA`.

## Frame checklist
1. One light source you can point to; the subject's lit side faces it; contact shadows under feet.
2. The thing that's wrong is readable in silhouette at phone size (a torn ear, a stuck lid, steel teeth).
3. Darkness is lifted grey-green, never pure black (except a deliberate signal loss).
4. The OSD stays inside the 9:16 safe area (x 60–940, y 250–1500).
5. Silence before the slam, loudest on it.

## Limits
Realistic, not photoreal: a human face up close will read as a puppet or a mask. Characters that are puppets, masks, mascots, silhouettes and machines play to the medium.
