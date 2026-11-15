---
name: writing-code
description: Build or update Debanjan's personal writing code (writing-code.md) from his own writing, or rewrite a document in his voice using that code.
---

# Writing code

The goal is a single file, `writing-code.md`, that lets any agent with no access to Debanjan's data rewrite a document so it reads as if he wrote it. The file is the deliverable. Everything else in this skill exists to produce it and to prove it works.

The work folder is `~/.writing-code/`:

```
corpus/<source>.jsonl     one record per piece: {source, register, date, id, text}
notes/batch-NN.md         observations from step 4
holdout.jsonl             samples kept out of the analysis, for step 6
extract_cc.py             the Claude Code extractor (bundled next to this file)
writing-code.md           the output
CHANGELOG.md              what changed on each update
```

## Modes

- **Build:** no `writing-code.md` yet. Run steps 1–6.
- **Update:** the code exists. Collect only material newer than the last date in `CHANGELOG.md`, run steps 4–6 on it, and edit the code. Don't regenerate it. Record what changed and why in `CHANGELOG.md`.
- **Apply:** "rewrite this in my style". Read `writing-code.md` and follow its "How to apply" section. Don't touch the corpus.

## Sources and their registers

| Source | Register | What it shows |
|---|---|---|
| Claude Code prompts | `prompt` | Instructions and reasoning out loud. Terse, informal. |
| claude.ai chats | `prompt` / `chat` | Longer thinking, questions, personal topics. |
| Granola meetings | `spoken` | How he explains, argues, and pushes back live. |
| Notion pages created before 2022-12-01 | `doc` | Long-form writing from before AI drafting tools. The cleanest sample of his document voice. |

The register matters. A trait only goes into the core section of the code if it shows up in at least two registers. Otherwise it goes in that register's section.

## 1. Collect

Collect whatever sources are reachable and say which ones aren't. Write each source to its own corpus file.

### Claude Code prompts

Run the bundled extractor on his machine:

```
python3 -I ~/.claude/skills/writing-code/extract_cc.py ~/.claude/projects > ~/.writing-code/corpus/claude-code.jsonl
```

It keeps only text he typed. It drops tool results, subagent prompts (`isSidechain`, which Claude wrote), slash commands, system reminders, compaction summaries, and duplicates from resumed sessions. Pasted code becomes `[code]`, and long log-like lines are removed.

### claude.ai chats

- **Preferred:** his data export (claude.ai Settings → Privacy → Export data). `conversations.json` holds every chat. Keep messages with `sender == "human"` and apply the same cleaning as the extractor.
- **Fallback:** only in a claude.ai session, use `recent_chats` to page through chats, then `read_conversation` and keep only Human turns. This is slow, so stop at about 100 chats and spread them across dates.

In both cases, drop text he pasted from someone else: quoted emails, forwarded messages, documents. Long blocks that read in a different voice from his turns are usually pastes.

### Granola meetings

- List his meetings across the last 6–12 months, then pull transcripts with `get_meeting_transcript`. Batch up to 10 IDs per call and keep at most 5 calls in flight.
- Keep only his turns: blocks from the **Microphone** audio source. System audio is other people. Check this on the first transcript before trusting it. Older transcripts may only have `Speaker A/B` labels; if it's unclear which speaker is him, skip that meeting.
- Meetings with three or more people talking over each other are noisy. Prefer 1:1s and small meetings where he explains things.
- Speech-to-text errors are not his style. From this source, take only word choice, how he structures an explanation, and how he disagrees. Ignore punctuation and spelling.
- Private notes he typed into Granola (`get_meetings`, on meetings he owns) are written text. Store them as `register: notes`.

### Notion before December 2022

- Call `notion-get-self`. Then run `notion-search` with an empty query and filters `{"created_by_user_ids": ["me"], "created_date_range": {"end_date": "2022-11-30"}}`, `page_size: 50`. Repeat with a few topic keywords (design, RFC, proposal, notes, plan) to widen coverage.
- `notion-fetch` each page. Keep pages that are mostly prose he wrote. Skip templates, link dumps, tables, and pages that are mostly other people's comments.
- If a page was heavily edited after 2022, by him or anyone else, it may contain later text. Keep it only if the edit metadata suggests minor changes.

## 2. Clean and protect

- Remove secrets, tokens, keys, internal URLs, customer names, and people's personal details. Do this from the corpus, not only from the final code.
- Keep typos in the corpus, because they're evidence for the prompt register. Never teach them as a rule for other registers.
- If he switches between languages, keep that. It's style.

## 3. Sample

- Sort by date and sample evenly across time, so one month of heavy prompting doesn't dominate.
- Targets per source: about 400 prompts, about 150 chat turns, 15–25 meetings' worth of his turns, and every usable pre-2022 Notion page. Use fewer if less exists.
- Put a random 10% of each source in `holdout.jsonl`. These never go into analysis.

## 4. Observe

Split the sample into batches of about 40 pieces, each batch from a single register. For each batch, write `notes/batch-NN.md` containing observations only, no conclusions. Each observation needs:

- the trait, stated concretely ("opens with the goal, then the constraint, then a one-word check like 'feasible?'", not "direct")
- 2–3 direct quotes from the batch as evidence
- the register, and how often it appears in the batch

Look at these dimensions:

- **Openings and closings.** How he starts and ends a piece.
- **Argument shape.** Order of claim, reason, and caveat. Whether he gives the conclusion first.
- **Hedging and certainty.** "I think", "IDK", how he says he's unsure, how confident his claims are.
- **Sentence and paragraph length.** Fragments, run-ons, how he uses lists.
- **Vocabulary.** Words and phrases he uses often, technical terms, words that are distinctly his.
- **Questions.** How he asks, and how often.
- **Disagreement and pushback.**
- **Humor and asides.**
- **Formatting.** Casing, punctuation, emphasis, emoji.
- **Absences.** Things a generic writer or an AI would say and he never does. This is often the most useful dimension.

If subagents are available, run batches in parallel, one batch per agent, and pass this step's instructions with each.

## 5. Synthesize

Read all the notes. A trait goes into the code only if it appears in at least 3 batches. Core traits must also appear in at least 2 registers. When registers disagree, keep both and note which register each belongs to. When old Notion writing disagrees with recent writing, prefer the recent writing and note the change.

Write `writing-code.md` with this structure:

```markdown
# Debanjan's writing code

## How to apply
Rewrite to match this code without changing facts, claims, or structure the reader
depends on. Read the exemplars first. Match the target register's section. Never add
typos. Remove anything listed under "Never". Then check every rule below against the draft.

## Core voice (all registers)
5–8 rules. Each: the rule, one sentence on why it matters, one short real quote.

## Sentences
Length, openings, punctuation, how questions are asked.

## Structure
How a piece opens, how an argument is ordered, how it closes.

## Lexicon
Uses: words and phrases he reaches for.
Never: words and moves he would not use (including AI-isms observed to be absent).

## Registers
### Doc   ### Chat/Slack   ### Prompt   ### Spoken
What changes in each register compared with the core.

## Exemplars
10–15 short passages with sensitive details removed, each labeled with its register.
Include at least 3 doc-register passages.

## Before → after
3 pairs: a generic paragraph, then the same paragraph rewritten to this code.
```

Keep it under about 1,500 words, not counting exemplars. A rule with no evidence behind it is deleted.

## 6. Validate

This step decides whether the code works. Run it in fresh subagents that have not seen the corpus or the notes.

1. Take 10 holdout pieces, preferring chat and doc registers over prompts.
2. **Neutralizer agent:** rewrite each piece into plain, generic prose with the same content.
3. **Applier agent:** given only `writing-code.md` and the neutral version, rewrite it back into his voice.
4. **Judge agent:** for each piece, show the original and the applier's version in random order. Ask which one Debanjan wrote, how confident the judge is, and what gave it away.
5. Score: if the judge picks the original in 6 or fewer of 10, the code passes. If it fails, use the judge's "what gave it away" reasons to edit the code, then run again with new holdout pieces. Stop after 3 rounds.
6. Report the score, the most common giveaways, and which rules were added or changed.

Optionally, also show him 3 pairs and ask him which one is his. His answer counts for more than the judge's.

## Finish

Send `writing-code.md` and a summary that covers:

- how many pieces came from each source
- the validation score
- the 3 traits that were most distinctive
- which sources were unreachable, if any
