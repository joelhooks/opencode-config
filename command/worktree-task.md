---
description: Create worktree for a bead and set up isolated workspace
---

Combine git worktrees with beads for isolated parallel work.

## Usage

```
/worktree-task <bead-id>
/worktree-task new <description>  # Creates bead + worktree
```

## Step 1: Get or Create Bead

If bead-id provided:

```bash
bd show $ARGUMENTS --json
```

If "new <description>":

```bash
bd create "<description>" -p 2 --json
# Capture the new bead ID
```

## Step 2: Create Worktree

```bash
# Use bead ID as branch name
./scripts/wt new $BEAD_ID

# This will:
# - Create branch named after bead
# - Set up worktree in .worktrees/$BEAD_ID
# - Copy .env
# - Run pnpm install
```

## Step 3: Register with Agent Mail

```
agentmail_init(
  project_path="$PWD/.worktrees/$BEAD_ID",
  task="Working on $BEAD_ID: <title>"
)
```

## Step 4: Mark Bead In-Progress

```bash
bd update $BEAD_ID --status in_progress
```

## Step 5: Reserve Files (Optional)

If you know which files you'll touch:

```
agentmail_reserve(
  patterns=["src/path/to/files/*"],
  reason="$BEAD_ID worktree"
)
```

## Step 6: Output Workspace Info

````markdown
## Worktree Ready: $BEAD_ID

### Location

`cd .worktrees/$BEAD_ID`

### Bead

- ID: $BEAD_ID
- Title: <title>
- Description: <description>

### Branch

`$BEAD_ID`

### Commands

```bash
# Enter worktree
cd .worktrees/$BEAD_ID

# Start dev server (if needed)
pnpm run dev

# When done
cd ../..
./scripts/wt rm $BEAD_ID
```
````

### Next Steps

[Based on bead description, suggest first action]

````

## Cleanup (when done)

After PR is merged:
```bash
# Remove worktree and branch
./scripts/wt rm $BEAD_ID

# Close bead
bd close $BEAD_ID --reason "Merged"

# Sync
bd sync && git push
````
