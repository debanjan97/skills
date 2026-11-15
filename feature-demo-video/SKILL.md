---
name: "feature-demo-video"
description: "Use when the user wants to make a polished demo/showcase video of a feature they built (web UI or CLI): storyboard → scripted recording → Remotion edit → render for Slack."
---

# Feature demo video: storyboard → record → edit → ship

Turn a feature in the current repo into a 60–90s, Screen Studio–style demo video for a team. The video is code: the recording is a script and the edit is a Remotion project, so every step can be rerun.

Everything lives under `demo/` in the repo:
```
demo/
  storyboard.md
  record/        # Playwright script or VHS tape
  raw/           # take-*.mp4, events.json
  video/         # Remotion project
```

Work in four phases. **Stop for user review at the end of phases 1, 2 and 3.** Never start recording before the storyboard is approved, and never start editing before a clean take exists.

---

## Phase 0: Gather inputs
Ask only for what you can't find in the repo (max one round of questions):
- Feature name, where the code lives (paths / PR / branch)
- Audience and the one takeaway they should leave with
- Surface: web UI, CLI/TUI, or both. How to run it locally (URL / command)
- Auth and seed data: how to reach a clean, realistic demo state
- The user's notes: the "wow" moment, must-show items, things to avoid or blur
- Brand: product name, logo path, colors, font, tone (fallbacks: a tasteful dark gradient, Inter)
- Audio: music file? voiceover (none / ElevenLabs via env key)?

## Phase 1: Storyboard → `demo/storyboard.md`
1. Read the feature code and the user's notes.
2. Write a table with one row per beat:
   `| # | Duration | On-screen action (exact clicks/inputs/commands) | Caption (≤8 words) | Zoom target / callout |`
3. Structure: Hook ≤5s (the problem or the end result first) → 3–4 beats, one capability each, strongest last → Outro ≤5s (summary + where to try it).
4. Every action must be concrete and repeatable (stable selectors, exact inputs, test data).
5. List the required seed data / env state. No "test123" and no accidental empty states.
6. Flag slow steps (API waits, loading) so they can be sped up in the edit.

**Checkpoint:** show the storyboard and wait for approval.

## Phase 2: Scripted recording → `demo/record/`, output to `demo/raw/`

### Web UI: Playwright (TypeScript)
- Context: viewport 1920×1080, `recordVideo: { dir: 'demo/raw', size: { width: 1920, height: 1080 } }`, `slowMo: 50`.
- Do setup (reset data, log in) in a **separate non-recording context**, then pass `storageState` in, so the video opens on a clean, logged-in screen.
- **Fake cursor:** Playwright recordings show no mouse. Inject a DOM overlay cursor via `addInitScript` that follows mousemove and pulses on mousedown.
- Human-like motion: `page.mouse.move(x, y, { steps: 25 })` to the element center before each click. `keyboard.type(text, { delay: 60 })`. Hold ~1.5s after each beat.
- **Event log** `demo/raw/events.json`: capture `t0 = Date.now()` as soon as the recorded page exists. For each action, log `{ t, beat, type: 'beat_start'|'beat_end'|'move'|'click'|'type'|'wait', label, box }`, with the box from `locator.boundingBox()`. Log slow waits as `wait` ranges. Include a top-level `offsetMs: 0` for sync nudging.
- Wait on real conditions, not fixed sleeps. Fail loudly on a broken step.
- Always `context.close()` so the video is flushed. Rename the output to `take-<timestamp>.webm` and convert with `ffmpeg -c:v libx264 -crf 18 -preset veryfast`.
- Add `npm run demo:record` (reset → record → convert).

### CLI/TUI: charmbracelet VHS
- `demo/record/demo.tape`: 1920×1080, FontSize ~22, clean theme, TypingSpeed ~50ms, `Hide`/`Show` around setup, `Sleep` after each beat.
- Output `demo/raw/cli.mp4`, plus `cli-events.json` with beat start times derived from the tape.

### Unscriptable flows
The user records with OBS / Screen Studio. Ask for the file and the approximate beat timestamps, and write `events.json` by hand from those.

### Self-check the take
Extract a frame at each `beat_start` with ffmpeg and look at them. Check for empty states, cut-off elements, a misplaced cursor, and leaked secrets or emails.

**Known issue:** Playwright's recorder uses a low bitrate, so small text can look soft. If it does, switch to ffmpeg screen capture of the headed browser window and keep the same event-logging code.

**Checkpoint:** report the take and anything suspicious. Wait for approval.

## Phase 3: Edit in Remotion → `demo/video/`
Setup:
```bash
cd demo && npx create-video@latest video   # Blank template, Tailwind, install skills
cd video && npx skills add remotion-dev/skills   # if not already installed
cp ../raw/take-*.mp4 public/raw.mp4 && cp ../raw/events.json public/
```
Load and follow the Remotion best-practices skill. Check remotion.dev/docs/ai/claude-code if the install command has changed.

Composition: 1920×1080 @ 60fps. Compute the duration from events.json with `calculateMetadata`. Do all ms→frame conversion in one helper, and apply `offsetMs`.

Components (all tunables as props in `Root.tsx`):
1. **Frame**: subtle animated gradient background. The recording is inset ~8%, with radius ~16px, a soft shadow, and an optional fake title bar.
2. **AutoZoom** (the most important effect): for each click/type event, zoom toward the box center (scale 1.6–2.0, box fully in frame). Start ~400ms before the action and hold during it. Spring-pan between nearby events with no overshoot. Return to 1.0 at beat boundaries and during long idle stretches. Map boxes from raw-video space through the inset and scale.
3. **SpeedRamp**: play `wait` ranges at 4–8× by splitting into `OffthreadVideo` segments (startFrom/endAt + playbackRate), and shift all later events by the time saved. Never speed up typing or reading moments.
4. **TitleCard** (~3s): product + feature + one-line hook, then a smooth transition in.
5. **Caption**: one per beat from the storyboard. Lower-third pill that fades/slides in at `beat_start` and out at `beat_end`. Must be readable over a Zoom screen share.
6. **Callout**: animated arrow or highlight ring at the mapped, zoom-aware box for beats that have a callout target.
7. **Outro** (~4s): summary + CTA.
8. **Audio** (toggle via props): music at ~0.15 volume with fades. Optional TTS voiceover from the captions. Lower the music under speech.
9. Blur any regions the user flagged (emails, keys).

Self-review: `npx remotion still` at every beat_start, mid-zoom, the title and the outro. Look at each one and fix anything cropped, misaligned or unreadable before handing over.

**Checkpoint:** tell the user to run `npm run dev` and scrub through. Iterate on their feedback by changing **props first** (zoom scale, timing, ramp speed). If the zooms are consistently early or late, change `offsetMs` rather than the logic.

## Phase 4: Render & ship
```bash
npx remotion render Demo out/demo.mp4 --codec h264 --crf 20
ffmpeg -i out/demo.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset veryfast -c:a aac -b:a 96k out/demo-slack.mp4
```
Optional: a short GIF of the hero beat for inline Slack previews. Report the final file paths and sizes.

## Principles
- The storyboard matters most for quality. Cut ruthlessly: one capability per beat.
- Retakes should cost nothing. Fix the script and rerun it, never patch a bad take in the edit.
- Keep timing logic in one place (events.json + one ms→frame helper).