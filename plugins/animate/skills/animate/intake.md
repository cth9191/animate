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

4. **References?**
   - Use a studied style: cut paper / crosshatch ink *(show `styles/*/sample.png`)*
   - I'll give you links or files (videos or stills) — then run `tools/measure/shotlog.py` on any video, make frame sheets with ffmpeg, and keep reference media local and uncommitted
   - Surprise me

5. **A hero?** *(ask only if the format wants one)*
   - The spark (a small orange character that grows with the story) *(recommended for histories)*
   - An existing character (describe it)
   - No hero — the subject itself is the constant

## Defaults when unanswered
9:16, 1080×1920, 24fps, 120 BPM (an 8th = 6 frames exactly), 30–60s, music only, cut-paper look, the spark as hero, format chosen from FORMATS.md by the plot engine.

## Pick the format yourself
Don't ask the user to choose a format — it's grammar, not taste. A history or a process over time → chronology joined by shape morphs (F2). Someone wants something and a helper solves it → mission, cut on the beat (F4). One carried thing through many places → fixed-hero journey (F5). A question answered by a list → catalogue (F3). State the choice at the story check so they can veto it.
