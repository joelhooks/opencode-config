# OpenCode Setup Improvements

Based on deep analysis of sst/opencode internals. Prioritized by impact and effort.

## Executive Summary

Our setup is **80% optimized**. Key gaps:

1. No doom loop detection (agents can infinite loop)
2. No streaming progress from tools
3. Flat agent structure (no nesting)
4. Missing abort signal handling in custom tools
5. No output size limits in custom tools

## High Priority (Do This Week)

### 1. Add Doom Loop Detection to Swarm

**What**: Track repeated identical tool calls, break infinite loops.

**Why**: OpenCode detects when same tool+args called 3x and asks permission. We don't - agents can burn tokens forever.

**Implementation**:

```typescript
// In swarm plugin or tool wrapper
const DOOM_LOOP_THRESHOLD = 3;
const recentCalls: Map<
  string,
  { tool: string; args: string; count: number }[]
> = new Map();

function checkDoomLoop(sessionID: string, tool: string, args: any): boolean {
  const key = `${tool}:${JSON.stringify(args)}`;
  const calls = recentCalls.get(sessionID) || [];
  const matching = calls.filter((c) => `${c.tool}:${c.args}` === key);
  if (matching.length >= DOOM_LOOP_THRESHOLD) {
    return true; // Doom loop detected
  }
  calls.push({ tool, args: JSON.stringify(args), count: 1 });
  if (calls.length > 10) calls.shift(); // Keep last 10
  recentCalls.set(sessionID, calls);
  return false;
}
```

**Files**: `plugin/swarm.ts`

### 2. Add Abort Signal Handling to All Tools

**What**: Propagate cancellation to long-running operations.

**Why**: OpenCode tools all respect `ctx.abort`. Ours don't - cancelled operations keep running.

**Implementation**:

```typescript
// In each tool's execute function
async execute(args, ctx) {
  const controller = new AbortController();
  ctx.abort?.addEventListener('abort', () => controller.abort());

  // Pass to fetch, spawn, etc.
  const result = await fetch(url, { signal: controller.signal });
}
```

**Files**: All tools in `tool/*.ts`

### 3. Add Output Size Limits

**What**: Truncate tool outputs that exceed 30K chars.

**Why**: OpenCode caps at 30K. Large outputs blow context window.

**Implementation**:

```typescript
const MAX_OUTPUT = 30_000;

function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT) return output;
  return (
    output.slice(0, MAX_OUTPUT) +
    `\n\n[Output truncated at ${MAX_OUTPUT} chars. ${output.length - MAX_OUTPUT} chars omitted.]`
  );
}
```

**Files**: Wrapper in `tool/` or each tool individually

### 4. Create Read-Only Explore Agent

**What**: Fast codebase search specialist with no write permissions.

**Why**: OpenCode has `explore` agent that's read-only. Safer for quick searches.

**Implementation**:

```yaml
# agent/explore.md
---
name: explore
description: Fast codebase exploration - read-only, no modifications
mode: subagent
tools:
  edit: false
  write: false
  bash: false
permission:
  bash:
    "rg *": allow
    "git log*": allow
    "git show*": allow
    "find * -type f*": allow
    "*": deny
---
You are a read-only codebase explorer. Search, read, analyze - never modify.
```

**Files**: `agent/explore.md`

## Medium Priority (This Month)

### 5. Add Streaming Metadata to Long Operations

**What**: Stream progress updates during tool execution.

**Why**: OpenCode tools call `ctx.metadata({ output })` during execution. Users see real-time progress.

**Current gap**: Our tools return all-or-nothing. User sees nothing until complete.

**Implementation**: Requires OpenCode plugin API support for `ctx.metadata()`. Check if available.

### 6. Support Nested Agent Directories

**What**: Allow `agent/swarm/planner.md` → agent name `swarm/planner`.

**Why**: Better organization as agent count grows.

**Implementation**: Already supported by OpenCode! Just use nested paths:

```
agent/
  swarm/
    planner.md  → "swarm/planner"
    worker.md   → "swarm/worker"
  security/
    auditor.md  → "security/auditor"
```

**Files**: Reorganize `agent/*.md` into subdirectories

### 7. Add mtime-Based Sorting to Search Results

**What**: Sort search results by modification time (newest first).

**Why**: OpenCode's glob/grep tools do this. More relevant results surface first.

**Implementation**:

```typescript
// In cass_search, grep results, etc.
results.sort((a, b) => b.mtime - a.mtime);
```

**Files**: `tool/cass.ts`, any search tools

### 8. Implement FileTime-Like Tracking for Beads

**What**: Track when beads were last read, detect concurrent modifications.

**Why**: OpenCode tracks file reads per session, prevents stale overwrites.

**Implementation**:

```typescript
const beadReadTimes: Map<string, Map<string, Date>> = new Map();

function recordBeadRead(sessionID: string, beadID: string) {
  if (!beadReadTimes.has(sessionID)) beadReadTimes.set(sessionID, new Map());
  beadReadTimes.get(sessionID)!.set(beadID, new Date());
}

function assertBeadFresh(
  sessionID: string,
  beadID: string,
  lastModified: Date,
) {
  const readTime = beadReadTimes.get(sessionID)?.get(beadID);
  if (!readTime) throw new Error(`Must read bead ${beadID} before modifying`);
  if (lastModified > readTime)
    throw new Error(`Bead ${beadID} modified since last read`);
}
```

**Files**: `plugin/swarm.ts` or new `tool/bead-time.ts`

## Low Priority (Backlog)

### 9. Add Permission Wildcards for Bash

**What**: Pattern-based bash command permissions like OpenCode.

**Why**: Finer control than boolean allow/deny.

**Example**:

```yaml
permission:
  bash:
    "git *": allow
    "npm test*": allow
    "rm -rf *": deny
    "*": ask
```

**Status**: May already be supported - check OpenCode docs.

### 10. Implement Session Hierarchy for Swarm

**What**: Track parent-child relationships between swarm sessions.

**Why**: OpenCode tracks `parentID` for subagent sessions. Useful for debugging swarm lineage.

**Implementation**: Add `parentSessionID` to Agent Mail messages or bead metadata.

### 11. Add Plugin Lifecycle Hooks

**What**: `tool.execute.before` and `tool.execute.after` hooks.

**Why**: Enables logging, metrics, input validation without modifying each tool.

**Status**: Requires OpenCode plugin API. Check if `Plugin.trigger()` is exposed.

## Already Doing Well

These areas we're ahead of OpenCode:

1. **BeadTree decomposition** - Structured task breakdown vs ad-hoc
2. **Agent Mail coordination** - Explicit messaging vs implicit sessions
3. **File reservations** - Pre-spawn conflict detection
4. **Learning system** - Outcome tracking, pattern maturity
5. **UBS scanning** - Auto bug scan on completion
6. **CASS history** - Cross-agent session search

## Hidden Features to Explore

From context analysis, OpenCode has features we might not be using:

1. **Session sharing** - `share: "auto"` in config
2. **Session revert** - Git snapshot rollback
3. **Doom loop permission** - `permission.doom_loop: "ask"`
4. **Experimental flags**:
   - `OPENCODE_DISABLE_PRUNE` - Keep all tool outputs
   - `OPENCODE_DISABLE_AUTOCOMPACT` - Manual summarization only
   - `OPENCODE_EXPERIMENTAL_WATCHER` - File change watching

## Implementation Order

```
Week 1:
  [x] Doom loop detection (swarm plugin)
  [ ] Abort signal handling (all tools)
  [ ] Output size limits (wrapper)
  [ ] Explore agent (new file)

Week 2:
  [ ] Nested agent directories (reorganize)
  [ ] mtime sorting (cass, search tools)

Week 3:
  [ ] FileTime tracking for beads
  [ ] Streaming metadata (if API available)

Backlog:
  [ ] Permission wildcards
  [ ] Session hierarchy
  [ ] Plugin hooks
```

## References

- `knowledge/opencode-plugins.md` - Plugin system architecture
- `knowledge/opencode-agents.md` - Agent/subagent system
- `knowledge/opencode-tools.md` - Built-in tool implementations
- `knowledge/opencode-context.md` - Session/context management
