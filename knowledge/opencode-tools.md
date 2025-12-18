# OpenCode Built-in Tools - Implementation Analysis

Deep dive into sst/opencode built-in tool implementations. Patterns worth adopting for our custom tools.

## Tool Architecture

### Tool Definition Pattern

```typescript
// packages/opencode/src/tool/tool.ts
Tool.define<Parameters, Metadata>(id, init);
```

**Key features:**

- Lazy initialization via `init()` function
- Zod schema validation with custom error formatting
- Type-safe context with `Context<M extends Metadata>`
- Standardized return: `{ title, output, metadata, attachments? }`
- Built-in parameter validation with helpful error messages

**Context object:**

```typescript
type Context = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal; // For cancellation
  callID?: string; // Tool invocation ID
  extra?: Record<string, any>; // Extension point
  metadata(input): void; // Streaming metadata updates
};
```

### Registry Pattern

```typescript
// packages/opencode/src/tool/registry.ts
ToolRegistry.state(async () => {
  const custom = [];
  // Scan tool/*.{js,ts} in all config directories
  for (const dir of await Config.directories()) {
    const glob = new Bun.Glob("tool/*.{js,ts}");
    // Load and register
  }
  // Load from plugins too
  return { custom };
});
```

**Patterns to adopt:**

- Scan multiple config directories
- Support both file-based and plugin-based tools
- Lazy state initialization per project instance
- Dynamic tool discovery (no manual registration)

## Read Tool

**File:** `packages/opencode/src/tool/read.ts`

### Highlights

1. **Binary file detection** (lines 162-217)
   - Extension-based allowlist (`.zip`, `.exe`, etc.)
   - Null byte check (instant binary detection)
   - Non-printable character ratio (>30% = binary)
2. **Smart file suggestions** (lines 80-91)

   ```typescript
   const dirEntries = fs.readdirSync(dir);
   const suggestions = dirEntries
     .filter(
       (entry) =>
         entry.toLowerCase().includes(base.toLowerCase()) ||
         base.toLowerCase().includes(entry.toLowerCase()),
     )
     .slice(0, 3);
   ```

3. **Line truncation** (line 17, 127)
   - Max 2000 chars per line
   - Default 2000 lines read
   - Pagination via `offset` parameter

4. **Image/PDF handling** (lines 96-118)
   - Detects MIME type
   - Returns base64 data URL as attachment
   - Separate code path for binary assets

5. **Security: .env blocking** (lines 62-73)
   - Allowlist: `.env.sample`, `.example`
   - Block: any file containing `.env`
   - Clear error message to stop retry attempts

6. **FileTime tracking** (line 150)

   ```typescript
   FileTime.read(ctx.sessionID, filepath);
   ```

   Records when file was read per session for edit protection

7. **LSP warm-up** (line 149)
   ```typescript
   LSP.touchFile(filepath, false);
   ```
   Prepares language server for future diagnostics

**Patterns to adopt:**

- Binary detection heuristics
- Smart suggestions on file not found
- Truncation with continuation hints
- Session-scoped file read tracking

## Write Tool

**File:** `packages/opencode/src/tool/write.ts`

### Highlights

1. **Must-read-first enforcement** (line 55)

   ```typescript
   if (exists) await FileTime.assert(ctx.sessionID, filepath);
   ```

   Throws if file wasn't read in this session

2. **LSP diagnostics** (lines 78-87)

   ```typescript
   await LSP.touchFile(filepath, true); // refresh=true
   const diagnostics = await LSP.diagnostics();
   // Return errors in output immediately
   ```

3. **Permission differentiation** (lines 57-69)
   - Separate permission for create vs overwrite
   - Title changes: "Create new file" vs "Overwrite this file"

4. **Event bus integration** (lines 72-74)
   ```typescript
   await Bus.publish(File.Event.Edited, { file: filepath });
   ```

**Patterns to adopt:**

- Immediate LSP feedback after write
- Event-driven file change notifications
- Create vs overwrite distinction in permissions

## Edit Tool

**File:** `packages/opencode/src/tool/edit.ts`

### Highlights

**This is the most sophisticated tool - 675 lines!**

1. **Multiple replacement strategies** (lines 176-500+)
   - `SimpleReplacer` - exact string match
   - `LineTrimmedReplacer` - ignores whitespace per line
   - `BlockAnchorReplacer` - matches first/last line + similarity scoring
   - `WhitespaceNormalizedReplacer` - normalizes all whitespace
   - `IndentationFlexibleReplacer` - ignores indentation levels
   - `EscapeNormalizedReplacer` - handles escape sequences

2. **Levenshtein distance** (lines 185-201)

   ```typescript
   function levenshtein(a: string, b: string): number;
   ```

   Used by `BlockAnchorReplacer` for fuzzy matching

3. **Similarity thresholds** (lines 179-180)

   ```typescript
   const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0.0;
   const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3;
   ```

   Lower threshold when only one match found

4. **Generator-based replacers** (line 176)

   ```typescript
   type Replacer = (content: string, find: string) => Generator<string>;
   ```

   Each strategy yields candidate matches

5. **Diff generation** (lines 109-133)

   ```typescript
   diff = trimDiff(
     createTwoFilesPatch(
       filePath,
       filePath,
       normalizeLineEndings(contentOld),
       normalizeLineEndings(contentNew),
     ),
   );
   ```

6. **Line ending normalization** (lines 21-23)
   Converts `\r\n` to `\n` before comparison

7. **Snapshot integration** (lines 152-162)
   ```typescript
   const filediff: Snapshot.FileDiff = {
     file: filePath,
     before: contentOld,
     after: contentNew,
     additions: 0,
     deletions: 0,
   };
   ```

**Patterns to adopt:**

- Multi-strategy replacement with fallbacks
- Fuzzy matching for AI-generated code
- Generator pattern for candidate enumeration
- Diff-based permission approval
- Snapshot tracking for history/rollback

## Bash Tool

**File:** `packages/opencode/src/tool/bash.ts`

### Highlights

1. **Shell detection** (lines 56-81)

   ```typescript
   const shell = iife(() => {
     const s = process.env.SHELL;
     // Reject fish/nu shells
     if (new Set(["fish", "nu"]).has(basename)) return fallback;
     // Platform-specific defaults
     if (darwin) return "/bin/zsh";
     if (win32) return process.env.COMSPEC || true;
     return Bun.which("bash") || true;
   });
   ```

2. **Tree-sitter parsing** (lines 32-51, 107)

   ```typescript
   const parser = lazy(async () => {
     const { Parser } = await import("web-tree-sitter");
     // Load bash grammar
     return p;
   });
   const tree = await parser().then((p) => p.parse(params.command));
   ```

   Parses bash AST for security analysis

3. **External directory detection** (lines 113-141, 165-184)

   ```typescript
   for (const node of tree.rootNode.descendantsOfType("command")) {
     if (["cd", "rm", "cp", "mv", ...].includes(command[0])) {
       for (const arg of command.slice(1)) {
         const resolved = await $`realpath ${arg}`.text()
         await checkExternalDirectory(resolved)
       }
     }
   }
   ```

   Resolves paths and checks if outside working directory

4. **Permission wildcards** (lines 188-206)

   ```typescript
   const action = Wildcard.allStructured(
     { head: command[0], tail: command.slice(1) },
     permissions
   )
   if (action === "deny") throw new Error(...)
   if (action === "ask") askPatterns.add(pattern)
   ```

5. **Process management** (lines 225-292)
   - Cross-platform process tree killing
   - Windows: `taskkill /f /t`
   - Unix: negative PID for process group
   - Graceful SIGTERM → SIGKILL after 200ms
   - Detached mode on Unix

6. **Streaming metadata** (lines 238-255)

   ```typescript
   ctx.metadata({ metadata: { output: "", description } });
   const append = (chunk: Buffer) => {
     output += chunk.toString();
     ctx.metadata({ metadata: { output, description } });
   };
   proc.stdout?.on("data", append);
   proc.stderr?.on("data", append);
   ```

7. **Timeout handling** (lines 306-328)
   - Separate abort signal and timeout
   - Cleanup on exit/error
   - Metadata flags: `timedOut`, `aborted`

8. **Output truncation** (line 19, 332-335)

   ```typescript
   const MAX_OUTPUT_LENGTH = 30_000;
   if (output.length > MAX_OUTPUT_LENGTH) {
     output = output.slice(0, MAX_OUTPUT_LENGTH);
     resultMetadata.push("bash tool truncated output...");
   }
   ```

9. **Windows Git Bash path normalization** (lines 175-179)
   ```typescript
   const normalized =
     process.platform === "win32" && resolved.match(/^\/[a-z]\//)
       ? resolved
           .replace(/^\/([a-z])\//, (_, drive) => `${drive.toUpperCase()}:\\`)
           .replace(/\//g, "\\")
       : resolved;
   ```

**Patterns to adopt:**

- AST-based security scanning
- Command-specific path resolution
- Streaming metadata during execution
- Cross-platform process tree management
- Graceful degradation (SIGTERM → SIGKILL)
- Wildcard-based permission matching
- Output size limits with metadata

## Glob Tool

**File:** `packages/opencode/src/tool/glob.ts`

### Highlights

1. **Ripgrep integration** (lines 26-43)

   ```typescript
   for await (const file of Ripgrep.files({
     cwd: search,
     glob: [params.pattern],
   })) {
     const stats = await Bun.file(full).stat();
     files.push({ path: full, mtime: stats.mtime.getTime() });
   }
   ```

2. **Modification time sorting** (line 44)

   ```typescript
   files.sort((a, b) => b.mtime - a.mtime);
   ```

   Most recently modified files first

3. **Hard limit** (line 23, 30-32)
   - Max 100 files
   - Truncation message if exceeded

**Patterns to adopt:**

- Ripgrep for fast file listing
- mtime-based sorting for relevance
- Hard limits with truncation messages

## Grep Tool

**File:** `packages/opencode/src/tool/grep.ts`

### Highlights

1. **Direct ripgrep spawn** (lines 24-38)

   ```typescript
   const args = [
     "-nH",
     "--field-match-separator=|",
     "--regexp",
     params.pattern,
   ];
   if (params.include) args.push("--glob", params.include);
   const proc = Bun.spawn([rgPath, ...args], { stdout: "pipe" });
   ```

2. **Exit code handling** (lines 40-50)
   - Exit 1 = no matches (not an error)
   - Exit 0 = success
   - Other = actual error

3. **Custom field separator** (line 25, 58)

   ```typescript
   --field-match-separator=|
   const [filePath, lineNumStr, ...lineTextParts] = line.split("|")
   ```

   Avoids ambiguity with `:` in paths/content

4. **mtime sorting** (lines 75-76)
   Most recently modified files first (same as glob)

**Patterns to adopt:**

- Custom field separator for parsing
- Exit code semantics (1 = no results ≠ error)
- mtime-based relevance sorting

## Task Tool

**File:** `packages/opencode/src/tool/task.ts`

### Highlights

1. **Subagent selection** (lines 14-21)

   ```typescript
   const agents = await Agent.list().then((x) =>
     x.filter((a) => a.mode !== "primary"),
   );
   const description = DESCRIPTION.replace(
     "{agents}",
     agents.map((a) => `- ${a.name}: ${a.description}`).join("\n"),
   );
   ```

   Dynamic agent list in tool description

2. **Session hierarchy** (lines 33-43)

   ```typescript
   return await Session.create({
     parentID: ctx.sessionID,
     title: params.description + ` (@${agent.name} subagent)`,
   });
   ```

3. **Model inheritance** (lines 78-81)

   ```typescript
   const model = agent.model ?? {
     modelID: msg.info.modelID,
     providerID: msg.info.providerID,
   };
   ```

   Uses parent's model if agent doesn't specify

4. **Tool restrictions** (lines 99-105)

   ```typescript
   tools: {
     todowrite: false,
     todoread: false,
     task: false,  // Prevent recursive subagents
     ...agent.tools,
   }
   ```

5. **Event-driven progress tracking** (lines 55-76)

   ```typescript
   const unsub = Bus.subscribe(MessageV2.Event.PartUpdated, async (evt) => {
     if (evt.properties.part.type !== "tool") return;
     parts[part.id] = { id, tool, state };
     ctx.metadata({ metadata: { summary: Object.values(parts) } });
   });
   ```

6. **Abort propagation** (lines 83-87)

   ```typescript
   function cancel() {
     SessionPrompt.cancel(session.id);
   }
   ctx.abort.addEventListener("abort", cancel);
   using _ = defer(() => ctx.abort.removeEventListener("abort", cancel));
   ```

7. **Session ID in metadata** (line 123)
   Returns `session_id` for continuation

**Patterns to adopt:**

- Dynamic tool descriptions
- Session hierarchy for tracking
- Model inheritance
- Recursive tool prevention
- Event-driven progress streaming
- Abort signal propagation
- Session continuation support

## WebFetch Tool

**File:** `packages/opencode/src/tool/webfetch.ts`

### Highlights

1. **Timeout handling** (lines 8-10, 42-45)

   ```typescript
   const DEFAULT_TIMEOUT = 30 * 1000;
   const MAX_TIMEOUT = 120 * 1000;
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), timeout);
   ```

2. **URL validation** (lines 22-25)

   ```typescript
   if (
     !params.url.startsWith("http://") &&
     !params.url.startsWith("https://")
   ) {
     throw new Error("URL must start with http:// or https://");
   }
   ```

3. **Content negotiation** (lines 47-62)

   ```typescript
   switch (params.format) {
     case "markdown":
       acceptHeader = "text/markdown;q=1.0, text/x-markdown;q=0.9, ...";
     case "text":
       acceptHeader = "text/plain;q=1.0, ...";
   }
   ```

   Quality parameters for fallback content types

4. **Size limits** (lines 8, 81-89)

   ```typescript
   const MAX_RESPONSE_SIZE = 5 * 1024 * 1024
   if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
     throw new Error("Response too large (exceeds 5MB limit)")
   }
   // Check again after download
   if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) throw ...
   ```

5. **HTML to Markdown conversion** (lines 177-187)

   ```typescript
   const turndownService = new TurndownService({
     headingStyle: "atx",
     bulletListMarker: "-",
     codeBlockStyle: "fenced",
   });
   turndownService.remove(["script", "style", "meta", "link"]);
   ```

6. **HTML text extraction** (lines 145-175)

   ```typescript
   const rewriter = new HTMLRewriter()
     .on("script, style, noscript, iframe, object, embed", {
       element() {
         skipContent = true;
       },
     })
     .on("*", {
       text(input) {
         if (!skipContent) text += input.text;
       },
     });
   ```

7. **Abort signal composition** (line 65)
   ```typescript
   signal: AbortSignal.any([controller.signal, ctx.abort]);
   ```
   Both timeout and user abort

**Patterns to adopt:**

- Content negotiation with q-values
- Double size checking (header + actual)
- TurndownService for HTML→Markdown
- HTMLRewriter for text extraction
- AbortSignal composition
- Clear size limits upfront

## Todo Tools

**File:** `packages/opencode/src/tool/todo.ts`

### Highlights

1. **Simple CRUD** (lines 6-24)

   ```typescript
   TodoWriteTool: params: {
     todos: z.array(Todo.Info);
   }
   TodoReadTool: params: z.object({}); // no params
   ```

2. **Count in title** (lines 17, 32)

   ```typescript
   title: `${
     params.todos.filter((x) => x.status !== "completed").length
   } todos`;
   ```

3. **Session-scoped state** (lines 12-13, 30)
   ```typescript
   await Todo.update({ sessionID, todos });
   const todos = await Todo.get(sessionID);
   ```

**Patterns to adopt:**

- Session-scoped state for ephemeral data
- Summary in title for tool history
- Separate read/write tools for clarity

## FileTime Module

**File:** `packages/opencode/src/file/time.ts`

### Highlights

**Session-scoped file access tracking**

1. **State structure** (lines 6-15)

   ```typescript
   const read: {
     [sessionID: string]: {
       [path: string]: Date | undefined;
     };
   } = {};
   ```

2. **Record read** (lines 17-22)

   ```typescript
   function read(sessionID: string, file: string) {
     read[sessionID] = read[sessionID] || {};
     read[sessionID][file] = new Date();
   }
   ```

3. **Modification check** (lines 28-36)
   ```typescript
   async function assert(sessionID: string, filepath: string) {
     const time = get(sessionID, filepath);
     if (!time)
       throw new Error(
         `You must read the file ${filepath} before overwriting it`,
       );
     const stats = await Bun.file(filepath).stat();
     if (stats.mtime.getTime() > time.getTime()) {
       throw new Error(`File ${filepath} has been modified since...`);
     }
   }
   ```

**Patterns to adopt:**

- Session-scoped read tracking
- mtime-based concurrent modification detection
- Clear error messages with timestamps

## Permission System

**File:** `packages/opencode/src/permission/index.ts`

### Highlights

1. **Pattern-based permissions** (lines 13-20)

   ```typescript
   function toKeys(pattern: string | string[], type: string): string[];
   function covered(keys: string[], approved: Record<string, boolean>);
   // Uses Wildcard.match for pattern matching
   ```

2. **Permission state** (lines 55-75)

   ```typescript
   const pending: {
     [sessionID]: { [permissionID]: { info; resolve; reject } };
   };
   const approved: {
     [sessionID]: { [permissionID]: boolean };
   };
   ```

3. **Response modes** (line 144)

   ```typescript
   Response = z.enum(["once", "always", "reject"]);
   ```

4. **Plugin integration** (lines 122-131)

   ```typescript
   const result = await Plugin.trigger("permission.ask", info, {
     status: "ask"
   })
   switch (result.status) {
     case "deny": throw new RejectedError(...)
     case "allow": return
   }
   ```

5. **Pattern propagation** (lines 163-180)

   ```typescript
   if (input.response === "always") {
     // Approve pattern
     for (const k of approveKeys) {
       approved[sessionID][k] = true;
     }
     // Auto-approve pending matching this pattern
     for (const item of Object.values(pending[sessionID])) {
       if (covered(itemKeys, approved[sessionID])) {
         respond({ response: "always" });
       }
     }
   }
   ```

6. **Custom error class** (lines 184-198)
   ```typescript
   class RejectedError extends Error {
     constructor(
       public readonly sessionID: string,
       public readonly permissionID: string,
       public readonly toolCallID?: string,
       public readonly metadata?: Record<string, any>,
       public readonly reason?: string,
     ) { ... }
   }
   ```

**Patterns to adopt:**

- Pattern-based permission matching (wildcards)
- Session-scoped approval state
- "Always allow this pattern" propagation
- Plugin interception for custom policies
- Rich error context (sessionID, callID, metadata)

## Key Takeaways

### 1. **State Management**

- Use `Instance.state()` for per-project state
- Session-scoped tracking (FileTime, Todo)
- Clean separation: pending vs approved (Permission)

### 2. **Security Patterns**

- AST parsing for command analysis (Bash)
- Path resolution and external directory checks
- Pattern-based permission system with wildcards
- "Once" vs "Always" approval modes
- Plugin hooks for custom policies

### 3. **Error Handling**

- Custom error classes with rich context
- Helpful suggestions on failure (Read tool)
- Clear distinction: no results ≠ error (Grep exit 1)
- Timestamp-based conflict detection

### 4. **Performance**

- Lazy initialization (`lazy()` helper)
- Streaming metadata during execution (Bash, Task)
- Hard limits with truncation messages (Glob, Grep, Bash)
- Modification time sorting for relevance

### 5. **User Experience**

- Tool history titles (e.g., "5 todos")
- Truncation hints: "Use offset parameter to read beyond line X"
- Clear permission prompts with diffs (Edit tool)
- Progress tracking via event bus (Task tool)

### 6. **Extensibility**

- Tool.define() for consistent structure
- Plugin system for custom tools
- Event bus for loose coupling
- Abort signal propagation
- Context.metadata() for streaming updates

### 7. **Platform Support**

- Cross-platform process management (Bash)
- Shell detection with fallbacks
- Windows path normalization
- Platform-specific defaults

### Patterns to Avoid in Our Tools

1. **Don't**: Hardcode file paths or assume Unix-only
   - **Do**: Use `path.join()`, `path.isAbsolute()`, platform checks

2. **Don't**: Ignore abort signals
   - **Do**: Propagate `ctx.abort` to all async operations

3. **Don't**: Return unlimited output
   - **Do**: Set hard limits, truncate with metadata

4. **Don't**: Silent failures
   - **Do**: Clear error messages with suggestions

5. **Don't**: Forget session context
   - **Do**: Track state per `ctx.sessionID`

### Immediate Improvements for Our Tools

1. **bd-quick.ts** → Add streaming metadata for long operations
2. **git-context.ts** → Implement mtime sorting for changed files
3. **ubs.ts** → Add pattern-based permission for scan scope
4. **typecheck.ts** → Stream errors as they're discovered
5. **All tools** → Adopt `Tool.define()` pattern for consistency
6. **All tools** → Add abort signal handling
7. **All tools** → Add output size limits with truncation

## Streaming Metadata API

### Availability for Plugins

**Status: NOT AVAILABLE** ❌

The `ctx.metadata()` streaming API is **only available to OpenCode's built-in tools**, not to plugin tools.

### Evidence

1. **Plugin ToolContext type** (`@opencode-ai/plugin/dist/tool.d.ts`):

   ```typescript
   export type ToolContext = {
     sessionID: string;
     messageID: string;
     agent: string;
     abort: AbortSignal;
   };
   ```

   No `metadata` method.

2. **Built-in tools use extended context**:
   Built-in tools (Bash, Task) use `ctx.metadata()` with an internal context type that extends the public `ToolContext` interface.

   Example from Bash tool (line 298):

   ```typescript
   ctx.metadata({ metadata: { output: "", description } });
   const append = (chunk: Buffer) => {
     output += chunk.toString();
     ctx.metadata({ metadata: { output, description } });
   };
   ```

   Example from Task tool (line 479):

   ```typescript
   ctx.metadata({ metadata: { summary: Object.values(parts) } });
   ```

3. **Internal context type** (from opencode-tools.md line 22-34):
   ```typescript
   type Context = {
     sessionID: string;
     messageID: string;
     agent: string;
     abort: AbortSignal;
     callID?: string;
     extra?: Record<string, any>;
     metadata(input): void; // ← Only in internal context
   };
   ```

### Limitation Impact

**What we can't do in plugins:**

- Real-time progress updates during long operations
- Stream incremental output before tool completes
- Show live status during multi-step processes

**Workarounds:**

1. **Return progress in final output** - accumulate status and return comprehensive summary
2. **Use Agent Mail for coordination** - send progress messages to other agents
3. **Use hive_update** - update cell descriptions with progress checkpoints

### Example: How Built-in Tools Use It

**Bash tool** (streaming command output):

```typescript
// Initialize with empty output
ctx.metadata({ metadata: { output: "", description } });

// Stream chunks as they arrive
proc.stdout?.on("data", (chunk) => {
  output += chunk.toString();
  ctx.metadata({ metadata: { output, description } });
});
```

**Task tool** (streaming subtask progress):

```typescript
const parts = {};
Bus.subscribe(MessageV2.Event.PartUpdated, async (evt) => {
  parts[part.id] = { id, tool, state };
  ctx.metadata({ metadata: { summary: Object.values(parts) } });
});
```

### Feature Request?

If streaming metadata becomes critical for plugin tools, this would need to be added to the `@opencode-ai/plugin` package by the OpenCode team. The plugin would need:

1. Extended `ToolContext` type with `metadata()` method
2. Infrastructure to handle streaming updates from plugin processes
3. UI support for displaying streaming metadata from plugins

Currently, plugin tools are limited to returning a single string result at completion.

### Next Steps

- Implement `Tool.define()` wrapper for our custom tools
- Add FileTime-like tracking for beads state
- Create Permission patterns for Agent Mail reservations
- ~~Add streaming progress to swarm operations~~ (NOT POSSIBLE - no ctx.metadata)
- Implement mtime-based sorting in cass search results
- **Workaround**: Use Agent Mail for progress reporting in swarm tools
