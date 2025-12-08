---
description: Check status of an active swarm
---

Check the status of a running swarm by epic/parent bead ID.

## Usage

```
/swarm-status <epic-id>
```

## What It Does

1. **Query bead status:**

   ```
   swarm_status with epic_id="<epic-id>"
   ```

2. **Check Agent Mail thread:**

   ```
   agentmail_summarize_thread with project_key=$PWD, thread_id="<epic-id>"
   ```

3. **Report:**
   - Total subtasks and completion percentage
   - Which agents are still working
   - Recent messages in the swarm thread
   - Any blockers or issues reported

## Output Format

```markdown
## Swarm Status: <epic-id>

### Progress: N/M complete (X%)

### Subtasks

- [bead-id] ✅ completed - <summary>
- [bead-id] 🔄 in_progress - <agent working on it>
- [bead-id] ⏳ pending - not started

### Recent Activity

- <agent>: <last message summary>

### Blockers

- <any reported blockers>
```
