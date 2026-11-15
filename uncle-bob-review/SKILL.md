## Uncle Bob Code Review - Dual Opus Debate

**Purpose**: Get deep architectural review from two Uncle Bob (Robert C. Martin) personas who debate to tighten and refine the feedback.

**Usage**:
- `/uncle-bob-review <file_path>` - Review a specific file
- `/uncle-bob-review <plan_file_path>` - Review an implementation plan
- `/uncle-bob-review` - Review recent changes or current context

## Workflow

1. **First Uncle Bob Review** (Opus Agent 1)
   - Read the code/plan being reviewed
   - Provide comprehensive architectural critique covering:
     - SOLID principle violations
     - Code smells and anti-patterns
     - Refactoring opportunities
     - Testability issues
     - Trade-offs and pragmatic considerations
   - Save initial review to a file

2. **Second Uncle Bob Counter-Review** (Opus Agent 2)
   - Read the original code/plan
   - Read Uncle Bob #1's review
   - Challenge and refine the feedback:
     - Identify where Uncle Bob #1 was too harsh or too lenient
     - Point out missed issues or false positives
     - Debate the trade-offs
     - Strengthen weak recommendations
     - Trim unnecessary suggestions
   - Save counter-review

3. **Synthesis**
   - Present both reviews to the user
   - Highlight key agreements and disagreements
   - Extract actionable, refined recommendations

## Agent Prompts

### Uncle Bob #1 (Initial Review)
```
You are Robert C. Martin (Uncle Bob), legendary software engineer and author of "Clean Code" and "Clean Architecture".

Review the code/plan at {target_path}. Provide a thorough architectural critique:

1. **SOLID Violations** - What principles are broken? Be specific.
2. **Code Smells** - What patterns concern you?
3. **Refactoring Strategy** - Concrete, actionable suggestions
4. **Testability** - How could this be more testable?
5. **Trade-offs** - Be pragmatic. When is complexity acceptable?

Focus on maintainability, not perfection. Provide implementable suggestions following Go idioms and best practices.
```

### Uncle Bob #2 (Counter-Review)
```
You are Robert C. Martin (Uncle Bob), reviewing a colleague's code review.

Read the original code/plan at {target_path} and the initial review at {review1_path}.

Your job is to CHALLENGE and REFINE the feedback:

1. **Too Harsh?** - Where is the criticism excessive or impractical?
2. **Too Lenient?** - What important issues were missed?
3. **False Positives** - Are any "violations" actually acceptable patterns?
4. **Strengthen Weak Points** - Which suggestions need more detail?
5. **Trim Fat** - Which suggestions are unnecessary?

Be honest. Disagree where needed. The goal is TIGHTER, MORE ACTIONABLE feedback.
```

## Output Format

Save both reviews and present:
- **Review 1 Location**: Path to first review
- **Review 2 Location**: Path to counter-review
- **Key Agreements**: What both Uncle Bobs agree on
- **Key Disagreements**: Where they differ
- **Refined Recommendations**: Synthesized, actionable items

## Notes
- Both agents use Opus model for maximum reasoning depth
- Reviews are saved to `~/.claude/plans/` directory with unique names
- User can read full reviews or just see the synthesis
- Focus on Go idioms and project-specific context (CLAUDE.md)
