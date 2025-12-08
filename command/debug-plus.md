---
description: Enhanced debug with swarm integration and prevention pipeline
---

Debug-plus mode. Extends `/debug` with swarm integration for complex investigations and automatic prevention pipeline.

## Usage

```
/debug-plus <error message or description>
/debug-plus --investigate  (spawn swarm for multi-file investigation)
/debug-plus --prevent      (spawn swarm for preventive fixes across codebase)
```

The error/context is: $ARGUMENTS

## When to Use /debug-plus vs /debug

| Use `/debug`      | Use `/debug-plus`               |
| ----------------- | ------------------------------- |
| Single file issue | Multi-file investigation needed |
| Quick fix         | Recurring pattern detected      |
| Known error type  | Systemic issue revealed         |
| One-off bug       | Prevention work needed          |

## Step 1: Standard Debug Investigation

First, run the standard debug flow:

1. **Check known patterns** in `knowledge/error-patterns.md`
2. **Parse the error** - extract type, file:line, function
3. **Locate ground zero** - find the source
4. **Trace the error** - follow the data flow

If this is a simple single-file issue, fix it and stop here. Use `/debug` for simple cases.

## Step 2: Detect Multi-File Scope

Check if the issue spans multiple files:

```bash
# Find all files mentioning the error-related symbol
rg "<symbol>" --files-with-matches | wc -l

# Check import chain
rg "from.*<module>" --files-with-matches
```

**Multi-file indicators:**

- Error involves shared types/interfaces
- Multiple components use the failing pattern
- The fix requires coordinated changes
- Stack trace spans 3+ files

If multi-file, offer swarm investigation:

```
This issue spans N files. Spawn parallel investigation swarm? (y/n)
```

## Step 3: Swarm Investigation (if --investigate or multi-file)

Decompose the investigation:

```
swarm_decompose(
  task="Investigate <error> across codebase: trace data flow, find all affected files, identify root cause",
  max_subtasks=3,
  query_cass=true
)
```

Typical investigation subtasks:

- **Trace upstream** - where does the bad data originate?
- **Trace downstream** - what else is affected?
- **Check patterns** - is this a recurring issue?

## Step 4: Match Prevention Patterns

After identifying root cause, check `knowledge/prevention-patterns.md`:

```bash
# Search for matching prevention pattern
rg -i "<root cause keywords>" ~/.config/opencode/knowledge/prevention-patterns.md -B 2 -A 20
```

**If pattern found:**

```markdown
## Prevention Pattern Detected

**Pattern:** <pattern name from prevention-patterns.md>
**Root Cause:** <why this happens>
**Prevention Action:** <what to add/change>
**Example Bead:** <suggested bead title>

Spawn preventive swarm to fix this across the codebase? (y/n)
```

## Step 5: Spawn Prevention Swarm (if --prevent or pattern matched)

If the user confirms or `--prevent` flag:

```
swarm_decompose(
  task="<Prevention Action from pattern> - apply across codebase to prevent <error type>",
  max_subtasks=4,
  query_cass=true
)
```

Example prevention swarms:

- "Add error boundaries to all route layouts"
- "Add useEffect cleanup to all components with subscriptions"
- "Add null guards to all API response handlers"
- "Add input validation to all form handlers"

## Step 6: Create Prevention Beads

Even without spawning a swarm, always create a bead for preventive work:

```
beads_create(
  title="<Example Bead from prevention-patterns.md>",
  type="task",
  priority=<Priority from pattern>,
  description="Prevention for: <original error>\n\nAction: <Prevention Action>"
)
```

## Step 7: Update Knowledge Base

If this was a novel pattern not in prevention-patterns.md:

```markdown
### <New Pattern Name>

**Error Pattern:** `<regex-friendly error>`

**Root Cause:** <discovered root cause>

**Prevention Action:** <what would prevent this>

**Example Bead:** `<suggested bead title>`

**Priority:** <0-3>

**Effort:** <low|medium|high>
```

Add to `~/.config/opencode/knowledge/prevention-patterns.md`.

## Step 8: Report

```markdown
## Debug-Plus Report

### Error

<original error>

### Root Cause

<explanation>

### Fix Applied

<what was fixed>

### Prevention Pattern

<matched or new pattern>

### Preventive Work

- [ ] Bead created: <bead-id> - <title>
- [ ] Swarm spawned: <epic-id> (if applicable)
- [ ] Knowledge updated: <pattern name> (if novel)

### Files Affected

<list of files that need the preventive fix>
```

## The Debug-to-Prevention Pipeline

```
Error occurs
    ↓
/debug-plus investigates
    ↓
Root cause identified
    ↓
Match prevention-patterns.md
    ↓
Create preventive bead
    ↓
Optionally spawn prevention swarm
    ↓
Update knowledge base
    ↓
Future errors prevented
```

This turns every debugging session into a codebase improvement opportunity.
