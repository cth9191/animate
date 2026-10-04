# Making a new style from references

Use this when the user names or shows a look that no style in [styles/](styles/README.md) covers. The output is a reusable style folder, made the same way the shipped ones were. Budget: a measure pass, the piece's 2–4 style frames matched against the references, **one** check-in (SKILL.md step 2), then save after the piece.

**Reference media stays local.** Screenshots, downloaded videos and frame sheets go in a gitignored folder (e.g. `references/<look>/` in the user's project — add it to `.gitignore` first). That includes anything derived from them — trimmed copies, zoom crops, compare sheets: **anything with reference pixels in it goes in `references/<look>/`**. (`review.mjs` writes its reference side-by-sides to `references/_review/<piece>/` for the same reason.) Never commit them, never copy their code, and don't name the artist in what you publish unless the user asks you to credit them. A licence that allows reuse (MIT etc.) still means: credit it if you reuse code; studying the look needs no copying at all.

**Paths.** The tools live in this skill; the style, its demo and the references live in the user's project. Run the commands below with `SKILL=<this skill's base directory>` and `P=<the user's project>` as absolute paths (on Windows use the project's own scratch folder, not `/tmp`):
`node $SKILL/tools/compare.mjs $P/references/<look>/a.png $P/styles/<name>/demo 1.5 $P/references/<look>/cmp-1.png`.

## 1. Gather

- **Video:** ask for a file or a link the user can download themselves. Extract stills: `ffmpeg -i ref.mp4 -vf fps=2,scale=540:-1 references/<look>/f%03d.png`, and a contact sheet: `ffmpeg -i ref.mp4 -vf "fps=1,scale=270:-1,tile=6x4" -frames:v 1 references/<look>/sheet.png`.
- **A web page or an SVG/canvas demo:** open it in the browser and screenshot the drawings large — at a portrait (9:16) viewport if you can, so a crop has the same shape as our frame. If the drawing is SVG, read its computed styles (stroke colours and widths, fills, the viewBox): **those numbers beat any screenshot**, because thin lines get downsampled lighter in screenshots.
- **Stills:** use them as they are. Ask for 3–6 that show the range (a wide, a close-up, text, a character).

## 2. Measure (write the numbers into the new STYLE.md)

| what | how |
|---|---|
| **Palette** | `node $SKILL/tools/measure/refs.mjs $P/references/<look>/` — no piece needed: it trims screenshot borders (writes `<name>.trim.png`), prints each picture's size and aspect, its most common colours, `--points x,y;x,y` samples flat areas exactly, and `--accent` lists bright, saturated colours by hue family with a core and a halo value (neon, inks on black: the plain palette there is all ground). Exact values from the source (computed SVG styles, CSS) beat it when there is one; thin lines read lighter in screenshots. Note what each colour *means* (ground, line, accent, the hero). |
| **Line** | weight relative to the **drawing's** size, then scaled to the size the drawing will have in our frame: a 0.9px line on a 400px-wide figure, drawn 800px wide at 1080, is ~1.8px. Constant or tapered; does it boil (wobble on 2s) or stay rigid; caps and joins. |
| **Fill and texture** | flat, gradient, halftone, hatch, grain, paper; shadows (none, drop, cast, hatched). |
| **Geometry** | perspective (flat, isometric 2:1, true 3D), corner rounding, how text is set (font class, size as % of height). |
| **Motion** | on 1s or 2s (step through 12 consecutive frames: do lines jitter in pairs?); easing (springs, ease-in-out, linear); what moves when nothing happens (idle). |
| **Cuts** | `python tools/measure/shotlog.py ref.mp4` (it reads the real fps; `--fps N` overrides) for cut times; then hard cuts, morphs or one continuous move; a beat grid? (see grammar/FORMATS.md → Measuring a reference). |
| **Camera** | still, slow push, pans between stations, zoom bumps. |
| **Composition** | how much of the frame is empty; one subject or a full-bleed world; where text sits. |

## 3. Match 1–2 frames

1. Make `styles/<name>/` in the user's project:
   - `kit.js`: start from the closest shipped style's kit, or from [templates/style/kit.js](templates/style/kit.js) (a blank kit: a shape, text, a hero, captions and the full `STYLE` block) when none is close. build.mjs refuses a kit without `const STYLE`; refine the hooks in step 5. Keep `kit/core.js` underneath and don't redeclare its names (see styles/README.md → Names a kit must not reuse).
   - The frames you match are **the piece's own style frames** (SKILL.md step 2): start the piece from `styles/crosshatch/demo/` (`piece.json` + `src/`), set `"style": "<name>"`, and draw its 2–4 most different beats. No separate demo is needed before the check-in.
2. The frames re-create the *kind* of image in the references — the same medium, proportions and palette — with your own subject, not a copy of theirs.
3. Compare side by side with `compare.mjs` (`--auto-trim` drops screenshot borders, `--crop x,y,w,h` picks the region of the reference — crop at 9:16 around one figure — and `--crop-ours x,y,w,h` the matching region of our frame, so both palettes describe the same kind of area). Check, in this order: proportions on the 10% grid (subject size, margins, line weight relative to the subject), the palette numbers, the texture, the type. A landscape reference won't match 9:16 composition exactly — compare the drawing, and decide the composition from the format. Fix and repeat until the differences are deliberate. Write what still differs in STYLE.md ("not matched").

## 4. The check-in

This is the piece's look check (SKILL.md step 2) — one check-in, not two. Show the compare sheets and the piece's frames together. Ask with options: **thumbs up / closer to the reference (say where) / push it further from the reference.** Don't save the style before a thumbs up.

## 5. Save it (after the piece is approved and built)

1. Finish `kit.js` with the `STYLE` hooks (backdrop, window, blob, hero, captions, post, `ones`) — see [styles/README.md](styles/README.md) for the contract and the renderer's quirks (hex colours, `rgb()` mid-morph, the camera transform).
2. The demo: the finished piece is the style's first proof. If the user wants the style shared or reused, add a 4–8s `demo/` (two eras, one shape morph, a hero, a caption, background life; bridge shapes of similar proportions — a dot into a long thin bar pinches into a bowtie). `node $SKILL/tools/build.mjs $P/styles/<name>/demo`, then `node $SKILL/tools/tile.mjs $P/styles/<name>/demo tile.png ...` must print `deterministic: true`.
3. `node $SKILL/tools/still.mjs <the piece or the demo> <t> $P/styles/<name>/sample.png --scale 0.5`.
4. `STYLE.md`: what the look is, the measured numbers, motion habits, **a frame checklist specific to this look** (on top of the universal [grammar/FRAME.md](grammar/FRAME.md)), the kit API, do/don't, not matched, proven on.
5. Pieces use it with `"style": "<name>"`; `build.mjs` finds `styles/<name>/` beside or above the piece. Variants (a dark ground, a second palette) are a small extra part listed in the piece's `piece.json` `"build"` before the style, e.g. `src/options.js` with `const ISO_DARK = true;`, which the kit reads with `typeof ISO_DARK !== 'undefined'`. If the user wants the style in the skill for everyone, copy it into the skill's `styles/` (with its sample, without any reference media).
