```
   ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗
  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝
  ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝

        ██████╗ ██████╗ ███╗   ██╗███████╗██╗ ██████╗
       ██╔════╝██╔═══██╗████╗  ██║██╔════╝██║██╔════╝
       ██║     ██║   ██║██╔██╗ ██║█████╗  ██║██║  ███╗
       ██║     ██║   ██║██║╚██╗██║██╔══╝  ██║██║   ██║
       ╚██████╗╚██████╔╝██║ ╚████║██║     ██║╚██████╔╝
        ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝
```

Personal OpenCode configuration for **Joel Hooks**. Swarm-first multi-agent orchestration with learning capabilities.

## Credits

Inspired by and borrowed from:

- **[nexxeln/opencode-config](https://github.com/nexxeln/opencode-config)** - `/rmslop` command, notify plugin pattern, Effect-TS knowledge patterns
- **[OpenCode](https://opencode.ai)** - The foundation that makes this possible

---

## Quick Start

```bash
# Clone this config
git clone https://github.com/joelhooks/opencode-config ~/.config/opencode

# Install dependencies
cd ~/.config/opencode && pnpm install

# Install the swarm CLI globally
npm install -g opencode-swarm-plugin

# Verify setup
swarm --version
```

---

## Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        ~/.config/opencode                        │
├─────────────────────────────────────────────────────────────────┤
│  command/           25 slash commands (/swarm, /debug, etc.)    │
│  tool/              12 custom MCP tools (cass, ubs, etc.)       │
│  plugin/            swarm.ts (orchestration), notify.ts (audio) │
│  agent/             specialized subagents (worker, planner...)  │
│  knowledge/         8 context files (effect, nextjs, testing)   │
│  skills/            7 injectable knowledge packages             │
│  opencode.jsonc     main config (models, MCP servers, perms)    │
│  AGENTS.md          workflow instructions + tool preferences    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commands

```
┌────────────────────┬──────────────────────────────────────────────┐
│ SWARM              │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /swarm <task>      │ Decompose → spawn parallel agents → merge    │
│ /swarm-status      │ Check running swarm progress                 │
│ /swarm-collect     │ Collect and merge swarm results              │
│ /parallel "a" "b"  │ Run explicit tasks in parallel               │
├────────────────────┼──────────────────────────────────────────────┤
│ DEBUG              │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /debug <error>     │ Investigate, check known patterns first      │
│ /debug-plus        │ Debug + prevention pipeline + swarm fix      │
│ /triage <request>  │ Classify and route to handler                │
├────────────────────┼──────────────────────────────────────────────┤
│ WORKFLOW           │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /iterate <task>    │ Evaluator-optimizer loop until quality met   │
│ /fix-all           │ Survey PRs + cells, dispatch agents          │
│ /sweep             │ Codebase cleanup pass                        │
│ /focus <cell-id>   │ Start focused session on specific cell       │
│ /rmslop            │ Remove AI code slop from branch              │
├────────────────────┼──────────────────────────────────────────────┤
│ GIT                │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /commit            │ Smart commit with conventional format        │
│ /pr-create         │ Create PR with cell linking                  │
│ /worktree-task     │ Create git worktree for isolated work        │
├────────────────────┼──────────────────────────────────────────────┤
│ SESSION            │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /handoff           │ End session, sync hive, generate continue    │
│ /checkpoint        │ Compress context, summarize session          │
│ /context-dump      │ Dump state for context recovery              │
│ /retro <cell-id>   │ Post-mortem: extract learnings               │
│ /review-my-shit    │ Pre-PR self-review                           │
├────────────────────┼──────────────────────────────────────────────┤
│ EXPLORE            │                                              │
├────────────────────┼──────────────────────────────────────────────┤
│ /repo-dive <repo>  │ Deep analysis of GitHub repo                 │
│ /estimate          │ Estimate task complexity                     │
│ /standup           │ Generate standup summary                     │
└────────────────────┴──────────────────────────────────────────────┘
```

---

## Tools

### Custom Tools (in `tool/`)

| Tool                | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `cass_*`            | Cross-agent session search (Claude, Cursor, Codex, etc.) |
| `ubs_*`             | Multi-language bug scanner (JS/TS, Python, Rust, Go...)  |
| `semantic-memory_*` | Persistent vector store for learnings                    |
| `repo-crawl_*`      | GitHub API repo exploration                              |
| `repo-autopsy_*`    | Clone & deep analyze repos locally                       |
| `pdf-brain_*`       | PDF knowledge base with vector search                    |
| `typecheck`         | TypeScript check with grouped errors                     |
| `git-context`       | Branch, status, commits in one call                      |
| `find-exports`      | Find where symbols are exported                          |
| `pkg-scripts`       | List package.json scripts                                |

### Plugin Tools (from `opencode-swarm-plugin`)

**Hive** (git-backed issue tracking):

```
hive_create, hive_create_epic, hive_query, hive_update,
hive_close, hive_start, hive_ready, hive_sync
```

**Swarm Mail** (multi-agent coordination):

```
swarmmail_init, swarmmail_send, swarmmail_inbox,
swarmmail_read_message, swarmmail_reserve, swarmmail_release
```

**Swarm** (parallel orchestration):

```
swarm_select_strategy, swarm_plan_prompt, swarm_validate_decomposition,
swarm_spawn_subtask, swarm_status, swarm_complete, swarm_record_outcome
```

**Skills** (knowledge injection):

```
skills_list, skills_use, skills_read, skills_create
```

---

## Agents

```
┌─────────────────┬───────────────────┬────────────────────────────────┐
│ Agent           │ Model             │ Purpose                        │
├─────────────────┼───────────────────┼────────────────────────────────┤
│ swarm/planner   │ claude-sonnet-4-5 │ Strategic task decomposition   │
│ swarm/worker    │ claude-sonnet-4-5 │ Parallel task implementation   │
│ hive            │ claude-haiku      │ Issue tracker (locked down)    │
│ archaeologist   │ claude-sonnet-4-5 │ Read-only codebase exploration │
│ explore         │ claude-haiku-4-5  │ Fast search, pattern discovery │
│ refactorer      │ default           │ Pattern migration              │
│ reviewer        │ default           │ Read-only code review          │
└─────────────────┴───────────────────┴────────────────────────────────┘
```

---

## Skills

Injectable knowledge packages in `skills/`:

| Skill                  | When to Use                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `testing-patterns`     | Adding tests, breaking dependencies, characterization tests |
| `swarm-coordination`   | Multi-agent decomposition, parallel work                    |
| `cli-builder`          | Building CLIs, argument parsing, subcommands                |
| `learning-systems`     | Confidence decay, pattern maturity                          |
| `skill-creator`        | Meta-skill for creating new skills                          |
| `system-design`        | Architecture decisions, module boundaries                   |
| `ai-optimized-content` | Content optimized for AI consumption                        |

```bash
# Load a skill
skills_use(name="testing-patterns")

# With context
skills_use(name="cli-builder", context="building a new CLI tool")
```

---

## Knowledge Files

| File                       | Topics                                     |
| -------------------------- | ------------------------------------------ |
| `effect-patterns.md`       | Effect-TS services, layers, schema, errors |
| `error-patterns.md`        | Common errors with known fixes             |
| `prevention-patterns.md`   | Error-to-prevention mappings               |
| `nextjs-patterns.md`       | RSC, caching, App Router gotchas           |
| `testing-patterns.md`      | Testing strategies, mocking                |
| `typescript-patterns.md`   | Advanced TypeScript patterns               |
| `git-patterns.md`          | Git workflows, branching                   |
| `mastra-agent-patterns.md` | AI agent coordination                      |

---

## MCP Servers

Configured in `opencode.jsonc`:

| Server            | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `next-devtools`   | Next.js dev server integration               |
| `chrome-devtools` | Browser automation, DOM inspection           |
| `context7`        | Library documentation lookup                 |
| `fetch`           | Web fetching with markdown conversion        |
| `snyk`            | Security scanning (SCA, SAST, IaC)           |
| `kernel`          | Cloud browsers, Playwright execution (OAuth) |

### Kernel Setup

Kernel requires OAuth authentication:

```bash
opencode mcp auth kernel
```

This opens a browser for Kernel login. Credentials are stored locally and auto-refreshed.

---

## Plugins

### `swarm.ts` - Core Orchestration

Thin wrapper that shells out to `swarm` CLI. Provides:

- Hive tools (issue tracking)
- Swarm Mail tools (agent coordination)
- Swarm tools (parallel orchestration)
- Skills tools (knowledge injection)
- Structured output tools (JSON parsing)
- Session compacting hook (state recovery)

### `notify.ts` - Audio Alerts

Plays macOS system sounds on events:

- `session.idle` → Ping
- `swarm_complete` success → Glass
- `swarm_abort` → Basso (error)
- `hive_sync` success → Glass

---

## Learning System

The swarm plugin learns from outcomes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     LEARNING PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   CASS      │───▶│  Decompose  │───▶│   Execute   │         │
│  │  (history)  │    │  (strategy) │    │  (workers)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                     │                 │
│         │                                     ▼                 │
│         │                            ┌─────────────┐           │
│         │                            │   Record    │           │
│         │                            │  Outcome    │           │
│         │                            └─────────────┘           │
│         │                                     │                 │
│         ▼                                     ▼                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │              PATTERN MATURITY                    │           │
│  │  candidate → established → proven → deprecated   │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  • Confidence decay (90-day half-life)                         │
│  • Anti-pattern inversion (>60% failure → AVOID)               │
│  • Implicit feedback (fast+success vs slow+errors)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Workflows

### Swarm-First Development

```bash
/swarm "Add user authentication with OAuth"
```

1. Queries CASS for similar past tasks
2. Selects strategy (file/feature/risk-based)
3. Decomposes into parallelizable subtasks
4. Creates epic + subtasks via `hive_create_epic`
5. Spawns `swarm/worker` agents with file reservations
6. Workers communicate via Swarm Mail
7. `swarm_complete` runs UBS scan before closing
8. `swarm_record_outcome` tracks learning signals

### Session End Protocol

**NON-NEGOTIABLE** - the plane is not landed until push succeeds:

```bash
hive_sync()     # Sync to git
git push        # Push to remote
git status      # Verify "up to date with origin"
```

### Context Preservation

Plugin tools enforce hard limits:

- `swarmmail_inbox` - Max 5 messages, bodies excluded
- `swarmmail_summarize_thread` - Preferred over fetch all
- Auto-release reservations on session.idle

---

## Permissions

```jsonc
{
  "permission": {
    "bash": {
      "git push": "allow",
      "git push *": "allow",
      "sudo *": "deny",
      "rm -rf /": "deny",
      "rm -rf ~": "deny",
    },
  },
}
```

---

## Prerequisites

| Requirement   | Purpose                                          |
| ------------- | ------------------------------------------------ |
| OpenCode 1.0+ | Plugin host                                      |
| Node.js 18+   | Runtime                                          |
| `swarm` CLI   | Orchestration (`npm i -g opencode-swarm-plugin`) |
| Ollama        | Local embeddings for semantic-memory, pdf-brain  |

---

## License

MIT

---

```
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   "The best code is no code at all. The second best      ║
    ║    is code that writes itself."                          ║
    ║                                                           ║
    ║                              - Every AI coding agent      ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
```
