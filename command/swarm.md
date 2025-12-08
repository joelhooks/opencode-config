---
description: Decompose a task into parallel subtasks using swarm plugin
args:
  - name: task
    description: Task description or bead ID to decompose
    required: true
  - name: max_subtasks
    description: Maximum subtasks (default 5)
    required: false
  - name: no_cass
    description: Skip CASS history query
    required: false
  - name: no_ubs
    description: Skip UBS scan on completion
    required: false
  - name: to_main
    description: Push directly to main (skip PR)
    required: false
---

# Swarm Coordinator

Decompose `{task}` into parallel subtasks using the swarm plugin.

## Flow

```
swarm_decompose → validate → beads_create_epic → spawn agents → swarm_complete
```

## Step 1: Decompose

```
swarm_decompose(
  task="{task}",
  max_subtasks={max_subtasks || 5},
  query_cass={!no_cass}
)
```

This queries CASS for similar past tasks and generates a decomposition prompt. Respond with BeadTree JSON.

## Step 2: Validate

```
swarm_validate_decomposition(response="<your BeadTree JSON>")
```

Checks for:

- File conflicts (same file in multiple subtasks)
- Dependency cycles
- Instruction conflicts between subtasks

Fix any issues before proceeding.

## Step 3: Create Epic + Subtasks

```
beads_create_epic(
  epic_title="<from BeadTree>",
  epic_description="<from BeadTree>",
  subtasks=[<from BeadTree>]
)
```

Creates epic and all subtasks atomically. Returns epic ID and subtask IDs.

## Step 4: Create Branch

```bash
git checkout -b swarm/<epic-id>
git push -u origin HEAD
```

## Step 5: Initialize Agent Mail

```
agentmail_init(
  project_path="$PWD",
  task_description="Swarm coordinator: {task}"
)
```

Remember your `agent_name` from the response.

## Step 6: Spawn Agents

For each subtask, generate prompt and spawn:

```
swarm_subtask_prompt(
  agent_name="<generated-name>",
  bead_id="<subtask-id>",
  epic_id="<epic-id>",
  subtask_title="<title>",
  subtask_description="<description>",
  files=["<files>"],
  shared_context="<any shared context>"
)
```

**CRITICAL: Spawn ALL agents in ONE message with parallel Task calls:**

```
Task(subagent_type="general", description="Swarm: <title>", prompt="<from swarm_subtask_prompt>")
Task(subagent_type="general", description="Swarm: <title>", prompt="<from swarm_subtask_prompt>")
...
```

## Step 7: Monitor

```
swarm_status(epic_id="<epic-id>", project_key="$PWD")
agentmail_inbox()
```

If agents need coordination, broadcast:

```
agentmail_send(
  to=["<agent-names>"],
  subject="Coordinator Update",
  body="<guidance>",
  thread_id="<epic-id>",
  importance="high"
)
```

## Step 8: Complete

Each agent calls `swarm_complete` when done. This:

- Runs UBS scan on modified files (unless `{no_ubs}`)
- Releases file reservations
- Closes the subtask bead
- Records outcome for learning

When all subtasks complete:

```
beads_close(id="<epic-id>", reason="Swarm complete: <summary>")
beads_sync()
```

## Step 9: PR (unless --to-main)

```bash
gh pr create --title "feat: <epic title>" --body "$(cat <<'EOF'
## Summary
<from swarm results>

## Beads
<list subtask IDs and summaries>
EOF
)"
```

## Agent Prompt Template

Each spawned agent receives:

- Their bead ID and epic ID
- File reservations (exclusive)
- Instructions to use `swarm_progress` for updates
- Instructions to use `swarm_complete` when done
- Self-evaluation criteria before completing

## Learning

The plugin tracks outcomes:

- Fast + success → pattern reinforced
- Slow + errors → pattern weakened
- > 60% failure → pattern inverted to anti-pattern

Future decompositions benefit from this learning.

## Flags

| Flag        | Effect                                   |
| ----------- | ---------------------------------------- |
| `--no-cass` | Skip CASS history query in decomposition |
| `--no-ubs`  | Skip UBS bug scan on completion          |
| `--to-main` | Push directly to main, skip PR           |
