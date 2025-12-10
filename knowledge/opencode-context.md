# OpenCode Session & Context Management

Deep analysis of sst/opencode session, context window, and history management from repo autopsy.

## Storage Architecture

**Location**: `~/.local/share/opencode/storage/` (or `Global.Path.data`)

**File-based JSON storage** with hierarchical keys:

```
storage/
├── session/{projectID}/{sessionID}.json    # Session metadata
├── message/{sessionID}/{messageID}.json    # Message info
├── part/{messageID}/{partID}.json          # Message parts (text, tool calls, etc.)
├── session_diff/{sessionID}.json           # File diffs for session
└── share/{sessionID}.json                  # Share info (if shared)
```

**Key characteristics**:

- Uses Bun.Glob for fast scanning
- Locking via `Lock.read()`/`Lock.write()` for concurrency
- Migration system for schema changes (see `MIGRATIONS` array)
- All writes are formatted JSON (`JSON.stringify(content, null, 2)`)
- Identifiers are descending timestamps for sessions, ascending for messages/parts

## Session Lifecycle

### Creation

```typescript
Session.create({ parentID?, title? })
  → createNext({ id, title, parentID, directory })
  → Storage.write(["session", projectID, sessionID], sessionInfo)
  → Auto-share if config.share === "auto" or OPENCODE_AUTO_SHARE flag
```

**Session.Info structure**:

- `id`: Descending identifier (newest first)
- `projectID`: Git root commit hash (for project identity)
- `directory`: Working directory (may differ from git root)
- `parentID`: For forked/child sessions
- `title`: Auto-generated or custom
- `version`: CLI version that created it
- `time.created`, `time.updated`, `time.compacting`: Timestamps
- `summary`: { additions, deletions, files, diffs? }
- `share`: { url } if shared
- `revert`: Snapshot info for revert capability

### Message Flow

1. **User message** created via `SessionPrompt.prompt()`
2. Parts added (text, file, agent, subtask)
3. System prompt constructed (`SystemPrompt.*`)
4. **Assistant message** created, processor streams response
5. Parts updated as stream chunks arrive (text deltas, tool calls)
6. Token usage calculated from `LanguageModelUsage`
7. Cost computed from model pricing
8. Summary generated asynchronously

## Context Window Management

### Token Estimation

**Ultra-simple**: `Token.estimate(text) = Math.round(text.length / 4)`

- No actual tokenizer, just character count / 4
- Used for pruning decisions, not precise

### Output Token Budget

```typescript
OUTPUT_TOKEN_MAX = 32_000;
```

Adjustable per model:

```typescript
const output = Math.min(model.limit.output, OUTPUT_TOKEN_MAX);
const usable = model.limit.context - output;
```

### Overflow Detection

```typescript
SessionCompaction.isOverflow({ tokens, model });
```

Triggers when:

```typescript
const count = tokens.input + tokens.cache.read + tokens.output;
const usable = context - output;
return count > usable;
```

Disabled via `OPENCODE_DISABLE_AUTOCOMPACT` flag.

### Compaction Strategy (Auto-Summarization)

**When triggered**:

- Automatically when `isOverflow()` returns true
- Manually via compaction part in user message
- Creates a new assistant message with `summary: true`

**Process** (`SessionCompaction.process`):

1. Takes existing conversation messages
2. Filters out aborted/error-only messages
3. Sends to model with special system prompt:
   ```
   "Summarize our conversation above. This summary will be the only
   context available when the conversation continues, so preserve
   critical information including: what was accomplished, current
   work in progress, files involved, next steps, and any key user
   requests or constraints. Be concise but detailed enough that
   work can continue seamlessly."
   ```
4. Creates assistant message with `summary: true` flag
5. If `auto: true` and model continues, adds synthetic "Continue if you have next steps"

**filterCompacted()**: When loading history, stops at first completed compaction:

```typescript
// Streams messages backwards (newest first)
// Stops when it hits a user message with compaction part
// that has a completed summary assistant response
```

### Pruning (Tool Output Truncation)

**Separate from compaction** - runs after every conversation loop.

**Strategy**:

```typescript
PRUNE_MINIMUM = 20_000; // tokens
PRUNE_PROTECT = 40_000; // tokens
```

**Algorithm**:

1. Iterate backwards through messages (latest first)
2. Skip first 2 user turns (keep recent context)
3. Stop if hit a summary message (already compacted)
4. Count tool output tokens until reaching `PRUNE_PROTECT` (40k)
5. Mark older tool outputs as pruned if total exceeds `PRUNE_MINIMUM` (20k)
6. Pruned outputs replaced with `"[Old tool result content cleared]"` in `toModelMessage()`

**Disabled via**: `OPENCODE_DISABLE_PRUNE` flag

## System Prompt Construction

**Built in layers** (see `resolveSystemPrompt()`):

### 1. Header (Provider-specific spoofing)

```typescript
SystemPrompt.header(providerID);
// For Anthropic: PROMPT_ANTHROPIC_SPOOF
// Others: empty
```

### 2. Core Provider Prompt

```typescript
SystemPrompt.provider(model);
```

Maps model API ID to prompt file:

- `gpt-5` → `codex.txt`
- `gpt-*`, `o1`, `o3` → `beast.txt`
- `gemini-*` → `gemini.txt`
- `claude` → `anthropic.txt`
- `polaris-alpha` → `polaris.txt`
- Default → `qwen.txt` (anthropic without TODO)

### 3. Environment Context

```typescript
SystemPrompt.environment();
```

Includes:

```xml
<env>
  Working directory: {cwd}
  Is directory a git repo: yes/no
  Platform: darwin/linux/win32
  Today's date: {date}
</env>
<files>
  {git tree via ripgrep, limit 200 files}
</files>
```

### 4. Custom Instructions

```typescript
SystemPrompt.custom();
```

Searches for:

1. **Local** (project-specific): `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` (deprecated)
2. **Global**: `~/.config/opencode/AGENTS.md`, `~/.claude/CLAUDE.md`
3. **Config instructions**: From `opencode.jsonc` → `instructions: ["path/to/file.md"]`

**Merge strategy**: All found files concatenated with header `"Instructions from: {path}"`

### 5. Max Steps Reminder (if on last step)

```typescript
if (isLastStep) {
  messages.push({ role: "assistant", content: MAX_STEPS });
}
```

## Message Conversion to Model Format

**Key function**: `MessageV2.toModelMessage(messages)`

**Conversions**:

- User text parts → `{type: "text", text}`
- User files (non-text) → `{type: "file", url, mediaType, filename}`
- Compaction parts → synthetic `"What did we do so far?"` text
- Subtask parts → synthetic `"The following tool was executed by the user"` text
- Assistant text → `{type: "text", text}`
- Tool calls (completed) → `{type: "tool-{name}", state: "output-available", input, output}`
  - **Pruned tools**: `output: "[Old tool result content cleared]"`
- Tool calls (error) → `{type: "tool-{name}", state: "output-error", errorText}`
- Reasoning → `{type: "reasoning", text}` (for models with extended thinking)

**Filtering**:

- Aborted messages excluded UNLESS they have non-reasoning parts
- Messages with only errors excluded
- Empty messages (no parts) excluded

## Prompt Caching

**Automatic cache points** inserted via `ProviderTransform.applyCaching()`:

**Cached messages**:

1. First 2 system messages
2. Last 2 conversation messages (most recent context)

**Provider-specific cache control**:

```typescript
{
  anthropic: { cacheControl: { type: "ephemeral" } },
  openrouter: { cache_control: { type: "ephemeral" } },
  bedrock: { cachePoint: { type: "ephemeral" } },
  openaiCompatible: { cache_control: { type: "ephemeral" } }
}
```

**Placement**:

- Anthropic: On message itself
- Others: On last content item in message (if array)

## Session Persistence

**No explicit "save" operation** - all writes are immediate via `Storage.write()`.

**Session resumption**:

```typescript
Session.get(sessionID); // Fetch metadata
Session.messages({ sessionID }); // Load all messages
MessageV2.stream(sessionID); // Async generator (newest first)
MessageV2.filterCompacted(stream); // Stop at last compaction
```

**Forking** (`Session.fork`):

1. Creates new session
2. Clones messages up to `messageID` (if specified)
3. Clones all parts for each message
4. Generates new IDs (ascending) for cloned items

## Features We Might Not Be Using

### 1. Session Sharing

```typescript
Session.share(sessionID)
  → Creates shareable URL
  → Syncs to Cloudflare Durable Objects (if enterprise)
  → Or uses Share.create() for public sharing
```

**Config**: `share: "auto" | "disabled"` or `OPENCODE_AUTO_SHARE` flag

### 2. Session Revert

```typescript
SessionRevert.create({ sessionID, messageID, partID? })
  → Captures git snapshot before changes
  → Stores in session.revert field
  → Can rollback to pre-message state
```

### 3. Agent/Mode System

- Agents defined in `agent/*.md` files
- Custom `maxSteps`, `temperature`, `topP`, `permission` rules
- Agent-specific system prompts via `@agent-name` references

### 4. Subtask System

- `MessageV2.SubtaskPart` - spawns background tasks
- Handled by `Task` tool
- Results come back as tool outputs

### 5. Doom Loop Detection

```typescript
DOOM_LOOP_THRESHOLD = 3;
```

- Tracks last 3 tool calls
- If identical tool + args 3x, triggers permission check
- Can be set to "ask", "deny", or "allow" per agent

### 6. Session Diff Tracking

```typescript
SessionSummary.summarize()
  → Computes git diffs for all patches
  → Stores in session_diff/{sessionID}.json
  → Updates session.summary with { additions, deletions, files }
```

### 7. Message Title Generation

- Uses small model (e.g., Haiku) to generate 20-token title
- Stored in `message.summary.title`
- Async, doesn't block conversation

### 8. Session Children

- Sessions can have parent-child relationships
- Useful for branching conversations
- `Session.children(parentID)` fetches all descendants

### 9. Plugin System

```typescript
Plugin.trigger("chat.params", { sessionID, agent, model, ... })
  → Allows plugins to modify chat params before sending
```

### 10. Experimental Features (via Flags)

- `OPENCODE_DISABLE_PRUNE` - Skip tool output pruning
- `OPENCODE_DISABLE_AUTOCOMPACT` - Manual compaction only
- `OPENCODE_EXPERIMENTAL_WATCHER` - File change watching
- `OPENCODE_FAKE_VCS` - Simulate git for testing
- `OPENCODE_PERMISSION` - Override permission policies

## Configuration System

**Layered merging** (global → local → env):

1. Global config (`~/.config/opencode/opencode.jsonc`)
2. Auth provider configs (from `.well-known/opencode`)
3. Project-local configs (walks up from cwd to git root, finds `opencode.jsonc`)
4. `.opencode/` directories (project-specific overrides)
5. `OPENCODE_CONFIG` env var (explicit override)
6. `OPENCODE_CONFIG_CONTENT` env var (JSON string)

**Custom merge for plugins**: Arrays concatenated, not replaced.

## Token Cost Tracking

**Calculated per message**:

```typescript
Session.getUsage({ model, usage, metadata });
```

**Handles**:

- Input tokens (excluding cached)
- Output tokens
- Reasoning tokens (charged at output rate)
- Cache write tokens
- Cache read tokens

**Provider-specific metadata**:

- Anthropic: `cacheCreationInputTokens`, `cachedInputTokens`
- Bedrock: `usage.cacheWriteInputTokens`

**Over 200K pricing**: Some models have different pricing above 200K input tokens.

## Key Invariants

1. **Sessions never deleted during use** - cleanup is manual via `Session.remove()`
2. **Messages immutable after creation** - updates via `Storage.update()` with editor function
3. **Parts stream in order** - sorted by ID (ascending = chronological)
4. **Compaction is one-way** - no "un-summarizing" a session
5. **Pruned tool outputs lost** - no way to retrieve after pruning
6. **Project ID is git root commit** - ensures consistency across worktrees
7. **Identifiers are time-based** - descending for sessions (newest first), ascending for messages/parts

## Performance Notes

- **No in-memory cache** - every read hits disk (via Bun.file)
- **Locking prevents race conditions** - but adds latency
- **Async generators for streaming** - memory efficient for large histories
- **Glob scanning** - fast with Bun, but scales linearly with file count
- **Token estimation is instant** - no tokenizer overhead
- **Compaction is blocking** - conversation pauses during summarization
- **Pruning is async** - doesn't block next turn

## Relevant Files for Deep Dive

- `packages/opencode/src/session/index.ts` - Session CRUD operations
- `packages/opencode/src/session/prompt.ts` - Main conversation loop, system prompt assembly
- `packages/opencode/src/session/compaction.ts` - Auto-summarization logic
- `packages/opencode/src/session/message-v2.ts` - Message types, conversion to model format
- `packages/opencode/src/session/system.ts` - System prompt construction
- `packages/opencode/src/session/processor.ts` - Streaming response handler
- `packages/opencode/src/session/summary.ts` - Title/summary generation, diff tracking
- `packages/opencode/src/storage/storage.ts` - File-based persistence layer
- `packages/opencode/src/provider/transform.ts` - Prompt caching, message normalization
- `packages/opencode/src/util/token.ts` - Token estimation (simple char/4)
- `packages/opencode/src/config/config.ts` - Configuration loading and merging
