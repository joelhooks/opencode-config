---
description: Decompose a task into beads and spawn parallel agents to execute
---

You are a swarm coordinator. Take a complex task, break it into beads, and unleash parallel agents.

## Usage

```
/swarm <task description or bead-id>
/swarm --to-main <task>  # Skip PR, push directly to main (use sparingly)
/swarm --no-sync <task>  # Skip mid-task context sync (for simple independent tasks)
```

**Default behavior: Feature branch + PR with context sync.** All swarm work goes to a feature branch, agents share context mid-task, and creates a PR for review.

## Step 1: Initialize Session

Use the plugin's agent-mail tools to register:

```
agentmail_init with project_key=$PWD, program="opencode", model="claude-sonnet-4", task_description="Swarm coordinator: <task>"
```

This returns your agent name and session state. Remember it.

## Step 2: Create Feature Branch

**CRITICAL: Never push directly to main.**

```bash
# Create branch from bead ID or task name
git checkout -b swarm/<bead-id>  # e.g., swarm/trt-buddy-d7d
# Or for ad-hoc tasks:
git checkout -b swarm/<short-description>  # e.g., swarm/contextual-checkins

git push -u origin HEAD
```

## Step 3: Understand the Task

If given a bead-id:

```
beads_query with id=<bead-id>
```

If given a description, analyze it to understand scope.

## Step 4: Decompose into Beads

Use the swarm decomposition tool to break down the task:

```
swarm_decompose with task="<task description>", context="<relevant codebase context>"
```

This returns a structured decomposition with subtasks. Then create beads_

```
beads_create_epic with title="<parent task>", subtasks=[{title, description, files, priority}...]
```

**Decomposition rules:**

- Each bead should be completable by one agent
- Beads should be independent (parallelizable) where possible
- If there are dependencies, use `beads_link_thread` to connect them
- Aim for 3-7 beads per swarm (too many = coordination overhead)

## Step 5: Reserve Files

For each subtask, reserve the files it will touch:

```
agentmail_reserve with project_key=$PWD, agent_name=<YOUR_NAME>, paths=[<files>], reason="<bead-id>"
```

**Conflict prevention:**

- No two agents should edit the same file
- If overlap exists, merge beads or sequence them

## Step 6: Spawn the Swarm

**CRITICAL: Spawn ALL agents in a SINGLE message with multiple Task calls.**

Use the prompt generator for each subtask:

```
swarm_subtask_prompt with bead_id="<bead-id>", coordinator_name="<YOUR_NAME>", branch="swarm/<parent-id>", files=[<files>], sync_enabled=true
```

Then spawn agents with the generated prompts:

```
Task(
  subagent_type="general",
  description="Swarm worker: <bead-title>",
  prompt="<output from swarm_subtask_prompt>"
)
```

Spawn ALL agents in parallel in a single response.

## Step 7: Monitor Progress (unless --no-sync)

Check swarm status:

```
swarm_status with epic_id="<parent-bead-id>"
```

Monitor inbox for progress updates:

```
agentmail_inbox with project_key=$PWD, agent_name=<YOUR_NAME>
```

**When you receive progress updates:**

1. **Review decisions made** - Are agents making compatible choices?
2. **Check for pattern conflicts** - Different approaches to the same problem?
3. **Identify shared concerns** - Common blockers or discoveries?

**If you spot incompatibilities, broadcast shared context:**

```
agentmail_send with project_key=$PWD, sender_name=<YOUR_NAME>, to=[<agents>], subject="Coordinator Update", body_md="<guidance>", thread_id="<parent-bead-id>", importance="high"
```

## Step 8: Collect Results

When agents complete, they send completion messages. Summarize the thread:

```
agentmail_summarize_thread with project_key=$PWD, thread_id="<parent-bead-id>"
```

## Step 9: Complete Swarm

Use the swarm completion tool:

```
swarm_complete with epic_id="<parent-bead-id>", summary="<what was accomplished>"
```

This:

- Verifies all subtasks are closed
- Releases file reservations
- Closes the parent bead
- Syncs beads to git

## Step 10: Create PR

```bash
gh pr create --title "feat: <parent bead title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points from swarm results>

## Beads Completed
- <bead-id>: <summary>
- <bead-id>: <summary>

## Files Changed
<aggregate list>

## Testing
- [ ] Type check passes
- [ ] Tests pass (if applicable)
EOF
)"
```

Report summary:

```markdown
## Swarm Complete: <task>

### PR: #<number>

### Agents Spawned: N

### Beads Closed: N

### Work Completed

- [bead-id]: [summary]

### Files Changed

- [aggregate list]
```

## Failure Handling

If an agent fails:

- Check its messages: `agentmail_inbox`
- The bead remains in-progress
- Manually investigate or re-spawn

If file conflicts occur:

- Agent Mail reservations should prevent this
- If it happens, one agent needs to wait

## Direct-to-Main Mode (--to-main)

Only use when explicitly requested. Skips branch/PR:

- Trivial fixes across many files
- Automated migrations with high confidence
- User explicitly says "push to main"

## No-Sync Mode (--no-sync)

Skip mid-task context sharing when tasks are truly independent:

- Simple mechanical changes (find/replace, formatting, lint fixes)
- Tasks with zero integration points
- Completely separate feature areas with no shared types

In this mode:

- Agents skip the mid-task progress message
- Coordinator skips Step 7 (monitoring)
- Faster execution, less coordination overhead

**Default is sync ON** - prefer sharing context. Use `--no-sync` deliberately.
