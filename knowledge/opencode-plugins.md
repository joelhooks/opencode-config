# OpenCode Plugin System Architecture

**Analysis Date:** 2025-12-11  
**Source:** sst/opencode @ github.com  
**Analyzed by:** FuchsiaCastle (opencode-pnt.1)

## Executive Summary

OpenCode uses a lightweight, filesystem-based plugin architecture with automatic discovery via Bun.Glob. The system has four primary extension points: **plugins** (TypeScript/npm), **tools** (local TypeScript), **agents** (markdown), and **commands** (markdown). MCP servers integrate as external tool sources via AI SDK's experimental MCP client.

## Core Architecture

### Plugin Discovery & Loading

**Location:** `packages/opencode/src/plugin/index.ts`

Plugins are loaded via `Instance.state` (lazy singleton per project instance):

```typescript
const state = Instance.state(async () => {
  const plugins = [...(config.plugin ?? [])];

  // Default plugins (unless disabled via flag)
  if (!Flag.OPENCODE_DISABLE_DEFAULT_PLUGINS) {
    plugins.push("opencode-copilot-auth@0.0.9");
    plugins.push("opencode-anthropic-auth@0.0.5");
  }

  for (let plugin of plugins) {
    if (!plugin.startsWith("file://")) {
      // npm package: parse name@version, install via BunProc
      const lastAtIndex = plugin.lastIndexOf("@");
      const pkg = lastAtIndex > 0 ? plugin.substring(0, lastAtIndex) : plugin;
      const version =
        lastAtIndex > 0 ? plugin.substring(lastAtIndex + 1) : "latest";
      plugin = await BunProc.install(pkg, version);
    }
    const mod = await import(plugin);
    for (const [_name, fn] of Object.entries<PluginInstance>(mod)) {
      const init = await fn(input);
      hooks.push(init);
    }
  }
});
```

**Plugin Input Context:**

- `client`: OpenCode SDK client (HTTP client hitting localhost:4096)
- `project`: Project metadata
- `worktree`: Git worktree info
- `directory`: Current working directory
- `$`: Bun shell (`Bun.$`)

### Plugin Interface

**Location:** `packages/plugin/src/index.ts`

```typescript
export type Plugin = (input: PluginInput) => Promise<Hooks>;

export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>;
  config?: (input: Config) => Promise<void>;
  tool?: { [key: string]: ToolDefinition };
  auth?: AuthHook;
  "chat.message"?: (input, output) => Promise<void>;
  "chat.params"?: (input, output) => Promise<void>;
  "permission.ask"?: (input, output) => Promise<void>;
  "tool.execute.before"?: (input, output) => Promise<void>;
  "tool.execute.after"?: (input, output) => Promise<void>;
  "experimental.text.complete"?: (input, output) => Promise<void>;
}
```

**Hook Execution Pattern:**

- Plugins return a `Hooks` object
- `Plugin.trigger()` iterates all loaded plugin hooks for a given lifecycle event
- Hooks mutate `output` parameter in-place (no return value needed)

**Example Usage:**

```typescript
await Plugin.trigger(
  "tool.execute.before",
  { tool: "bash", sessionID, callID },
  { args: { command: "ls" } },
);
```

## Tool System

### Tool Definition Schema

**Location:** `packages/plugin/src/tool.ts`

```typescript
export type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

export function tool<Args extends z.ZodRawShape>(input: {
  description: string;
  args: Args;
  execute(
    args: z.infer<z.ZodObject<Args>>,
    context: ToolContext,
  ): Promise<string>;
}) {
  return input;
}
tool.schema = z;

export type ToolDefinition = ReturnType<typeof tool>;
```

**Key Properties:**

- Tools use Zod for argument validation (`tool.schema` = `z`)
- Execute function is async, returns string
- Context includes session tracking + abort signal

### Tool Discovery

**Location:** `packages/opencode/src/tool/registry.ts`

Tools are discovered from two sources:

1. **Local TypeScript files** (`tool/*.{ts,js}`):

```typescript
const glob = new Bun.Glob("tool/*.{js,ts}");
for (const dir of await Config.directories()) {
  for await (const match of glob.scan({ cwd: dir, absolute: true })) {
    const namespace = path.basename(match, path.extname(match));
    const mod = await import(match);
    for (const [id, def] of Object.entries<ToolDefinition>(mod)) {
      custom.push(
        fromPlugin(id === "default" ? namespace : `${namespace}_${id}`, def),
      );
    }
  }
}
```

2. **Plugin hooks** (`plugin.tool`):

```typescript
const plugins = await Plugin.list();
for (const plugin of plugins) {
  for (const [id, def] of Object.entries(plugin.tool ?? {})) {
    custom.push(fromPlugin(id, def));
  }
}
```

**Tool Naming Convention:**

- If export is `default`, tool ID = filename
- Otherwise: `${filename}_${exportName}`
- Example: `tool/typecheck.ts` with `export default tool({...})` → `typecheck`
- Example: `tool/git.ts` with `export const status = tool({...})` → `git_status`

### Built-in vs Custom Tools

Built-in tools (always available):

- `bash`, `read`, `glob`, `grep`, `list`, `edit`, `write`, `task`, `webfetch`, etc.

Custom tools (from config directories + plugins) are appended after built-ins.

**Tool Registration:**

- Registry maintains a single array: `[...builtins, ...custom]`
- Later tools can override earlier ones via `ToolRegistry.register()`

## Command System

### Command Definition

**Location:** `packages/opencode/src/config/config.ts`

```typescript
export const Command = z.object({
  template: z.string(),
  description: z.string().optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  subtask: z.boolean().optional(),
});
```

**Storage:** Markdown files in `command/*.md` with frontmatter

Example:

```markdown
---
agent: swarm-planner
description: Decompose task into parallel beads
---

You are the swarm coordinator...
```

### Command Discovery

**Location:** `packages/opencode/src/config/config.ts` (line ~180)

```typescript
const COMMAND_GLOB = new Bun.Glob("command/*.md");
async function loadCommand(dir: string) {
  const result: Record<string, Command> = {};
  for await (const item of COMMAND_GLOB.scan({ cwd: dir, absolute: true })) {
    const md = await ConfigMarkdown.parse(item);
    const name = path.basename(item, ".md");
    const config = {
      name,
      ...md.data,
      template: md.content.trim(),
    };
    const parsed = Command.safeParse(config);
    if (parsed.success) {
      result[config.name] = parsed.data;
    }
  }
  return result;
}
```

**Key Details:**

- Commands are invoked as `/command-name` in chat
- `template` is the markdown body (injected into user message)
- `agent` specifies which agent runs the command
- `subtask: true` marks it as a Task-spawnable command

## Agent System

### Agent Definition

**Location:** `packages/opencode/src/config/config.ts`

```typescript
export const Agent = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  prompt: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  disable: z.boolean().optional(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  maxSteps: z.number().int().positive().optional(),
  permission: z
    .object({
      edit: Permission.optional(),
      bash: z.union([Permission, z.record(z.string(), Permission)]).optional(),
      webfetch: Permission.optional(),
      doom_loop: Permission.optional(),
      external_directory: Permission.optional(),
    })
    .optional(),
});
```

**Storage:** Markdown files in `agent/**/*.md` (supports nested directories)

### Agent Discovery

**Location:** `packages/opencode/src/config/config.ts` (line ~218)

```typescript
const AGENT_GLOB = new Bun.Glob("agent/**/*.md");
async function loadAgent(dir: string) {
  for await (const item of AGENT_GLOB.scan({ cwd: dir, absolute: true })) {
    const md = await ConfigMarkdown.parse(item);

    // Nested path support
    let agentName = path.basename(item, ".md");
    const agentFolderPath = item.includes("/.opencode/agent/")
      ? item.split("/.opencode/agent/")[1]
      : item.split("/agent/")[1];

    if (agentFolderPath.includes("/")) {
      const relativePath = agentFolderPath.replace(".md", "");
      const pathParts = relativePath.split("/");
      agentName =
        pathParts.slice(0, -1).join("/") +
        "/" +
        pathParts[pathParts.length - 1];
    }

    const config = {
      name: agentName,
      ...md.data,
      prompt: md.content.trim(),
    };
    result[config.name] = parsed.data;
  }
}
```

**Mode Types:**

- `subagent`: Available via Task tool or `/agent` command
- `primary`: Available as primary chat agent
- `all`: Both

**Nested Agents:**

- `agent/swarm/planner.md` → name = `swarm/planner`
- Allows organizational hierarchy

### Mode vs Agent

**Modes** are primary agents stored in `mode/*.md`:

- Always `mode: "primary"`
- Shown in model picker UI
- Example: `mode/architect.md`

**Agents** are typically subagents:

- Default `mode: "subagent"`
- Invoked via commands or Task tool

## MCP Integration

### MCP Server Configuration

**Location:** `packages/opencode/src/config/config.ts`

```typescript
mcp: z.record(z.string(), Mcp).optional();

// Local MCP Server
export const McpLocal = z.object({
  type: z.literal("local"),
  command: z.string().array(),
  environment: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
});

// Remote MCP Server
export const McpRemote = z.object({
  type: z.literal("remote"),
  url: z.string(),
  enabled: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  oauth: z.union([McpOAuth, z.literal(false)]).optional(),
  timeout: z.number().int().positive().optional(),
});
```

**Example Config:**

```json
{
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "@executeautomation/chrome-mcp"],
      "enabled": true
    },
    "next-devtools": {
      "type": "remote",
      "url": "http://localhost:3000/_next/mcp",
      "oauth": false
    }
  }
}
```

### MCP Client Lifecycle

**Location:** `packages/opencode/src/mcp/index.ts`

```typescript
const state = Instance.state(async () => {
  const config = cfg.mcp ?? {};
  const clients: Record<string, Client> = {};
  const status: Record<string, Status> = {};

  await Promise.all(
    Object.entries(config).map(async ([key, mcp]) => {
      if (mcp.enabled === false) {
        status[key] = { status: "disabled" };
        return;
      }

      const result = await create(key, mcp).catch(() => undefined);
      status[key] = result.status;

      if (result.mcpClient) {
        clients[key] = result.mcpClient;
      }
    }),
  );

  return { clients, status };
});
```

**Transport Selection:**

- `local`: StdioClientTransport (spawns subprocess)
- `remote` + SSE: SSEClientTransport
- `remote` + HTTP: StreamableHTTPClientTransport

**OAuth Flow:**

1. If `needs_auth` status, MCP server returned 401
2. Check if dynamic client registration needed (RFC 7591)
3. Store pending transport in `pendingOAuthTransports` map
4. Expose OAuth callback handler at `/api/oauth/callback/:serverName`
5. After auth completes, resume MCP client initialization

**Tool Discovery:**

- MCP tools are fetched via `client.listTools()` with timeout (default 5s)
- Tools are prefixed with server name: `${serverName}_${toolName}`
- MCP tools appear alongside built-in and custom tools

## Configuration Hierarchy

**Directories searched (priority order):**

1. `~/.opencode/` (global config)
2. `./.opencode/` (project-local config)

**Config Merge Strategy:**

- `agent`, `command`, `mode`: Deep merge (Config.directories() aggregates all)
- `plugin`: Array concatenation + deduplication
- `mcp`: Object merge (deep merge)
- `tools`: Object merge

**Plugin Sources:**

1. Config file: `opencode.json` → `plugin: ["pkg@version", "file://..."]`
2. Filesystem: `plugin/*.{ts,js}` → auto-discovered as `file://` URLs
3. Default plugins: `opencode-copilot-auth@0.0.9`, `opencode-anthropic-auth@0.0.5`

## Comparison to Our Local Setup

### Similarities

✅ Markdown-based agents/commands with frontmatter  
✅ Filesystem-based tool discovery (`tool/*.ts`)  
✅ Config hierarchy (global + project-local)  
✅ MCP integration for external tools

### Differences

| Aspect             | sst/opencode                                    | Our Setup                     |
| ------------------ | ----------------------------------------------- | ----------------------------- |
| **Plugin System**  | Full npm package support + lifecycle hooks      | No plugins (just local tools) |
| **Tool Discovery** | `tool/*.{ts,js}` + plugin.tool                  | `tool/*.ts` only              |
| **Agent Format**   | `agent/**/*.md` (nested support)                | `agent/*.md` (flat)           |
| **Command Format** | `command/*.md` with `template`                  | `command/*.md` (same)         |
| **MCP Config**     | `config.mcp` object with OAuth support          | Direct MCP server config      |
| **Tool Naming**    | Smart: `filename_exportName` or just `filename` | Export name only              |
| **Auth Plugins**   | Dedicated auth hooks (OAuth flow)               | No auth plugin system         |

### Gaps in Our Setup

1. **No Plugin System**: We can't install npm packages as plugins with lifecycle hooks
2. **No Auth Hooks**: Can't extend authentication (e.g., custom OAuth providers)
3. **No Tool Lifecycle Hooks**: Can't intercept tool execution (before/after)
4. **No Event Bus**: OpenCode has `Bus.subscribeAll()` for plugin event subscription
5. **Flat Agent Structure**: No nested agent directories (`agent/swarm/planner.md`)

### Opportunities for Improvement

1. **Plugin System**:
   - Add `plugin/*.ts` discovery with `export default Plugin = async (input) => ({ ... })`
   - Implement minimal hooks: `tool`, `config`, `event`
   - Keep it lightweight (no npm package support initially)

2. **Nested Agents**:
   - Change glob from `agent/*.md` to `agent/**/*.md`
   - Use folder structure for namespacing: `agent/swarm/planner.md` → `swarm/planner`

3. **Tool Lifecycle Hooks**:
   - Wrap tool execute in `tool/registry.ts` to call plugin hooks
   - Useful for logging, metrics, input validation

4. **Smart Tool Naming**:
   - If export is `default`, use filename as tool ID
   - Otherwise: `${filename}_${exportName}`
   - Cleaner than always requiring `${filename}_${exportName}`

5. **MCP OAuth Support**:
   - Add `oauth` config to MCP server definitions
   - Implement callback handler at `/api/oauth/callback/:serverName`
   - Store pending transports until auth completes

## Implementation Notes

### Plugin Hook Execution Pattern

OpenCode's hook pattern is elegant:

```typescript
// In session/prompt.ts (wrapping tool execute)
item.execute = async (args, opts) => {
  await Plugin.trigger(
    "tool.execute.before",
    { tool: id, sessionID, callID },
    { args },
  );

  const result = await execute(args, opts);

  await Plugin.trigger(
    "tool.execute.after",
    { tool: id, sessionID, callID },
    { title, output, metadata },
  );

  return result;
};
```

Hooks mutate output in-place (no return value), making composition simple.

### Tool Registry Pattern

Registry uses lazy singleton per project instance:

```typescript
export const state = Instance.state(async () => {
  const custom = [];
  // discover local tools
  // discover plugin tools
  return { custom };
});
```

This ensures:

- Tools are loaded once per project
- Different projects can have different tool sets
- No global state pollution

### Agent Loading Strategy

Agents are loaded lazily via `Agent.state`:

```typescript
const state = Instance.state(async () => {
  const cfg = await Config.get();
  const agents = mergeDeep(builtInAgents, cfg.agent ?? {});
  // apply defaults, permissions, etc.
  return { agents };
});
```

Built-in agents are hardcoded, user agents override/extend.

## Recommended Next Steps

1. **Spike: Minimal Plugin System**
   - Add `plugin/*.ts` discovery
   - Implement `tool` and `config` hooks only
   - Test with a simple plugin that adds a custom tool

2. **Nested Agent Support**
   - Update glob pattern to `agent/**/*.md`
   - Update agent name extraction logic
   - Test with `agent/swarm/planner.md`

3. **Smart Tool Naming**
   - Update tool registry to check if export is `default`
   - Use filename as ID if default, else `${filename}_${exportName}`
   - Update existing tools to use default export where appropriate

4. **Tool Lifecycle Hooks**
   - Add `Plugin.trigger()` calls before/after tool execution
   - Implement in session/prompt.ts where tools are wrapped
   - Use for logging/metrics initially

5. **Documentation**
   - Document plugin interface in knowledge/
   - Create example plugin in plugin/example.ts
   - Add plugin development guide

## Open Questions

1. **Plugin Package Management**: Should we support npm packages like OpenCode, or stick to local `plugin/*.ts` files?
2. **Auth Plugin Priority**: Do we need auth plugins, or is MCP OAuth enough?
3. **Event Bus**: Should we implement a full event bus, or just plugin hooks?
4. **Plugin Versioning**: How do we handle plugin version conflicts if we support npm packages?
5. **Plugin Sandboxing**: Should plugins run in a restricted context, or trust local code?

## References

- **Main Plugin Code**: `packages/opencode/src/plugin/index.ts`
- **Plugin Interface**: `packages/plugin/src/index.ts`
- **Tool System**: `packages/opencode/src/tool/registry.ts`
- **Config Loading**: `packages/opencode/src/config/config.ts`
- **MCP Integration**: `packages/opencode/src/mcp/index.ts`
- **Agent System**: `packages/opencode/src/agent/agent.ts`

## Conclusion

OpenCode's plugin system is production-ready, battle-tested, and elegant. Key takeaways:

1. **Filesystem-first**: Tools, agents, commands discovered via glob patterns
2. **Hook-based extensibility**: Plugins return hooks, no inheritance or classes
3. **Context preservation**: Tools get abort signals, session IDs, agent names
4. **Type-safe**: Zod schemas for everything (tools, config, MCP)
5. **Instance-scoped**: All state is per-project via `Instance.state`

Our local setup is 80% there. Main gaps: plugin system, nested agents, tool lifecycle hooks. All addressable with targeted spikes.
