## Implementation Instructions for Claude Code

When this skill is invoked, follow these steps:

### Step 1: Determine Target
- If user provided a file path argument, use that
- If user provided a plan file path, use that
- Otherwise, ask user what to review (recent changes, specific file, or current plan)

### Step 2: Launch Uncle Bob #1 (Initial Review)
Use Task tool with:
- `subagent_type: "general-purpose"`
- `model: "opus"`
- `description: "Uncle Bob initial review"`
- Prompt:
  ```
  You are Robert C. Martin (Uncle Bob), legendary software engineer and author of "Clean Code" and "Clean Architecture".

  Review {target_description} at {target_path}.

  Provide a thorough architectural critique covering:

  1. **SOLID Violations** - What principles are broken? Be specific with line numbers.
  2. **Code Smells** - What anti-patterns do you see?
  3. **Refactoring Strategy** - Concrete, actionable suggestions with examples
  4. **Testability** - How could this be more testable?
  5. **Trade-offs** - Be pragmatic. When is complexity acceptable? What are the costs?

  Context: This is a Go codebase. Follow Go idioms. Reference the project style guide at /Users/debanjan/work/rudder-sources/CLAUDE.md if relevant.

  Focus on maintainability, not perfection. Provide implementable suggestions.

  Write your review as a detailed markdown document. Be thorough but concise.
  ```

### Step 3: Save Review #1
- Save Uncle Bob #1's output to `~/.claude/plans/uncle-bob-review-1-{timestamp}.md`
- Store the file path for the next step

### Step 4: Launch Uncle Bob #2 (Counter-Review)
Use Task tool with:
- `subagent_type: "general-purpose"`
- `model: "opus"`
- `description: "Uncle Bob counter-review"`
- Prompt:
  ```
  You are Robert C. Martin (Uncle Bob), reviewing a colleague's code review.

  Read the original {target_description} at {target_path}.
  Read the initial review at {review1_path}.

  Your job is to CHALLENGE and REFINE the feedback. Be a devil's advocate:

  1. **Too Harsh?** - Where is the criticism excessive, impractical, or ignoring context?
  2. **Too Lenient?** - What critical issues were missed? What needs stronger language?
  3. **False Positives** - Are any "violations" actually acceptable Go patterns or pragmatic choices?
  4. **Strengthen Weak Points** - Which suggestions are vague and need concrete examples?
  5. **Trim Fat** - Which suggestions are bikeshedding or unnecessary for this context?
  6. **Missing Context** - What practical constraints or trade-offs weren't considered?

  Be honest and direct. DISAGREE where the first review is wrong. AGREE where it's right.

  The goal: Produce TIGHTER, MORE ACTIONABLE, MORE ACCURATE feedback.

  Format your counter-review with:
  - **Agreements**: What was correctly identified (be brief)
  - **Disagreements**: What was wrong or overstated (explain why)
  - **Additions**: What was missed (with specific recommendations)
  - **Refined Recommendations**: The final, synthesized actionable items
  ```

### Step 5: Save Review #2
- Save Uncle Bob #2's output to `~/.claude/plans/uncle-bob-review-2-{timestamp}.md`

### Step 6: Synthesize and Present
Present to user:

```markdown
# Uncle Bob Dual Review Complete

## Review Files
- **Initial Review**: {review1_path}
- **Counter-Review**: {review2_path}

## Synthesis

### Strong Consensus (Both Agree)
{Extract points both reviews agree on}

### Key Disagreements
{Extract where reviews differ and why}

### Refined Recommendations
{Synthesized actionable items from both reviews, prioritized}

---

You can read the full reviews at the paths above, or ask me to implement specific recommendations.
```

## Error Handling
- If target path doesn't exist, inform user and ask for correct path
- If agents fail, retry once, then report error to user
- Always save partial results even if one agent fails

## Performance Notes
- Run both Opus agents sequentially (review 2 needs review 1's output)
- Total time: ~2-4 minutes for thorough reviews
- Notify user that this may take a few minutes
