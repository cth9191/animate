# Riso

![sample](sample.png)

A three-ink risograph print on cream paper: halftone screens at their own angles, overprints instead of mixed colours, plates a few pixels off register, ink dropouts that sparkle in the darks. Flat, bright, a little worn, on 2s.

**The one rule: nothing is painted, everything is printed.** A frame is a sheet of paper run through three spot-ink plates. A plate only says how much ink goes where (a grey tone 0..1). The screen turns that tone into dots at the plate's angle, and the inks multiply. There is no black ink and no white ink.

The parameters below were measured from a reference print animation (1080 wide, 24fps, 120 BPM) and then rebuilt in code; the demo here is an original subject.

## Palette

| what | value | notes |
|---|---|---|
| paper | **(241.5, 235.5, 226.5)** `#f2ece3`, std ~1.2 | almost flat; faint curly fibres and specks only. Mottle over ~1 level reads as dirt on a phone |
| teal ink | (54, 137, 171) | the key plate (registered) |
| fluorescent pink ink | (220, 68, 160) | |
| yellow ink | (238, 222, 30) | |
| coral / red-orange | pink + yellow | `MIX.coral`; `MIX.orange` = pink 0.55 + yellow 1 |
| green | teal + yellow | `MIX.green` |
| ink-blue / violet | teal + pink | `MIX.blue`, the hero's colour |
| olive-black | all three | `MIX.dark`. Never (0, 0, 0) |
| white | paper | a knockout: a fill with no tones, `fill(path, {})` |

Overprint model: `paper × Π(1 − coverage × (1 − ink / paper))`, per channel. `inkRGB(tones)` gives the printed colour of any tones; `tonesOf(color)` goes the other way (nearest tones on the 20-level grid), so the renderer's hex colours (`ERA_BG`, bridge colours) still print in the three inks.

## Screens and plates

- **Angles:** teal 15°, pink 75°, yellow 45°. Overlaps moire like real print.
- **Tone** is quantized to 20 levels. Up to 50%: a round dot of radius `cell·√(tone/π)`. Above 50%: the solid with paper holes of the same law on the cell corners. Tone 1 prints solid (no dots), which is how type and lines stay crisp.
- **Pitch belongs to the illustration and scales with it** (`PITCH`): `fine` 7px (tags, small vignettes, a hero printed alone), `world` 10.8px (a full-frame world), `field` 17.5px (a coarse far field: sky, a wall). One layer = one pitch; a coarse region is its own layer.
- **A layer** = three grey plate canvases + a mask, printed into the sheet by one per-pixel pass. Layers print in order; each knocks back to paper inside its mask.
- **Fills knock out** (every plate set inside the shape, unlisted plates → paper). **Lines overprint** (`lighten` on the listed plates) unless `knock: true`.
- **Misregistration:** pink (+4, −3), yellow (−3, +4) against the teal key, ±0.3px jitter per boil variant `B % 3`. Darks get coral and yellow fringes; the ink-blue hero gets pink and teal ones.
- **Wear:** ~0.6% of pixels per variant drop one plate (1–2px specks); `specks()` knocks a few dozen tiny single-ink dots into a large dark.
- **Gradients** are grey gradients on a plate (`lin`, `rad`); the screen turns them into dot-size ramps. A glow is `fill(circ, { yellow: rad(...) }, { over: true })`: the plate rises without a hard edge.

## The line

resample → `wobble` on the boil → a tapered ribbon with pressure (`w·(1 + rough·noise)`, noise keyed `B % 3`) → filled through the plates. `rough` ~0.15 is a brush line; 0.45–0.55 is the dry-brush rim every printed circle gets (`rim`, `rimLine`: a rough ribbon plus a thinner second pass that doesn't agree with the first). Paper lines (ripples, highlights, grout, the glint on a fruit) are `line(P, {}, { knock: true })`.

## Motion habits

- On 2s: `TT` steps every 2 frames, wobble reseeds with `B`; misregistration, dropouts and line pressure cycle through 3 variants (`B % 3`), so the print shimmers without crawling.
- Cuts, worlds opening and event cues on the 8th grid (120 BPM at 24fps: 6 frames); fast onsets on 16ths (3 frames).
- Worlds open as **circles with a rough teal rim** (the renderer's `window` hook does this for morphs). In a hand-cut piece: a vignette circle grows over 4 frames (r 172, 252, 293, 308 → 310 at 1080 wide), shrinks over 3 (291, 244, 153); an iris cut shows the new world in a circle r 410, then 650, then full frame.
- The screen never swims under the picture: the camera transform is composed into every layer, so dots pan and zoom with the illustration like a filmed print.

## Frame checklist

Check every key frame (and the sample) against these, on top of `grammar/FRAME.md`:

1. **Every colour is plate tones.** No RGB in a scene: `{ teal, pink, yellow }` or a `MIX` name. The renderer's hex colours come from `inkRGB(...)`.
2. **Darks are three-ink overprints** (olive-black), with dropouts and a few specks in them. No pure black pixels anywhere.
3. **White is paper.** Highlights, eyes, type on dark, grout, the glint on fruit: knockouts, never a white ink.
4. **One screen pitch per layer**, scaled with the illustration: the far field coarse (17.5), the world at ~10.8, small printed things (tags) fine (7). Dots visibly change size across a gradient.
5. **Fringes visible:** zoom on any dark or ink-blue edge; pink and yellow should peek out on opposite sides.
6. **Fills knock, lines overprint:** a teal line over yellow reads green; a pink detail on a dark ground must be knocked (`knock: true`) or it turns ink-blue.
7. **The paper is flat:** no vignette, no mottle over ~1 level, no grain filter on top.
8. **Type is printed:** solid tone 1, misregistered with the rest; captions go through `DEFER` (`risoTag`, `risoCaption`) so they print at screen size after the camera.
9. **Full-bleed:** a field layer covers the whole frame (`full: true`) before the world layer prints over it.
10. **Content in the safe area** (x 60–940, y 250–1500 at 1080x1920); fields and backgrounds run to the edges.

## Kit API (`styles/riso/kit.js`, on top of `kit/core.js`)

- **Sheet:** `beginSheet()` (fresh paper) or `beginSheet(box)` (print over what `ctx` already shows in `box`), then layers, then `endSheet()`. A scene in a morph chain draws one sheet; the renderer swaps `ctx` to its offscreen layer, so the kit always prints into the current `ctx`.
- **Layers:** `beginLayer(pitch, { T: { s, x, y, rot }, box, full, auto, shapes })` … `printLayer()`, or `printed(pitch, o, fn)`. `full` masks the whole box (a field); `shapes` adds every fill/line/type to the mask (a world printed over a field); `auto` masks wherever any plate has ink (line-only layers).
- **Marks:** `fill(path, tones, { over, mask, rule })`, `line(P, tones, { w, taper, rough, amt, knock, closed, frac, key })`, `type(str, x, y, size, tones, { knock, align, frac, weight, key })`, `rim(cx, cy, r, key, o)`, `rimLine(P, key, o)`, `specks(x0, y0, x1, y1, n, key)`, `clipTo(path)` / `unclip()`.
- **Paths and tones:** `circ`, `ell`, `poly`, `curvy` (smoothed closed), `rect`, `rrect`, `hand(P, key, amt)` (wobbled on the boil), `boxPts`, `ringPts`; `lin`, `rad` grey gradients; `MIX`; `inkRGB`, `tonesOf`, `rgbHex`.
- **Hero:** `risoHero(x, y, r, { key, mood: 'smile' | 'happy' | 'wow', arms: [l, r], look: [dx, dy], hop, hold: fn(hx, hy), shadow })` prints an ink-blue bean with paper eyes, pink cheeks and a green sprout inside the current layer; sets `SPARK_AT`. `heroOutline(x, y, r)` for bridges.
- **Captions:** `risoTag(str)` (a yellow slip on a screened pink block, top left, pops in) and `risoCaption(str)` (a paper card with a teal rim, bottom, written on); `printTag` / `printCard` for custom placement.
- **STYLE hooks:** `backdrop` prints a flat plate tone (`tonesOf(c)`), `window` draws the era through the outline with a rough teal printed rim, `blob` prints the morphing shape as a screened fill with a dry-brush rim a step darker, `hero` prints the hero alone at the fine pitch. No `post`: the sheet already is the paper.
- **Cost:** about 70–100 ms per full-frame layer at 1080x1920 (the per-pixel print pass); a world is two layers plus small sheets for captions, ~160–250 ms a frame.

## Do / don't

**Do**
- Decide every colour as plate tones, then check the overprints: two inks make a third colour for free.
- Knock fills, overprint lines; keep white as paper.
- Keep darks as three-ink overprints and let them sparkle.
- Give each world a coarse field layer and one world layer; print tags and lone props at the fine pitch.
- Key boil variation on `B % 3` (registration, pressure, dropouts) and wobble on `B`.
- Use `over: true` grey gradients for glows and light; let the dots do the shading.

**Don't**
- Don't add a black ink, pure black pixels, or a white ink.
- Don't draw smooth RGB gradients, drop shadows, blurs or `ctx.filter` on top of a print.
- Don't move the screen independently of the picture (no screen-space dots over a panning world).
- Don't reuse the crosshatch kit's `ink()` / `paint()` here: this medium has no pen.
- Don't put many full-frame layers in one frame: each one costs a per-pixel pass. Give small things a `box`.

**Proven on:** a 6s frame-matched study of a reference print animation (1080x1080, every number above measured on both), and this demo: a 6s 9:16 morph chain (a rooftop at dawn; the sun becomes an orange in a market crate).
