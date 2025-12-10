# OpenCode Agent System Analysis

## Executive Summary

OpenCode implements a sophisticated agent/subagent system with context isolation, model routing, and tool restriction. Key findings:

1. **Task Tool** spawns subagents via `SessionPrompt.prompt()` with isolated sessions
2. **Model routing** via agent config (fallback to parent model)
3. **Context isolation** through parent/child session tracking
4. **Built-in agents**: general, explore, build, plan
5. **Tool restrictions** via agent-specific permissions and tool maps

## 1. Subagent Spawning (Task Tool)

### Implementation: `packages/opencode/src/tool/task.ts`

**Core mechanism:**

```typescript
// Create new session with parentID link
const session = await Session.create({
  parentID: ctx.sessionID,
  title: params.description + ` (@${agent.name} subagent)`,
});

// Spawn agent with isolated context
const result = await SessionPrompt.prompt({
  messageID,
  sessionID: session.id,
  model: { modelID, providerID },
  agent: agent.name,
  tools: {
    todowrite: false,
    todoread: false,
    task: false, // Prevent recursive task spawning
    ...agent.tools,
  },
  parts: promptParts,
});
```

**Key features:**

- **Session hierarchy**: Child sessions track `parentID` for lineage
- **Metadata streaming**: Tool call progress from child flows to parent via `Bus.subscribe(MessageV2.Event.PartUpdated)`
- **Cancellation**: Parent abort signal propagates to child
- **Result format**: Returns text + `<task_metadata>` with `session_id` for continuation

**Comparison to our swarm:**

- OpenCode: Single task tool, generic agent selection
- Us: Specialized `swarm_spawn_subtask` with BeadTree decomposition, Agent Mail coordination, file reservations

## 2. Model Routing

### Agent Model Selection: `packages/opencode/src/agent/agent.ts`

**Priority order:**

1. Agent-specific model (if configured)
2. Parent message model (inherited)
3. Default model (from config)

```typescript
// Line 78-81 in task.ts
const model = agent.model ?? {
  modelID: msg.info.modelID,
  providerID: msg.info.providerID,
};
```

**Agent config schema:**

```typescript
export const Info = z.object({
  name: z.string(),
  model: z
    .object({
      modelID: z.string(),
      providerID: z.string(),
    })
    .optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  // ...
});
```

**Comparison to our agents:**

- OpenCode: Optional model override per agent
- Us: Explicit model in frontmatter (`model: anthropic/claude-sonnet-4-5`)

## 3. Agent Context Isolation

### Session System: `packages/opencode/src/session/`

**Message threading:**

```typescript
export const Assistant = z.object({
  id: z.string(),
  sessionID: z.string(),
  parentID: z.string(), // Links to user message
  modelID: z.string(),
  providerID: z.string(),
  mode: z.string(), // Agent name
  // ...
});
```

**Context boundaries:**

- Each agent gets fresh `Session.create()` with isolated message history
- Tool results stay in child session unless explicitly returned
- Parent sees summary metadata, not full tool output
- Child can continue via `session_id` parameter (stateful resumption)

**Context leakage prevention:**

- Tool outputs not visible to parent by default
- Agent must explicitly include results in final text response
- Summary metadata extracted from completed tool parts

**Comparison to our swarm:**

- OpenCode: Implicit isolation via sessions, manual result passing
- Us: Explicit Agent Mail messages, file reservations, swarm coordination metadata

## 4. Built-in Agent Types

### Defined in `packages/opencode/src/agent/agent.ts` lines 103-169

| Agent       | Mode       | Description                                           | Tool Restrictions                                       |
| ----------- | ---------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **general** | `subagent` | General-purpose multi-step research and parallel work | No todo tools                                           |
| **explore** | `subagent` | Fast codebase search specialist                       | **Read-only**: no edit/write tools                      |
| **build**   | `primary`  | Full access for building/coding                       | All tools enabled                                       |
| **plan**    | `primary`  | Planning with restricted bash                         | **Limited bash**: only read-only git/grep/find commands |

### Agent Permissions System

**Two-level control:**

1. **Tool map** (boolean enable/disable):

```typescript
tools: {
  edit: false,
  write: false,
  todoread: false,
  todowrite: false,
}
```

2. **Permission patterns** (allow/deny/ask):

```typescript
permission: {
  edit: "deny",
  bash: {
    "git log*": "allow",
    "find * -delete*": "ask",
    "*": "deny",
  },
  webfetch: "allow",
  doom_loop: "ask",
  external_directory: "ask",
}
```

**Plan agent bash restrictions** (lines 57-101):

- **Allow**: grep, rg, find (non-destructive), git log/show/diff/status, ls, tree, wc, head, tail
- **Ask**: find -delete/-exec, sort -o, tree -o
- **Default**: ask for all others

**Comparison to our agents:**

- OpenCode: Dual control (tool map + permission patterns)
- Us: Single YAML frontmatter with tool boolean flags and bash pattern matching

### Our Agents

| Agent             | Mode       | Model             | Tool Restrictions                                                                  |
| ----------------- | ---------- | ----------------- | ---------------------------------------------------------------------------------- |
| **swarm-worker**  | `subagent` | claude-sonnet-4-5 | _(none specified - inherits default)_                                              |
| **swarm-planner** | `subagent` | claude-opus-4-5   | _(none specified)_                                                                 |
| **archaeologist** | `subagent` | claude-sonnet-4-5 | **Read-only**: write/edit false, limited bash (rg, git log/show/blame, tree, find) |

## 5. Response Processing

### SessionProcessor: `packages/opencode/src/session/processor.ts`

**Stream handling:**

1. **Reasoning chunks** (extended thinking):
   - `reasoning-start` → create part
   - `reasoning-delta` → stream text updates
   - `reasoning-end` → finalize with metadata

2. **Tool calls**:
   - `tool-input-start` → create pending part
   - `tool-call` → update to running + doom loop detection
   - `tool-result` → update to completed + store output

3. **Doom loop detection** (lines ~120-170):
   - Tracks last 3 tool calls
   - If same tool + same input 3 times → ask permission or deny
   - Configurable via `permission.doom_loop: "ask" | "deny" | "allow"`

**Result aggregation:**

```typescript
const summary = messages
  .filter((x) => x.info.role === "assistant")
  .flatMap((msg) => msg.parts.filter((x) => x.type === "tool"))
  .map((part) => ({
    id: part.id,
    tool: part.tool,
    state: {
      status: part.state.status,
      title: part.state.title,
    },
  }));
```

**Comparison to our swarm:**

- OpenCode: Generic stream processor for all agents
- Us: `swarm_complete` custom handling with UBS scan, reservation release, outcome recording

## 6. Configuration & Extension

### Agent Configuration: `opencode.jsonc` or `agent/*.md`

**JSONC format:**

```json
{
  "agent": {
    "my-agent": {
      "description": "Custom agent for X",
      "model": "anthropic/claude-sonnet-4",
      "mode": "subagent",
      "tools": {
        "edit": false
      },
      "permission": {
        "bash": {
          "*": "deny"
        }
      },
      "temperature": 0.2,
      "top_p": 0.9
    }
  }
}
```

**Markdown format** (our approach):

```yaml
---
name: my-agent
description: Custom agent for X
mode: subagent
model: anthropic/claude-sonnet-4
temperature: 0.2
tools:
  edit: false
permission:
  bash:
    "*": deny
---
# Agent Instructions
...
```

### Config Loading Priority

1. Global config (`~/.config/opencode/opencode.jsonc`)
2. Project config (searched up from working dir)
3. Agent markdown files (`agent/`, `mode/` dirs)
4. Environment flags (`OPENCODE_CONFIG`, `OPENCODE_CONFIG_CONTENT`)

**Merge behavior**: Deep merge with plugin array concatenation

## 7. Key Differences: OpenCode vs Our Swarm

| Aspect                | OpenCode                          | Our Swarm                                      |
| --------------------- | --------------------------------- | ---------------------------------------------- |
| **Spawning**          | Generic Task tool                 | Specialized swarm tools + BeadTree             |
| **Coordination**      | Implicit via sessions             | Explicit Agent Mail messages                   |
| **File conflicts**    | Not detected                      | Pre-spawn validation + reservations            |
| **Model routing**     | Config override or inherit        | Explicit frontmatter                           |
| **Tool restrictions** | Boolean map + permission patterns | Boolean map + bash patterns                    |
| **Result passing**    | Manual text summary               | Structured swarm_complete                      |
| **Learning**          | None                              | Outcome tracking + pattern maturity            |
| **Built-in agents**   | 4 (general, explore, build, plan) | 3 (swarm-worker, swarm-planner, archaeologist) |

## 8. Implementation Insights

### What OpenCode Does Well

1. **Clean abstraction**: `Task` tool is single entry point for all subagents
2. **Stream metadata**: Real-time progress from child to parent
3. **Doom loop protection**: Prevents infinite tool call cycles
4. **Permission granularity**: Wildcard patterns for bash commands
5. **Session hierarchy**: Clear parent/child tracking

### What Our Swarm Does Better

1. **Pre-spawn validation**: Detects file conflicts before spawning
2. **Structured coordination**: Agent Mail vs manual result passing
3. **Learning integration**: Outcome recording, pattern maturity
4. **Bug scanning**: Auto UBS scan on completion
5. **Explicit decomposition**: BeadTree JSON vs ad-hoc task descriptions

### Opportunities

1. **Adopt doom loop detection**: Track repeated tool calls with same args
2. **Stream progress metadata**: Real-time updates from workers to planner
3. **Session hierarchy**: Consider `parentID` tracking for swarm sessions
4. **Permission patterns**: Bash wildcard patterns for finer control
5. **Built-in explore agent**: Fast read-only search specialist

## 9. Code Paths

### Task Spawning

```
User message
  → Primary agent uses Task tool
    → task.ts:14 TaskTool.define()
      → task.ts:39 Session.create({ parentID })
        → task.ts:91 SessionPrompt.prompt()
          → prompt.ts:~300 streamText() with agent.tools
            → processor.ts:~50 SessionProcessor.create()
              → Tool execution in child session
                → Bus.subscribe() streams to parent
```

### Model Selection

```
Agent config load
  → config.ts:~60 state() merges configs
    → agent.ts:~170 builds agent registry
      → task.ts:78 agent.model ?? msg.modelID
        → prompt.ts:~200 Provider.getModel()
```

### Permission Check

```
Tool call
  → processor.ts:~120 tool-call event
    → Permission.ask() if doom loop detected
      → Agent.permission.doom_loop: "ask"|"deny"|"allow"
```

## 10. Open Questions

1. **How do they handle swarm-like parallelism?**
   - Answer: Multiple Task tool calls in single message (line 19 in task.txt: "Launch multiple agents concurrently")

2. **Do they track learning/outcomes?**
   - Answer: No - no outcome tracking or pattern maturity system found

3. **How do they prevent file conflicts?**
   - Answer: They don't - no pre-spawn file conflict detection

4. **Can subagents spawn subagents?**
   - Answer: No - `task: false` in subagent tool map (task.ts:102)

## 11. Actionable Takeaways

### For Immediate Adoption

1. ✅ **Doom loop detection**: Add to swarm_complete
2. ✅ **Permission wildcards**: Enhance archaeologist bash permissions
3. ✅ **Explore agent**: Create fast read-only search specialist

### For Future Consideration

1. **Session hierarchy**: Add `parentID` to swarm sessions for traceability
2. **Stream metadata**: Real-time worker progress via Agent Mail streaming
3. **Tool result aggregation**: Summary format like OpenCode's tool state tracking

### Not Needed (We Do Better)

- ❌ Generic task tool (our decomposition is superior)
- ❌ Manual result passing (Agent Mail is structured)
- ❌ No learning system (we track outcomes)
