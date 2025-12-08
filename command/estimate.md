---
description: Break down and estimate effort for a bead
---

Analyze a bead and provide effort estimation with subtask breakdown.

## Usage

```
/estimate <bead-id>
```

## Step 1: Load the Bead

```bash
bd show $ARGUMENTS --json
```

Parse the bead details: title, description, type, any linked beads.

## Step 2: Analyze the Work

Based on the bead description:

1. **Identify scope** - What exactly needs to change?
2. **Find affected files** - Use Glob/Grep to locate relevant code
3. **Check complexity** - How interconnected is the code?
4. **Identify unknowns** - What needs investigation?

Read key files if needed to understand the implementation surface.

## Step 3: Break Into Subtasks

If the bead is non-trivial, decompose it:

```
swarm_decompose with task="<bead description>", context="<codebase context you gathered>"
```

Or manually identify subtasks based on your analysis.

## Step 4: Estimate Complexity

Use this scale:

| Size        | Description                     | Typical Time |
| ----------- | ------------------------------- | ------------ |
| **Trivial** | One-liner, obvious fix          | < 15 min     |
| **Small**   | Single file, clear scope        | 15-60 min    |
| **Medium**  | Multiple files, some complexity | 1-4 hours    |
| **Large**   | Cross-cutting, needs design     | 4+ hours     |

Consider:

- Lines of code to change
- Number of files affected
- Test coverage needed
- Integration points
- Risk of breaking things

## Step 5: Identify Risks & Dependencies

Check for:

- **Dependencies** - Does this need other beads done first?
- **Technical risks** - Unfamiliar code, complex state, race conditions
- **External blockers** - API changes, design decisions, reviews needed
- **Test complexity** - Hard to test scenarios

## Step 6: Output Estimate

```markdown
## Estimate: [bead-id] - [title]

### Summary

[1-2 sentence description of what this involves]

### Complexity: [Trivial/Small/Medium/Large]

### Effort: [time estimate range]

### Subtasks

1. [subtask] - [estimate]
2. [subtask] - [estimate]
3. [subtask] - [estimate]

### Files Affected

- [file path] - [what changes]

### Risks

- [risk 1]
- [risk 2]

### Dependencies

- [blocking bead or external dependency]

### Recommendation

[Should this be broken into separate beads? Done in a swarm? Needs more investigation first?]
```

## Tips

- Be honest about unknowns - "needs spike" is valid
- Consider test time in estimates
- If Large, suggest breaking into smaller beads
- Flag if estimate confidence is low
