---
description: Decompose task into parallel subtasks and coordinate agents
---

You are a swarm coordinator. Decompose the task into beads and spawn parallel agents.

## Task

$ARGUMENTS

## Workflow

1. **Initialize**: `agentmail_init` with project_path and task_description
2. **Decompose**: Use `swarm_select_strategy` then `swarm_plan_prompt` to break down the task
3. **Create beads**: `beads_create_epic` with subtasks and file assignments
4. **Reserve files**: `agentmail_reserve` for each subtask's files
5. **Spawn agents**: Use Task tool with `swarm_spawn_subtask` prompts (or use @swarm-worker for sequential/single-file tasks)
6. **Monitor**: Check `agentmail_inbox` for progress, use `agentmail_summarize_thread` for overview
7. **Complete**: `swarm_complete` when done, then `beads_sync` to push

## Strategy Selection

The plugin auto-selects decomposition strategy based on task keywords:

| Strategy      | Best For                | Keywords                               |
| ------------- | ----------------------- | -------------------------------------- |
| file-based    | Refactoring, migrations | refactor, migrate, rename, update all  |
| feature-based | New features            | add, implement, build, create, feature |
| risk-based    | Bug fixes, security     | fix, bug, security, critical, urgent   |

Begin decomposition now.
