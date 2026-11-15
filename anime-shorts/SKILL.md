---
name: anime-shorts
description: Use when the user wants an anime/manga YouTube Short, TikTok or Reel made from a topic (a fight, a reveal, a character moment). Researches the series and chapter numbers, captures the chapter pages from a URL the user gives in a visible Chrome window, cuts the pages into panels, writes a commentary script, voices it with the ElevenLabs MCP, and edits a 9:16 anime-shorts-style video in Remotion.
---

# Anime shorts: topic → research → capture → panels → script → voice → edit

Make a 30–60s vertical (1080×1920) commentary short from manga panels. Every step is a script or a data file, so any step can be rerun.

**Stop for the user's review at the end of phases 1, 3 and 4.** Never capture before the research is approved, and never spend ElevenLabs credits before the script and its cost are approved.

## Ground rules (not optional)

- **Commentary-first.** The voiceover explains why the moment matters (stakes, setup, payoff, theory), not just "then he punches him". This is both the better short and the stronger fair-use position.
- **Officially released chapters only.** Check the chapter's official release date in phase 1. Refuse leaks, spoilers of unreleased chapters and raw scans posted before release.
- **Use only part of a chapter.** At most 12 panels from any one chapter, and never retell a whole chapter beat by beat. The short should make people want to read it.
- **Credit every time, without breaking the loop.** A small credit line runs along the top edge for the whole Short (series · author · read it on `readOn`, e.g. MANGA Plus, VIZ, K MANGA, Webtoon), and the upload description repeats it. There is no end card: Shorts loop, and a credit or thank-you card at the end breaks the loop.
- **No music by default.** The user adds a sound from the platform's own library at upload. If they put their own licensed track at `public/music.mp3`, it is mixed in at low volume.
- **No dodging Content ID.** Don't mirror panels, add noise or pitch-shift audio to avoid detection.
- **Browser.** The user gives the chapter URL; never pick a site yourself. Open it in the built-in browser pane first so the user can check it. Capture runs a **visible** Chrome window (`channel: 'chrome', headless: false`) on a persistent profile at `~/anime-shorts/.browser-profile`. Never run it headless, add stealth plugins or try to solve a CAPTCHA. If a check shows, the user clears it in the window; the script waits up to 5 minutes. (This is the user's one approved exception to their "Playwright only on localhost:3000/3040" rule. It covers external manga sites in this skill only.)

## The user's feedback (apply every time)

From past shorts. Each item is also built into the template or a step below:

- **Colour words are shown in their colour.** "Purple" is purple, and so on. Named techniques get their own colours through `wordColors`; "Black Flash" is **Black** in black (white outline) and **Flash** in red.
- **Voice moves one rung at a time.** Every delivery tag sits on a ladder, and neighbouring beats may differ by one rung at most:

  | Rung | Delivery | Tags |
  |---|---|---|
  | 0 | quiet | `[whispering]` `[softly]` |
  | 1 | narration | no tag, `[slowly]` `[seriously]` `[curious]` `[warmly]` |
  | 2 | heightened | `[dramatically]` `[intense]` `[excited]` |
  | 3 | peak | `[shouting]` |

  So whispering → narration → dramatic → shouting is the only way up, and the same steps in reverse are the only way down. Shouting must come after a dramatic line and be followed by one. `node scripts/check-delivery.mjs` enforces this and exits 1 on a jump. `build-timeline` warns too. To use a new tag, add it to `scripts/delivery.mjs` with a rung first. Every take is also levelled with `normalize-vo.mjs`.
- **Capture chapters in parallel tabs, and never accept a partial chapter.**
- **Keep the hook title clear of the panel.**
- **No end card. Make it loop.** Nothing after the last line: no credit card, no thank-you, no "follow for more". Write the last beat so it leads back into the hook (the Naruto short ends on "…came home a hero", then cuts back to the village throwing him in the air). Render the last and first frames side by side and check the seam. `outroSeconds` exists only for a user who asks for an end card.
- **The first two seconds decide the short.** YouTube's analytics on the Gojo short (2026-11-15, day one: 954 views, 49.55% stayed, 66% average view duration, 0 comments): half the feed swiped away before watching, while those who stayed watched two thirds. So the middle works and the open does not. The first beat therefore: shows the `hook` title and the most striking panel on frame 0 (no fade-in, no white flash), opens straight on the confrontation rather than the setup, says its point in 9 words or fewer, and moves at once (2–3 panels so the first cut lands inside the first second, or `punch`). The opening take's leading silence is trimmed by `build-timeline`. Open at narration or heightened, not a whisper (this last one is Claude's reading of the feedback, so it is a warning, not a rule).
- **End on a question people want to answer.** The same short got no comments. The last line asks the viewer something debatable about the moment ("Did Sukuna beat Gojo, or did Mahoraga?"), not a generic "what do you think?". It is still a line of the story, not an end card, and it must still lead back into the hook for the loop. Give the user the same question as a suggested pinned comment. `check-delivery.mjs` enforces both this and the opening rules.
- **Visuals get checked before the user sees them.** Render stills at the hook, every punch beat and every colour word, and Read them before rendering the full video.

## Workspace

Template: `~/.claude/skills/anime-shorts/template/`. One folder per short:

```
~/anime-shorts/<slug>/
  brief.md            phase 1: research, chapters, beat list
  pages/<chapter>/    phase 2: captured pages (NNN.jpg|png|webp) + pages/pages.json
  public/panels/      phase 3: cut panels;  panels.json lists them
  review/<chapter>.png  contact sheets: every page with numbered panel boxes
  script.json         phase 4: the edit, beat by beat
  public/vo/<beat>.mp3, words/<beat>.json   phase 5: voiceover + word timings
  src/timeline.json   built from the above; the only thing Remotion reads
  out/short.mp4       phase 6
```

Set up a new short:

```bash
mkdir -p ~/anime-shorts && rsync -a --exclude node_modules --exclude out ~/.claude/skills/anime-shorts/template/ ~/anime-shorts/<slug>/ && cd ~/anime-shorts/<slug> && pnpm install
```

Use pnpm (npm and npx are blocked by a hook). `pnpm-workspace.yaml` allows esbuild's and sharp's install scripts. Run scripts with `pnpm <script>` or `node scripts/<x>.mjs` from the short's folder.

---

## Phase 0: Inputs (one round of questions, at most)

- **Topic**: the moment, fight, reveal or character.
- **Angle**: hype edit, recap, "why this matters", theory, or power-scaling.
- **Length**: 30, 45 or 60s. Default 45.
- **Voice**: reuse the saved narrator (`~/anime-shorts/narrator.json`), pick a new one, or captions only.

Chapter URLs are asked for in phase 2, after research has named the chapters.

## Phase 1: Research → `brief.md`

1. WebSearch the topic, plus the series' fandom wiki chapter list. Find the series, author and official English publisher/platform (`readOn`), and the exact chapter numbers and pages where each moment happens.
2. Check every chapter's **official** release date is on or before today. Drop anything that is only leaked.
3. Write `brief.md`: the series, author, `readOn`, chapters (number, title, release date, why it is needed), and a beat list of 8–14 beats. Each beat gives its chapter and page (approximate is fine), what happens, and the commentary point.
4. Hook first: the first beat is the most striking panel of the confrontation itself plus the question the short answers, not the setup. Give it 2–3 panels. Last beat: a debatable question for the comments that also leads back into the hook.

**Checkpoint 1:** show the brief and wait for approval.

## Phase 2: Capture

1. Ask the user for the chapter URLs. If they give only the site, find the series page and the chapter links on it in the built-in browser pane, and show them which links you found.
2. Open the first chapter in the built-in browser pane (`preview_start` with `url`) so the user can confirm the series and chapter number. If the reader shows one page at a time, ask the user to switch it to long-strip/vertical mode there.
3. Find the selector for the reader's page images in the pane (e.g. `#imgs img`), so comment and ad images stay out. Test it on that first chapter alone.
4. Then capture **all remaining chapters in one run, in parallel tabs, in the background** (it waits for the user if a check appears):
   ```bash
   node scripts/capture.mjs --selector '#imgs img' --tabs 3 \
     --url '<url>' --label c223 --url '<url>' --label c225 ...
   ```
   Tell the user a Chrome window is opening and they may need to clear a check in it. Labels are `c` plus the chapter number (`c1050`).
5. Each chapter reports `saved N of M reader images`. **N must equal M.** A smaller N, or any "never loaded" page, means an incomplete chapter: recapture it. A line like `(N by screenshot)` means the original image could not be fetched and those pages are lower quality; mention it.
6. If the user picks an unlicensed site, say so once and let them decide. Don't refuse, and don't repeat the warning.

If no images appear (exit code 1), the page is not a chapter reader, the reader draws pages on a canvas, or the check was not cleared. Ask the user; do not retry on a loop.

## Phase 3: Panels → contact sheets

```bash
node scripts/cut-panels.mjs            # all chapters; or --chapters c1050,c1051
```

- It writes `public/panels/<chapter>-p<NNN>-<k>.png`, `panels.json`, and `review/<chapter>.png`. The contact sheet shows every page with numbered red boxes; **orange boxes / "CHECK"** mean the page came out as one big panel (a splash page, full-bleed art, or a failed cut).
- **Read every contact sheet yourself.** Note pages that are ads or credits, wrong cuts, and splash pages, then send the sheets to the user with `SendUserFile`.
- Fix a wrong cut by hand. A box can be page fractions or pixels:
  ```bash
  node scripts/crop-panel.mjs --page pages/c1050/007.jpg --box 0,0.45,1,1
  ```
  Read the page image to judge the box, then Read the cropped panel to confirm.

**Checkpoint 2 is folded into 3:** show the sheets together with the script.

## Phase 4: Script → `script.json`

```json
{
  "title": "Gojo vs Sukuna: the moment it turned",
  "series": "Jujutsu Kaisen",
  "author": "Gege Akutami",
  "readOn": "MANGA Plus",
  "beats": [
    { "id": "b1", "panels": ["c236-p004-2", "c236-p005-1"], "hook": "He lost. Here's why.", "line": "[dramatically] The strongest sorcerer alive. Cut in half.", "effect": "punch", "emphasis": ["half"] },
    { "id": "b2", "panels": ["c235-p010-1", "c235-p010-2"], "line": "...", "effect": "kenburns" },
    { "id": "b3", "panels": ["c236-p006-1"], "line": "[shouting] And then — this.", "effect": "punch+speedlines", "emphasis": ["this"] },
    { "id": "b12", "panels": ["c236-p012-1"], "line": "So who really beat him: Sukuna, or Mahoraga?", "effect": "push" }
  ]
}
```

- `panels`: ids from `panels.json`. Several panels in one beat split its time evenly; use that for a quick sequence.
- `line`: the voiceover. Inline ElevenLabs v4 tags (`[whispering]`, `[dramatically]`, `[shouting]`, `[pause]`) shape delivery and are stripped from captions. Keep each line at 15 words or fewer, about 2–5 seconds spoken.
- Delivery follows the ladder (see "The user's feedback"): each beat at most one rung from the last. Plan the arc on purpose: a hook at narration or heightened, building to dramatic, a single shouted peak, then stepping back down to the closing question. Don't swing between extremes for effect. **Run `node scripts/check-delivery.mjs` and get it passing before you price or generate anything.** It also checks the first beat (hook title, 9 words or fewer, 2+ panels or `punch`) and that the last line is a question. Show its rung bars in the beat table at checkpoint 3.
- `hook`: big title text over the beat. First beat only, required, 6 words or fewer. It is on screen from frame 0.
- The first beat's `line` is 9 words or fewer and names the stakes at once. The last beat's `line` is a question the viewer can answer in a comment; `"closingQuestion": false` at the top level turns that check off for a short that should not have one.
- `effect`: motion `kenburns` (default) | `push` (slow tense zoom) | `punch` (slam-in, shake, white flash: impact panels) | `shake` (rumble) | `pan` (scroll down a tall panel; automatic for very tall ones), plus overlays `speedlines` and `flash`, joined with `+`.
- `emphasis`: words shown big and red in the captions. One per beat at most.
- Colour words are automatic: a spoken colour ("purple", "red", "black", "gold"…) is drawn in that colour, dark ones with a white outline. Add series-specific ones with `wordColors` (top level or per beat), a colour per word or a list per phrase, e.g. `"wordColors": { "black flash": ["#0a0a0a", "#e10600"], "cursed energy": "#5b2bff" }`.
- `seconds`: fixed length, for a beat with no voiceover.
- `outroSeconds` (default 0, no end card), `creditLine` (default on; `false` hides it), `musicVolume` (default 0.12) go at the top level.

Pacing: 45s ≈ 10–12 beats. Change the panel every 2–4s, and save `punch` for 2–3 real impact moments; using it on every beat removes its effect.

Before the checkpoint, and only once `check-delivery.mjs` passes, price the voiceover: `creative_generate_speech` with `estimate_only: true` on one representative line, then scale it to the total characters.

Run `node scripts/review-picks.mjs` to draw every chosen panel, labelled by beat, into `review/picks.png`; Read it and send it to the user. Leave out scanlation credit pages and fan-coloured pages (a watermark like `@name` on a coloured page): they are someone else's work, not the author's.

**Checkpoint 3:** show `review/picks.png`, the beat table (`# | panels | line | effect`) and the credit cost, and wait for approval.

## Phase 5: Voiceover (ElevenLabs MCP)

The ElevenLabs connector does voice and speech only (no music or sound effects). Every generate or transcribe call spends credits, and **a retry is a second charge**: never call the same generation twice. Poll instead.

1. `creative_create_flow` once; pass its `flow_id` to every call in this short.
2. **Voice**: if `~/anime-shorts/narrator.json` has a `voice_id`, use it. Otherwise `creative_list_voices` (for example `search: "intense narrator"`, `use_cases: ["characters_animation", "narrative_story"]`, `descriptives: ["intense"]` or `["deep"]`), pick one, and save `{ "voice_id": ..., "name": ... }` to `narrator.json` so later shorts sound the same. `creative_design_voice` builds a custom voice, but it needs the user's own preview line and description.
3. For each beat: `creative_generate_speech` with `model_id: "eleven_v4"`, the saved `voice_id`, `prompt: <line>` and **`generations_count: 1`**. Poll `creative_get_flow_run_status` until `all_completed`.
4. Save each take to `public/vo/<beat id>.mp3`: download the audio URL from the run status with `curl -L`, and convert with `ffmpeg` if it is not mp3. If the status gives no downloadable URL, stop and ask the user to export the takes from the flow's canvas link into `public/vo/`. Don't guess URLs.
5. Level the takes: `node scripts/normalize-vo.mjs` (−16 LUFS, originals kept in `public/vo/raw/`). Rerun it whenever a take is replaced. Without it, a calm line followed by an intense one jumps in volume as well as tone.
6. Word timings: `creative_transcribe_audio` with `connect_from: [<speech node id>]` on the same flow. Write its `words` (or download `words_download_url`) to `words/<beat id>.json`. Timings are in seconds from the start of the take. If transcription is skipped, captions are spread evenly over each take, which is acceptable.

Captions only: skip this phase and give every beat `seconds`.

## Phase 6: Edit and render

```bash
node scripts/build-timeline.mjs      # → src/timeline.json; prints total length
pnpm exec tsc -p .                   # must be clean
pnpm exec remotion still src/index.ts Short review/hook.png --frame=20
pnpm exec remotion render src/index.ts Short out/short.mp4 --codec h264 --crf 18 --log=warn
```

1. Render stills at **frame 0** (it must already show the hook title and the panel: this is what the feed shows first), at the hook after it settles, at every `punch` beat and at every coloured word (each beat's frame is `beats[i].from` in `src/timeline.json`, plus about 4), and Read them. Check that captions don't cover a face or speech bubble, the hook is readable, and the panel is sharp.
2. Render and check with `ffprobe` (1080×1920, an audio stream, the expected duration). Pull 4–6 frames with `ffmpeg -vf "select=eq(n\,<frame>)"` and look at them.
3. Send `out/short.mp4` to the user with `SendUserFile`, and include:
   - a suggested title and description, with the credit line (series, author, where to read it officially) in the description;
   - a suggested pinned comment: the closing question, for the user to post and pin right after upload;
   - a reminder that licensed music (an OST, a trending sound) is added only in the phone app while creating the Short, never after upload;
   - any pages captured by screenshot, and any beat whose words were spread evenly instead of timed.

Tweaks are cheap: edit `script.json`, then rerun `build-timeline` and render. `pnpm studio` opens Remotion Studio for scrubbing.

## Look and feel (what the template does)

- A blurred, darkened copy of the panel fills the frame behind the sharp panel, which has a white border and a drop shadow, plus a vignette.
- Every cut settles from a slight overshoot. `punch` slams in from 1.45×, shakes and flashes white.
- Captions are Montserrat Black, uppercase, with a thick black stroke, 3 words at a time. The word being spoken turns yellow and `emphasis` words turn red. The hook is in Bangers, fully visible on frame 0.
- A small credit line runs along the top edge for the whole Short. The bottom fifth is avoided because the platform's title and channel bar covers it. There is no end card.

Change the style in `src/components/`. Keep the credit line.

## Phase 7 (optional): Upload to YouTube Shorts

Only when the user asks, and only to the platform and visibility they name. Default to **Private**.

**Music decides the route.** Licensed songs (anime OSTs like "Sadness and Sorrow", trending sounds) can only be added while creating the Short in the **YouTube phone app**. They can't be added to an uploaded Short, and Studio's web editor only offers YouTube's royalty-free Audio Library. So if the user wants a licensed song, they AirDrop `out/short.mp4` to their phone and post from the app (Create a Short → Add sound); offer to delete any web draft afterwards, with confirmation, because deleting is permanent. Upload through Studio (below) only when it's no music or an Audio Library track (Editor → Audio).

1. Open `https://studio.youtube.com` in the built-in browser pane; the user signs in there themselves. Claude in Chrome also works, but its file upload is capped at 10 MB and a 60s render is about 35 MB, so either way **the user drags `out/short.mp4` in** (reveal it with `open -R out/short.mp4`). Open the upload box for them: `https://studio.youtube.com/channel/<id>/videos/upload?d=ud`.
2. Once the file is in, fill in the title and the description (with the credit line), choose "No, it's not made for kids", click through Video elements and Checks (report the copyright check result), and choose the visibility the user picked.
3. **Stop before Save/Publish.** Show the user everything that's set and wait for their yes. Mention the "altered or synthetic content" disclosure (under Show more on the Details step) as their call; leave it at its default.
4. After saving, open the Shorts tab in Channel content and confirm the short is listed with the right visibility.
