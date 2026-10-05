# Intake

Ask only what you can't infer from the request. AskUserQuestion takes up to 4 questions per call: ask 1–4 first, then 5–8 in a second call (skip the ones the request already answers). Recommended option first. If the user said "just make it", use every default and say which you picked.

## The questions

1. **What's it about, and what's the one true thing it should get across?**
   Free text. Also: anything that must be in it, anything to avoid. Read back your understanding in one sentence before going further — a wrong subject is the most expensive mistake ("history of AI" vs "history of AI video").

2. **Where will it go, and how long?** (multi-select for the formats — the first one picked is the main one)
   - 9:16 — Shorts / Reels / TikTok *(recommended for a history or explainer)*
   - 16:9 — YouTube / b-roll / a talk
   - 1:1 — a feed post
   - 4:5 — an Instagram / LinkedIn feed post

   Length: 20–30s for a quick social piece, 45–60s for a history or explainer. **Several formats** come from one piece: list them in `piece.json` `"formats"` and lay the scenes out with `LX` / `LY` / `UNIT` (SKILL.md → Formats). Each extra format costs a little layout work, not a new piece.

3. **Voice?**
   - Music only; the year/caption tags carry it *(recommended for a short social piece)*
   - A narrated voice-over: you write the script, the voice comes from the ElevenLabs connector (if they have it connected) or their own recording, and the picture is timed to the words (SKILL.md → Voice-over) *(recommended for an explainer over ~30s)*
   - On-screen handwritten narration

4. **The look?** *(skip the gallery when the request already names a style or brings references — go to new-style.md or the named style)* Build the gallery (`node tools/gallery.mjs <out.png> [<project>/styles]`), show it, then ask:
   - One of these: cut paper / crosshatch ink / riso print / sketchbook / math / pixel / isometric *(recommend the one that fits the subject: cut paper for histories and stories, crosshatch for Claude Code explainers, math for anything with equations or graphs, pixel for computing history, isometric for products, devices and infrastructure, riso or sketchbook for a softer editorial feel)*
   - A style they've made before (any `styles/<name>/` in their project)
   - My own references (the gallery's last tile, "custom") — links or files (videos, stills, a web page): follow [new-style.md](new-style.md); keep the media local and uncommitted
   - Surprise me

5. **A hero?** *(ask only if the format wants one)*
   - The style's hero (cut paper: the spark, a small orange character that grows with the story; crosshatch: an ink dot with eyes; …) *(recommended)*. **For a new style from references,** propose a hero native to the medium (a red seal for woodblock prints, a cursor for terminals, a pawn for a board game) as the recommended option.
   - An existing character (describe it)
   - No hero — the subject itself is the constant

6. **Music: do you have your own track?**
   - No — compose the score in code, cut to a 120 BPM grid *(recommended unless they have one)*
   - Yes — a file (WAV / MP3 / M4A) they own or licensed. Ask for its path, the part to use (start time) and the BPM if they know it. Then SKILL.md → Music: `tools/beats.mjs` maps its beats, the cuts follow the song, and export uses the track (the score adds sound effects only). Never fetch music from a site the user didn't point to.

7. **Is it about a product, app or site — should the video show the real thing?** *(ask only when the subject is a product)*
   - Yes — real screenshots and the logo: ask for the URL (`tools/capture.mjs` screenshots it) and any logo / brand files. SKILL.md → Assets. *(recommended for a product reel)*
   - No — draw everything in the style (product screens drawn from imagination must not pretend to be the real UI)

8. **Brand rules?** *(ask only with 7 = yes)* Colours, fonts, the one accent colour, words to avoid. Defaults: sample them from the screenshots.

## Defaults when unanswered
9:16, 1080×1920, 24fps, 120 BPM (an 8th = 6 frames exactly), 30–60s, music only (composed in code), no assets, the style that fits the subject (cut paper if unsure), the style's own hero, format chosen from FORMATS.md by the plot engine.

## Pick the format yourself
Don't ask the user to choose a story format — it's grammar, not taste. A history or a process over time → chronology joined by shape morphs (F2). Someone wants something and a helper solves it → mission, cut on the beat (F4). One carried thing through many places → fixed-hero journey (F5). A question answered by a list → catalogue (F3). State the choice at the story check so they can veto it. When two formats fit (a process can be a chronology or a machine), prefer the **proven** one (see FORMATS.md status lines) and say so.
