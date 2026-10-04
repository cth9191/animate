# Intake

Ask only what you can't infer from the request. Batch them into one AskUserQuestion call (up to 4 questions), recommended option first. If the user said "just make it", use every default and say which you picked.

## The questions

1. **What's it about, and what's the one true thing it should get across?**
   Free text. Also: anything that must be in it, anything to avoid. Read back your understanding in one sentence before going further — a wrong subject is the most expensive mistake ("history of AI" vs "history of AI video").

2. **Where will it go, and how long?**
   - 9:16, 45–60s — Shorts / Reels / TikTok *(recommended for a history or explainer)*
   - 9:16, 20–30s — a quick social piece
   - 16:9, 30–60s — YouTube / b-roll / a talk
   - 1:1, 15–30s — a feed post

3. **Voice?**
   - Music only; the year/caption tags carry it *(recommended)*
   - Write a voice-over script and time the picture to it (they record or generate the voice)
   - On-screen handwritten narration

4. **The look?** *(skip the gallery when the request already names a style or brings references — go to new-style.md or the named style)* Show the gallery first (`docs/styles.png`, or `node tools/gallery.mjs <out.png> [<project>/styles]`), then ask:
   - One of these: cut paper / crosshatch ink / riso print / sketchbook / math / pixel / isometric *(recommend the one that fits the subject: cut paper for histories and stories, crosshatch for Claude Code explainers, math for anything with equations or graphs, pixel for computing history, isometric for products, devices and infrastructure, riso or sketchbook for a softer editorial feel)*
   - A style they've made before (any `styles/<name>/` in their project)
   - My own references — links or files (videos, stills, a web page): follow [new-style.md](new-style.md); keep the media local and uncommitted
   - Surprise me

5. **A hero?** *(ask only if the format wants one)*
   - The style's hero (cut paper: the spark, a small orange character that grows with the story; crosshatch: an ink dot with eyes; …) *(recommended)*. **For a new style from references,** propose a hero native to the medium (a red seal for woodblock prints, a cursor for terminals, a pawn for a board game) as the recommended option.
   - An existing character (describe it)
   - No hero — the subject itself is the constant

## Defaults when unanswered
9:16, 1080×1920, 24fps, 120 BPM (an 8th = 6 frames exactly), 30–60s, music only, the style that fits the subject (cut paper if unsure), the style's own hero, format chosen from FORMATS.md by the plot engine.

## Pick the format yourself
Don't ask the user to choose a format — it's grammar, not taste. A history or a process over time → chronology joined by shape morphs (F2). Someone wants something and a helper solves it → mission, cut on the beat (F4). One carried thing through many places → fixed-hero journey (F5). A question answered by a list → catalogue (F3). State the choice at the story check so they can veto it. When two formats fit (a process can be a chronology or a machine), prefer the **proven** one (see FORMATS.md status lines) and say so.
