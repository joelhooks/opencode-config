# OpenCode Config

Personal OpenCode configuration for Joel Hooks. Swarm-first multi-agent orchestration with learning capabilities.

## Quick Start

```bash
# Install the swarm plugin from npm
npm install opencode-swarm-plugin

# Copy to OpenCode plugins directory
cp node_modules/opencode-swarm-plugin/dist/plugin.js ~/.config/opencode/plugin/swarm.js

# Verify Agent Mail is running (required for multi-agent coordination)
curl http://127.0.0.1:8765/health/liveness

# Verify beads CLI is installed
bd --version
```

## Structure

```
├── command/          # Custom slash commands
├── tool/             # Custom MCP tools (wrappers)
├── plugin/           # Swarm plugin (from npm)
├── agent/            # Specialized subagents
├── knowledge/        # Injected context files
├── opencode.jsonc    # Main config
└── AGENTS.md         # Workflow instructions
```

## Swarm Plugin (Core)

The `opencode-swarm-plugin` provides intelligent multi-agent coordination with learning capabilities. **Always use plugin tools over raw CLI commands.**

### Installation

```bash
# From npm
npm install opencode-swarm-plugin
cp node_modules/opencode-swarm-plugin/dist/plugin.js ~/.config/opencode/plugin/swarm.js

# Or symlink for development
ln -sf ~/Code/joelhooks/opencode-swarm-plugin/dist/plugin.js ~/.config/opencode/plugin/swarm.js
```

### Plugin Tools

**Beads** (issue tracking - replaces `bd` CLI):
| Tool | Purpose |
|------|---------|
| `beads_create` | Create bead with type-safe validation |
| `beads_create_epic` | Atomic epic + subtasks creation |
| `beads_query` | Query with filters (replaces `bd list/ready/wip`) |
| `beads_update` | Update status/description/priority |
| `beads_close` | Close with reason |
| `beads_start` | Mark in-progress |
| `beads_ready` | Get next unblocked bead |
| `beads_sync` | Sync to git (MANDATORY at session end) |

**Agent Mail** (multi-agent coordination):
| Tool | Purpose |
|------|---------|
| `agentmail_init` | Initialize session (project + agent registration) |
| `agentmail_send` | Send message to agents |
| `agentmail_inbox` | Fetch inbox (CONTEXT-SAFE: limit=5, no bodies) |
| `agentmail_read_message` | Fetch ONE message body |
| `agentmail_summarize_thread` | Summarize thread (PREFERRED over fetch all) |
| `agentmail_reserve` | Reserve files for exclusive edit |
| `agentmail_release` | Release reservations |

**Swarm** (parallel task orchestration):
| Tool | Purpose |
|------|---------|
| `swarm_decompose` | Generate decomposition prompt (queries CASS for history) |
| `swarm_validate_decomposition` | Validate response, detect instruction conflicts |
| `swarm_status` | Get swarm progress by epic ID |
| `swarm_progress` | Report subtask progress |
| `swarm_complete` | Complete subtask (runs UBS scan, releases reservations) |
| `swarm_record_outcome` | Record outcome for learning (duration, errors, retries) |

**Structured Output** (JSON parsing):
| Tool | Purpose |
|------|---------|
| `structured_extract_json` | Extract JSON from markdown/text |
| `structured_validate` | Validate against schema |
| `structured_parse_evaluation` | Parse self-evaluation |
| `structured_parse_bead_tree` | Parse epic decomposition |

### Learning Capabilities

The plugin learns from swarm outcomes to improve future decompositions:

**Confidence Decay**: Evaluation criteria weights decay over time (90-day half-life) unless revalidated. Unreliable criteria get reduced weight.

**Implicit Feedback**: `swarm_record_outcome` tracks task signals:

- Fast completion + success → helpful signal
- Slow completion + errors + retries → harmful signal

**Pattern Maturity**: Decomposition patterns progress through states:

- `candidate` → `established` → `proven` (or `deprecated`)

**Anti-Pattern Learning**: Failed patterns auto-invert:

- "Split by file type" (60% failure) → "AVOID: Split by file type"

**Pre-Completion Validation**: `swarm_complete` runs UBS bug scan before closing.

**History-Informed Decomposition**: `swarm_decompose` queries CASS for similar past tasks.

## Commands

| Command               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `/swarm <task>`       | Decompose task into beads, spawn parallel agents with context sync |
| `/swarm-status`       | Check status of running swarm                                      |
| `/swarm-collect`      | Collect and merge swarm results                                    |
| `/parallel "t1" "t2"` | Run explicit tasks in parallel                                     |
| `/iterate <task>`     | Evaluator-optimizer loop until quality threshold met               |
| `/debug <error>`      | Investigate error, check known patterns first                      |
| `/triage <request>`   | Classify and route to appropriate handler                          |
| `/fix-all`            | Survey PRs + beads, dispatch agents                                |
| `/review-my-shit`     | Pre-PR self-review                                                 |
| `/handoff`            | End session, sync beads, generate continuation                     |
| `/sweep`              | Codebase cleanup pass                                              |
| `/focus <bead-id>`    | Start focused session on specific bead                             |
| `/context-dump`       | Dump state for context recovery                                    |
| `/checkpoint`         | Compress context, summarize session                                |
| `/commit`             | Smart commit with conventional format                              |
| `/pr-create`          | Create PR with beads linking                                       |
| `/repo-dive <repo>`   | Deep analysis of GitHub repo                                       |
| `/worktree-task <id>` | Create git worktree for isolated work                              |
| `/retro <bead-id>`    | Post-mortem: extract learnings                                     |

## Custom Tools (Wrappers)

These wrap external CLIs for OpenCode integration:

| Tool                | Description                                       |
| ------------------- | ------------------------------------------------- |
| `typecheck`         | TypeScript check with grouped errors              |
| `git-context`       | Branch, status, commits, ahead/behind in one call |
| `find-exports`      | Find where symbols are exported                   |
| `pkg-scripts`       | List package.json scripts                         |
| `repo-crawl_*`      | GitHub API repo exploration                       |
| `repo-autopsy_*`    | Clone & deep analyze repos locally                |
| `pdf-brain_*`       | PDF knowledge base with vector search             |
| `semantic-memory_*` | Local vector store for persistent knowledge       |
| `cass_*`            | Search all AI agent histories                     |
| `ubs_*`             | Multi-language bug scanner                        |

## Agents

| Agent           | Mode     | Purpose                                       |
| --------------- | -------- | --------------------------------------------- |
| `beads`         | subagent | Issue tracker operations (Haiku, locked down) |
| `archaeologist` | subagent | Read-only codebase exploration                |
| `refactorer`    | subagent | Pattern migration across codebase             |
| `reviewer`      | subagent | Read-only code review, audits                 |

## Knowledge Files

- **effect-patterns.md** - Effect-TS services, layers, schema, error handling
- **error-patterns.md** - Common errors with known fixes
- **git-patterns.md** - Git workflows, branching strategies
- **mastra-agent-patterns.md** - AI agent coordination patterns
- **nextjs-patterns.md** - RSC, caching, App Router gotchas
- **testing-patterns.md** - Testing strategies
- **typescript-patterns.md** - Advanced TypeScript patterns

## MCP Servers

Configured in `opencode.jsonc`:

- `next-devtools` - Next.js dev server integration
- `chrome-devtools` - Browser automation
- `context7` - Library documentation lookup
- `fetch` - Web fetching with markdown conversion

**Note:** Agent Mail MCP is available but prefer `agentmail_*` plugin tools for context safety.

## Cross-Agent Tools

### CASS (Coding Agent Session Search)

Search across all your AI coding agent histories before solving problems from scratch:

```
cass_search(query="authentication error", limit=5)
cass_search(query="useEffect", agent="claude", days=7)
cass_view(path="/path/to/session.jsonl", line=42)
```

**Indexed agents:** Claude Code, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode, Amp, Pi-Agent

### UBS (Ultimate Bug Scanner)

Multi-language bug scanner - runs automatically on `swarm_complete`:

```
ubs_scan(staged=true)      # Pre-commit
ubs_scan(path="src/")      # Specific path
ubs_scan_json(path=".")    # JSON output
```

**Languages:** JS/TS, Python, C/C++, Rust, Go, Java, Ruby, Swift
**Catches:** Null safety, XSS, async/await bugs, memory leaks, type coercion

## Key Patterns

### Swarm-First Workflow

For any multi-step task, use `/swarm`:

```
/swarm "Add user authentication with OAuth providers"
```

This:

1. Queries CASS for similar past tasks
2. Decomposes into parallelizable subtasks
3. Creates epic + subtasks atomically via `beads_create_epic`
4. Spawns parallel agents with file reservations
5. Agents communicate via Agent Mail threads
6. `swarm_complete` runs UBS scan before closing
7. `swarm_record_outcome` tracks learning signals

### Context Preservation

Plugin tools enforce hard limits to prevent context exhaustion:

- `agentmail_inbox` - Max 5 messages, bodies excluded
- `agentmail_summarize_thread` - Preferred over fetching all
- Auto-release reservations on session.idle
- Auto-sync beads after close

### Session End Protocol

**NON-NEGOTIABLE** - the plane is not landed until push succeeds:

```
beads_sync()           # Sync to git
git push               # Push to remote
git status             # Verify "up to date with origin"
```

## Prerequisites

| Requirement      | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| OpenCode 1.0+    | Plugin host                                     |
| Agent Mail MCP   | Multi-agent coordination (`localhost:8765`)     |
| Beads CLI (`bd`) | Git-backed issue tracking                       |
| CASS             | Cross-agent session search (optional)           |
| UBS              | Bug scanning (optional, used by swarm_complete) |

## License

MIT
