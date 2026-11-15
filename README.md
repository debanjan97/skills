# skills

A private backup of my own Claude Code skills. Each folder is one skill, copied from `~/.claude/skills/`.

## Install

```bash
git clone git@github.com:debanjan97/skills.git ~/skills
~/skills/install.sh          # symlinks each skill into ~/.claude/skills/
~/skills/install.sh --force  # replace existing skills of the same name (old ones are moved to a .backup folder)
```

The `anime-shorts` template needs its dependencies installed before use (`pnpm install` in `anime-shorts/template`); `node_modules` is not stored here.

## Skills

| Skill | What it does |
| --- | --- |
| [anime-shorts](anime-shorts/SKILL.md) | Use when the user wants an anime/manga YouTube Short, TikTok or Reel made from a topic (a fight, a reveal, a character moment). |
| [clean-ai-isms](clean-ai-isms/SKILL.md) | Edit AI-isms out of a technical draft (design doc, RFC, PR description, spec) so it respects an engineer-reader's time — without touching technical accuracy. |
| [feature-demo-video](feature-demo-video/SKILL.md) | Use when the user wants to make a polished demo/showcase video of a feature they built (web UI or CLI): storyboard → scripted recording → Remotion edit → render for Slack. |
| [linear-project-update](linear-project-update/SKILL.md) | Generate a weekly Linear project status update by combining Linear ticket data with Granola meeting transcripts, formatted per the RudderStack Notion template. |
| [new-worktree](new-worktree/SKILL.md) | Create a fresh git worktree branched off origin/main (or another base) and set it up so it's immediately workable — install dependencies, build, and copy the local .env across. |
| [no-ai-slop](no-ai-slop/SKILL.md) | Edit drafts into sharper, more human writing while preserving the writer's personal voice, or detect AI-slop patterns without rewriting. |
| [pr](pr/SKILL.md) | Create a feature branch, commit, push and open a pull request; never commit to main. |
| [uncle-bob-review](uncle-bob-review/SKILL.md) | Get deep architectural review from two Uncle Bob (Robert C. Martin) personas who debate to tighten and refine the feedback. |
| [writing-code](writing-code/SKILL.md) | Build or update Debanjan's personal writing code (writing-code.md) from his own writing, or rewrite a document in his voice using that code. |
