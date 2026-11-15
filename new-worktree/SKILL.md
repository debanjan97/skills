---
description: Create a fresh git worktree branched off origin/main (or another base) and set it up so it's immediately workable — install dependencies, build, and copy the local .env across. Use whenever the user asks to "create a worktree", "new worktree", "make a worktree for AI-####", "worktree off main", "spin up a branch to work on X", or asks to check out and reset a worktree to origin main. Also use when starting a ticket that should not share the current branch's working tree.
argument-hint: [branch-name]
user-invocable: true
allowed-tools: Bash(git worktree*), Bash(git fetch*), Bash(git log*), Bash(git status*), Bash(git rev-parse*), Bash(git remote*), Bash(git branch*), Bash(ls:*), Bash(cat:*), Bash(cp:*), Bash(test:*), Bash(pnpm install*), Bash(pnpm build*), Bash(node --version), Bash(pnpm --version), Read
---

# New worktree

Create a worktree on a **new branch based on a fresh remote base**, then leave it ready to
work in — not just checked out.

The whole point is that a worktree is worthless until its dependencies and generated
artifacts exist. Creating one and stopping means the user discovers the gap later, mid-task.

---

## Step 1 — Get the branch name. Always ask.

**Never invent a branch name.** If the user did not supply one in this message or earlier in
the conversation, stop and ask for it. Do not derive one from the ticket, the task
description, or the current branch, and do not fall back to a placeholder like
`work/main-fresh`.

Asking costs one turn. Guessing costs a wrong branch name that then has to be renamed
everywhere, including on the remote once it is pushed.

If the user already gave a name (in this message or a previous one), use it verbatim —
including its `feature/`, `fix/`, `eval/` prefix. Do not normalise, shorten, or re-case it.

## Step 2 — Work out where worktrees go in this repo

Do not hardcode a path. Look, in order:

1. `git worktree list` — if existing worktrees share a parent directory, use that parent.
   In `rudder-crew` this is `.claude/worktrees/`.
2. If there are no existing worktrees, ask the user where to put it rather than picking.

Derive the leaf directory name from the branch name with the prefix stripped:
`feature/ai-1352-preserve-full-option-gates` → `ai-1352-preserve-full-option-gates`.
Keep it readable; do not truncate to the ticket alone.

## Step 3 — Fetch the base, then create

Default base is `origin/main`. Use a different base only if the user names one.

```bash
git fetch origin main
git worktree add -b <branch> <parent>/<leaf> origin/main
```

`git worktree add -b … origin/main` **is** the checkout-and-reset. The branch is born at
`origin/main`, so there is no separate `git reset --hard`, and it cannot inherit commits from
whatever branch the current worktree happens to be on. Because the start point is a
remote-tracking ref, upstream tracking is configured automatically.

Then confirm what you actually got:

```bash
git -C <path> status -sb
git -C <path> log --oneline -1
```

Report the resolved HEAD commit. "Created a worktree" without the commit is not a verified
outcome — the fetch may have been a no-op against a stale remote.

## Step 4 — Set it up

A worktree shares the object store but **not** `node_modules` and **not** any build output.
Run the setup unprompted; the user has already opted into it by asking for a worktree.

Detect what the repo needs rather than assuming this list:

- **pnpm repo** (`pnpm-lock.yaml` present) → `pnpm install`, then `pnpm build`.
  Install is usually seconds — pnpm's store is global and the files are hardlinked, so a new
  worktree costs almost no disk. The build is the slow part and is what generates the
  workspace packages other packages resolve against (in `rudder-crew`, `packages/shared/dist/`,
  without which nothing typechecks).
- **npm/yarn repo** → the equivalent install, then a build **only if** the repo has a build
  script that generates cross-package artifacts.
- **No lockfile** → skip; say you skipped it.

Run install and build from inside the new worktree. Report failures with the actual output —
never claim setup succeeded on a build you did not see finish.

## Step 5 — Carry local untracked config across

Gitignored local config does not come with a worktree, and its absence is not obvious until
something refuses to boot.

Copy from the **primary checkout** (the first entry in `git worktree list`) into the new one,
where the source file exists:

- `packages/server/.env` — required in `rudder-crew`; the server refuses to boot without
  `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_PRIMARY_MODEL`, `LLM_JUDGE_MODEL`.
- Any other `.env` / `.env.local` present in the primary checkout but absent in the new one.

```bash
cp <primary>/packages/server/.env <new>/packages/server/.env
```

Two rules:

- **Copy, never symlink.** A symlink means editing one worktree's env silently changes every
  other worktree's, which is exactly the coupling a worktree exists to avoid.
- **Never print, echo, or paste the contents.** These files hold real credentials. Copy the
  file and confirm it landed; do not read it into the transcript.

If the primary checkout has no `.env`, say so and point at `make env` (or the repo's
equivalent) rather than fabricating one.

## Step 6 — Report

State plainly:

- absolute path
- branch name and what it tracks
- resolved HEAD commit (hash + subject)
- what setup ran and whether it passed
- what was copied, and anything deliberately skipped

Then stop. Do not start on the ticket work unless the user asked for it in the same breath.

---

## Traps

- **A branch can only be checked out in one worktree at a time.** If `git worktree add`
  refuses because the branch already exists elsewhere, do not delete or force — report which
  worktree holds it and ask.
- **Do not `git reset --hard` in an existing worktree** to "refresh" it. That silently
  destroys uncommitted work. A stale worktree is refreshed with `git fetch` plus an explicit
  rebase or merge the user asked for.
- **Do not remove worktrees** unless the user explicitly asks. Some are `locked` (visible in
  `git worktree list`) precisely because they hold work in progress.
- **Node version.** If `pnpm install` warns `Unsupported engine`, the local Node does not
  match `.node-version`. Surface the warning; do not silently continue and let it fail later
  in a confusing place.
