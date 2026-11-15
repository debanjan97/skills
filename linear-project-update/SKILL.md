---
name: linear-project-update
description: Generate a weekly Linear project status update by combining Linear ticket data with Granola meeting transcripts, formatted per the RudderStack Notion template.
disable-model-invocation: true
argument-hint: <linear-project-url-or-name>
---

# Generate Weekly Linear Project Status Update

Generate a comprehensive weekly project status update for a Linear project by cross-referencing Linear ticket movements with Granola meeting transcripts from the past week.

## Arguments

- `$ARGUMENTS` = Linear project URL, slug, or name (required)

## Output Format

Follow the RudderStack Linear project update template exactly:

```
# <Project Name>: Weekly Update (<date>)

## Linear project due date
<Current due date status. If pushed, explain why.>

## Project status (Linear)
<One of: On track / At risk / Off track>

## Written update

### Due date Change
<If release date pushed, explain why. "N/A" otherwise.>

### Blockers
<List any project blockers: technical challenges, unplanned work, design resources, etc.>

### Decisions
<List key decisions made this week.>

### What did we do last week?
<Brief bullet points of completed work.>

### What are we doing this upcoming week?
<Brief bullet points of planned work.>
```

## Workflow

### Step 1: Fetch Linear project data (parallel)

Run these in parallel:
1. **Get project details**: Use `mcp__linear-server__get_project` with `includeMilestones: true` and `includeMembers: true`
2. **Get recent issues**: Use `mcp__linear-server__list_issues` with the project name/slug, `updatedAt: "-P7D"`, `limit: 100`, `orderBy: "updatedAt"`
3. **Get previous status updates**: Use `mcp__linear-server__get_status_updates` with `type: "project"` and the project name, `limit: 3` -- for continuity with previous updates

If the issues list returns empty with the project slug from URL, retry with the project name from `get_project`.

### Step 2: Fetch ALL project issues

Also fetch all issues (not just updated ones) to understand the full project scope:
- Use `mcp__linear-server__list_issues` with the project name, `limit: 250`

### Step 3: Find relevant Granola meetings

1. Use `mcp__granola__list_meetings` with `limit: 20` to get recent meetings
2. Filter for meetings from the last 7 days
3. Identify meetings relevant to the project by title (look for project-related keywords, team standups, security catch-ups, grooming sessions, 1:1s with team members, sprint planning, etc.)
4. If `list_meetings` fails or returns no results, try `mcp__granola__search_meetings` with several relevant keywords from the project name

### Step 4: Fetch meeting transcripts (parallel)

For each relevant meeting from the last 7 days, fetch the transcript using `mcp__granola__get_meeting_transcript`. Fetch up to 5-6 transcripts in parallel. Be mindful of rate limits -- if you hit one, wait and retry.

### Step 5: Synthesize the update

Combine Linear data + meeting transcripts to produce the update:

**From Linear tickets, extract:**
- Issues completed this week (status = "Done", completedAt in last 7 days)
- Issues currently in progress
- Issues moved to review
- New issues created this week
- Milestone progress percentages
- Target dates and any changes

**From Granola transcripts, extract:**
- Key decisions made in meetings (architectural choices, tool selections, approach changes)
- Blockers discussed
- Context and rationale behind ticket work that wouldn't be visible from ticket titles alone
- Upcoming plans mentioned verbally
- Cross-team dependencies or follow-ups
- Action items assigned to specific people

**Synthesis rules:**
- Blockers section: combine both technical blockers from tickets AND blockers mentioned in meetings
- Decisions section: focus on decisions from meetings -- these are rarely captured in tickets
- "What did we do" section: lead with completed tickets but add meeting context (e.g., WHY something was done, what approach was chosen)
- "What are we doing" section: combine queued/in-progress tickets with verbal plans from meetings
- Include ticket identifiers (e.g., PRO-5301) for traceability
- Include priority/severity labels for completed items where relevant (Urgent, High, Critical)
- Keep bullet points concise but informative

### Step 6: Save and present

1. Save the update to a markdown file in the current working directory: `<project-slug>-update-<date>.md`
2. Present the update to the user for review
3. Ask if they want to post it as a Linear status update using `mcp__linear-server__save_status_update`

## Tips

- Granola MCP server can be flaky. If searches return nothing, try `list_meetings` instead of `search_meetings`. If it fails entirely, suggest the user run `/mcp` to reconnect, then retry.
- Meeting transcripts are raw speech-to-text -- parse them for meaning, not literal quotes.
- The previous status update gives you context on what was reported last week, so you can show continuity.
- "Me" in transcripts refers to the user (Debanjan). "Them" refers to other participants.
- When multiple participants speak, attribute decisions and action items to the right people based on context.
