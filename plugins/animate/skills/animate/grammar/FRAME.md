# What goes in a frame

[STORY.md](STORY.md) and [FORMATS.md](FORMATS.md) cover structure: beats, pacing, transitions, sound. This file covers what a single key frame holds, in **any** style. Each style adds its own checklist in its `STYLE.md` (cut paper wants faces and background life; math wants one idea per frame and colour-coded variables; pixel wants every edge on the pixel grid).

It exists because a storyboard drawn as correct-but-plain labelled diagrams came back "pretty boring" — right beats, no life. Comparing it against strong reference frames made the gap obvious.

**Before drawing any storyboard or style frame, open 2–4 reference frames in the target look (the user's references, or the style's `sample.png` and demo), then check every panel against this list and the style's checklist.**

## The universal checklist (every key frame, every style)

1. **One constant the eye can hold.** A hero, a stage, a silhouette or a page that stays while everything else changes. In character styles it's a hero with a face and a mood; in diagram styles it's the object or the axes.
2. **Colour means one thing.** One reserved colour for the thing the story follows (the hero, the variable, the focus), never spent on decoration.
3. **The medium shows.** Whatever the medium is — torn paper, hatching, halftone dots, graphite, pixels — it's visible at phone size in every frame. A frame that could be any style is clip art.
4. **The idea is acted out, not labelled.** "AI winter" is snow on a closed lab; "the cache warms up" is the slow path going dark while the fast one lights. A caption can name it; the picture has to show it.
5. **Something is happening.** A frame is a moment of a change: mid-move, mid-reaction, mid-build. Held frames still have idle life (a blink, a bob, steam, a blinking LED, a cursor).
6. **Text lives in the world or is set like the style's own type.** On a note, a sign, a tag, a screen, a face of an object, or as typeset math. One short caption per beat at most, ≥ 50px at 1080 wide.
7. **Scale varies across the board.** Wides, mid shots and at least one extreme close-up. A board where every panel uses the same framing is a slideshow.
8. **A recurring thread across frames:** a callback prop, a critter, a colour, a shape that comes back changed.
9. **Phone-safe:** on 9:16, what matters sits inside x 60–940, y 250–1500 (the platform UI covers the rest); anything that matters is ≥ ~100px.

## A hero device for long time spans

Give "the idea" a body. Each style has a hero in its kit (cut paper: the spark, which gains a ray per era; crosshatch: an ink dot with eyes; pixel: a sprite with a two-frame idle; isometric: a small cube-bot; math: a π character beside the graph). Reserve its colour for it alone.

## Process

1. Open the references.
2. Make **2–4 full-size style frames** for the look (the cheap check-in).
3. Then the full storyboard in that look.
4. Then the video.

The style frames' drawing code becomes the video's code.
