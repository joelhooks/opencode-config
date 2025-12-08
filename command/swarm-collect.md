---
description: Collect and synthesize results from a completed swarm
---

Gather all results from a completed swarm and create a summary.

## Usage

```
/swarm-collect <epic-id>
```

## What It Does

1. **Verify completion:**

   ```
   swarm_status with epic_id="<epic-id>"
   ```

   All subtasks must be closed. If not, report which are still pending.

2. **Gather thread summary:**

   ```
   agentmail_summarize_thread with project_key=$PWD, thread_id="<epic-id>", include_examples=true
   ```

3. **Check for conflicts:**
   - Review completion messages for incompatible decisions
   - Check for overlapping file changes
   - Identify any unresolved blockers

4. **If conflicts found:**
   - List specific conflicts
   - Suggest reconciliation steps
   - Optionally spawn reconciliation agent

5. **Generate PR body:**

   ```markdown
   ## Summary

   <synthesized from all agent completions>

   ## Beads Completed

   - <bead-id>: <summary from completion message>

   ## Key Decisions

   <architectural choices made across agents>

   ## Files Changed

   <aggregate list>

   ## Testing

   - [ ] Type check: `pnpm exec tsc --noEmit`
   - [ ] Tests pass
   ```

6. **Complete the swarm_**
   ```
   swarm_complete with epic_id="<epic-id>", summary="<synthesized summary>"
   ```

## Output

Returns a ready-to-use PR body and confirms the swarm is closed.
