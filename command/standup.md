---
description: Summarize what changed since last session for standup
---

Generate a standup report showing recent activity.

## Usage

```
/standup
/standup --since "2 days ago"
```

## Step 1: Gather Activity Data

Run these in parallel:

```bash
# Recent commits (since yesterday by default)
git log --oneline --since="yesterday" --all

# Beads closed recently
bd list --status closed --json | jq -r '.[:10][] | "- \(.id): \(.title)"'

# Currently in progress
bd list --status in_progress --json | jq -r '.[] | "- \(.id): \(.title)"'

# Beads created recently (check timestamps in the JSON)
bd list --json | jq -r '.[:20][] | select(.created_at > (now - 86400 | todate)) | "- \(.id): \(.title)"'

# Any open PRs?
gh pr list --state open --json number,title --jq '.[] | "- PR #\(.number): \(.title)"'
```

## Step 2: Identify Key Changes

From the git log, identify:

- Features added
- Bugs fixed
- Refactors completed
- Documentation updates

Group commits by type/area.

## Step 3: Generate Standup Report

Output in this format:

```markdown
## Standup - [DATE]

### Yesterday / Last Session

- [Completed work items - from closed beads and commits]
- [Key decisions or discoveries]

### Today / Current Focus

- [In-progress beads]
- [What you plan to work on]

### Blockers

- [Any blocked beads or external dependencies]

### Open PRs

- [List any PRs awaiting review]

### Metrics

- Commits: [N]
- Beads closed: [N]
- Beads in progress: [N]
```

## Tips

- If `--since` is provided, use that timeframe instead of "yesterday"
- Focus on outcomes, not activities
- Highlight anything that needs discussion or unblocks others
- Keep it concise - this is for async standup, not a novel
