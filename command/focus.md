---
description: Focus on a bead - load context, mark in-progress, prepare workspace
---

Start a focused work session on a specific bead.

## Usage

```
/focus <bead-id>
```

If no bead-id provided, show ready beads and ask which one to focus on.

## Step 1: Load the Bead

```bash
# Get bead details
bd show $ARGUMENTS --json

# If no argument, show ready beads
bd ready --json | head -10
```

## Step 2: Mark In-Progress

```bash
bd update $BEAD_ID --status in_progress
```

## Step 3: Gather Context

Based on the bead description:

1. **Identify mentioned files** - paths referenced in the description
2. **Find related code** - use Glob/Grep to find relevant files
3. **Check dependencies** - are there blocking beads?
4. **Load parent context** - if it's a child of an epic, understand the epic

Read the key files to build context.

## Step 4: Check for Prior Work

```bash
# Any branches related to this bead?
git branch -a | grep -i "$BEAD_ID" || true

# Any stashed work?
git stash list | grep -i "$BEAD_ID" || true

# Related commits?
git log --oneline --all --grep="$BEAD_ID" | head -5 || true
```

## Step 5: Prepare Workspace

If the bead involves specific files, optionally reserve them:

```
agentmail_reserve(paths=[...], reason="Working on $BEAD_ID")
```

## Step 6: Output Focus Summary

```markdown
## Focused on: [bead-id] - [title]

### Description

[bead description]

### Key Files

- [list of relevant files with brief purpose]

### Approach

[suggested approach based on description and codebase analysis]

### Ready to Begin

[first concrete step to take]
```

**You are now in focus mode.** All work should relate to this bead until `/handoff` or explicit context switch.
