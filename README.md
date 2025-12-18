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

**A swarm of agents that learns from its mistakes.**

You tell it what to build. It decomposes the work, spawns parallel workers, tracks what strategies work, and adapts. Anti-patterns get detected. Proven patterns get promoted. Confidence decays unless revalidated.

Built on [`joelhooks/swarmtools`](https://github.com/joelhooks/swarmtools) - multi-agent orchestration with outcome-based learning.

---

## What Makes This Different

### 🧠 The Swarm Learns

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

**Every task execution feeds the learning system:**

- **Fast + success** → pattern gets promoted
- **Slow + retries + errors** → pattern gets flagged
- **>60% failure rate** → auto-inverted to anti-pattern
- **90-day half-life** → confidence decays unless revalidated

**Example:** "Split by file type" fails 80% of the time? System inverts it to "AVOID: Split by file type (80% failure rate)" and uses feature-based splits instead.

### 🔍 Cross-Agent Memory

**CASS** searches across ALL your AI agent histories before solving problems:

- **Indexed agents:** Claude Code, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode, Amp, Pi-Agent
- **Semantic + full-text search** - find past solutions even if phrased differently
- **Time-based filtering** - prioritize recent solutions

**Semantic Memory** persists learnings across sessions with vector search:

- Architectural decisions (store the WHY, not just WHAT)
- Debugging breakthroughs (root cause + solution)
- Project-specific gotchas (domain rules that tripped you up)
- Tool quirks (API bugs, workarounds)

**Before solving a problem, the swarm checks if any agent already solved it.**

### ⚡️ Cost-Optimized Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  COORDINATOR vs WORKER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COORDINATOR (Expensive, Long-Lived)                            │
│  ┌──────────────────────────────────────┐                       │
│  │  • Sonnet context ($$$)              │                       │
│  │  • NEVER edits code                  │                       │
│  │  • Decomposes + orchestrates         │                       │
│  │  • Monitors progress                 │                       │
│  │  • Unblocks dependencies             │                       │
│  └──────────────────────────────────────┘                       │
│                      │                                           │
│                      ├─── spawns ───┐                            │
│                      │               │                           │
│  ┌──────────────────▼───┐  ┌────────▼──────────┐               │
│  │  WORKER (Disposable) │  │  WORKER            │               │
│  │  ┌─────────────────┐ │  │  ┌───────────────┐│               │
│  │  │ Focused context │ │  │  │ Focused ctx   ││               │
│  │  │ Executes task   │ │  │  │ Executes task ││               │
│  │  │ Checkpointed    │ │  │  │ Checkpointed  ││               │
│  │  │ Tracks learning │ │  │  │ Tracks learn  ││               │
│  │  └─────────────────┘ │  │  └───────────────┘│               │
│  └──────────────────────┘  └───────────────────┘               │
│                                                                 │
│  Result: 70% cost reduction, better recovery, learning signals │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Workers get disposable context. Coordinator context stays clean. Parallel work doesn't blow the context window.

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

### First Swarm

```bash
/swarm "Add user authentication with OAuth"
```

Watch it:

1. Query CASS for similar past tasks
2. Select decomposition strategy (file/feature/risk-based)
3. Validate for conflicts
4. Create epic + subtasks
5. Spawn parallel worker agents
6. Coordinate via Agent Mail (file reservations)
7. Run UBS scan + typecheck + tests before closing
8. Record outcome for learning

---

## Swarm Orchestration

```
███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗
██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║
███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║
╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║
███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
```

**Built on [`joelhooks/swarmtools`](https://github.com/joelhooks/swarmtools)** - the core innovation.

### The System

**Hive** (git-backed work tracker):

- Atomic epic + subtask creation
- Status tracking (open → in_progress → blocked → closed)
- Thread linking with Agent Mail
- `hive_create`, `hive_create_epic`, `hive_query`, `hive_close`, `hive_sync`

**Agent Mail** (multi-agent coordination):

- File reservation system (prevent edit conflicts)
- Message passing between agents
- Context-safe inbox (max 5 messages, bodies excluded by default)
- Auto-release on completion
- `swarmmail_init`, `swarmmail_send`, `swarmmail_reserve`, `swarmmail_release`

**Swarm Tools** (orchestration):

- Strategy selection + decomposition validation
- Progress tracking (25/50/75% checkpoints)
- Completion verification gates (UBS + typecheck + tests)
- Outcome recording for learning
- `swarm_decompose`, `swarm_validate_decomposition`, `swarm_complete`, `swarm_record_outcome`

### 57 Plugin Tools

The `opencode-swarm-plugin` exposes:

- **8 Hive tools** - work tracking
- **7 Agent Mail tools** - coordination
- **15 Swarm orchestration tools** - decompose, spawn, verify, learn
- **5 Structured parsing tools** - JSON extraction, validation
- **9 Skills tools** - knowledge injection
- **2 Review tools** - peer review workflow

### Commands

```
┌────────────────────┬──────────────────────────────────────────────┐
│ /swarm <task>      │ Decompose → spawn parallel agents → merge    │
│ /swarm-status      │ Check running swarm progress                 │
│ /swarm-collect     │ Collect and merge swarm results              │
│ /parallel "a" "b"  │ Run explicit tasks in parallel               │
│                    │                                              │
│ /debug-plus        │ Debug + prevention pipeline + swarm fix      │
│ /fix-all           │ Survey PRs + cells, dispatch agents          │
│ /iterate <task>    │ Evaluator-optimizer loop until quality met   │
└────────────────────┴──────────────────────────────────────────────┘
```

Full command list: `/commit`, `/pr-create`, `/worktree-task`, `/handoff`, `/checkpoint`, `/retro`, `/review-my-shit`, `/sweep`, `/focus`, `/rmslop`, `/triage`, `/estimate`, `/standup`, `/migrate`, `/repo-dive`.

---

## Custom Tools

**12 MCP tools** built for this config:

### UBS - Ultimate Bug Scanner

Multi-language bug detection (JS/TS, Python, C++, Rust, Go, Java, Ruby):

- Null safety ("cannot read property of undefined")
- XSS + injection + prototype pollution
- Async/await race conditions
- Memory leaks (listeners, timers, detached DOM)
- Type coercion issues

```bash
# Before commit
ubs_scan(staged=true)

# After AI generates code
ubs_scan(path="src/new-feature/")
```

### CASS - Cross-Agent Session Search

Search across ALL your AI agent histories:

```bash
# Find past solutions
cass_search(query="authentication error", limit=5)

# Filter by agent + time
cass_search(query="useEffect cleanup", agent="claude", days=7)
```

### Semantic Memory

Vector-based persistent learning (PGlite + pgvector + Ollama):

```bash
# Store a learning
semantic-memory_store(
  information="OAuth refresh tokens need 5min buffer before expiry to avoid race conditions",
  metadata="auth, tokens, race-conditions"
)

# Search memories
semantic-memory_find(query="token refresh", limit=5)
```

### Repo Autopsy

Deep GitHub repo analysis (clone + analyze):

- AST grep (structural search)
- Git blame, hotspots, dependency analysis
- Secret scanning (gitleaks)
- Code stats (tokei)

### Others

- `repo-crawl_*` - GitHub API exploration (README, file contents, search)
- `pdf-brain_*` - PDF knowledge base with semantic search
- `typecheck` - TypeScript check with grouped errors
- `git-context` - Branch, status, commits in one call
- `find-exports` - Locate symbol exports
- `pkg-scripts` - List package.json scripts

---

## MCP Servers

**6 external + 1 embedded:**

| Server              | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| **next-devtools**   | Next.js dev server integration (routes, errors, build) |
| **chrome-devtools** | Browser automation, DOM inspection, network monitoring |
| **context7**        | Library documentation lookup (npm, PyPI, Maven)        |
| **fetch**           | Web fetching with markdown conversion                  |
| **snyk**            | Security scanning (SCA, SAST, IaC, containers)         |
| **kernel**          | Cloud browser automation, Playwright, app deployment   |
| **(Agent Mail)**    | Multi-agent coordination via Swarm Mail                |

---

## Agents

**7 specialized agents** + 4 overrides:

```
┌─────────────────┬───────────────────┬────────────────────────────────┐
│ Agent           │ Model             │ Purpose                        │
├─────────────────┼───────────────────┼────────────────────────────────┤
│ swarm/planner   │ claude-sonnet-4-5 │ Strategic task decomposition   │
│ swarm/worker    │ claude-sonnet-4-5 │ Parallel task implementation   │
│ explore         │ claude-haiku-4-5  │ Fast search (read-only)        │
│ archaeologist   │ claude-sonnet-4-5 │ Codebase exploration (r/o)     │
│ beads           │ claude-haiku      │ Issue tracker (locked down)    │
│ refactorer      │ default           │ Pattern migration              │
│ reviewer        │ default           │ Code review (read-only)        │
└─────────────────┴───────────────────┴────────────────────────────────┘
```

**Agent overrides in config:**

- `build` - temp 0.3, full capability
- `plan` - Sonnet 4.5, read-only
- `security` - Sonnet 4.5, read-only, Snyk integration
- `test-writer` - Sonnet 4.5, can only write `*.test.ts`
- `docs` - Haiku 4.5, can only write `*.md`

---

## Skills (On-Demand Knowledge)

**7 bundled skills** (~3,000 lines):

| Skill                    | When to Use                                                 |
| ------------------------ | ----------------------------------------------------------- |
| **testing-patterns**     | Adding tests, breaking dependencies, characterization tests |
| **swarm-coordination**   | Multi-agent decomposition, parallel work                    |
| **cli-builder**          | Building CLIs, argument parsing, subcommands                |
| **learning-systems**     | Confidence decay, pattern maturity                          |
| **skill-creator**        | Meta-skill for creating new skills                          |
| **system-design**        | Architecture decisions, module boundaries                   |
| **ai-optimized-content** | Content optimized for AI consumption                        |

```bash
# Load a skill
skills_use(name="testing-patterns")

# With context
skills_use(name="cli-builder", context="building a new CLI tool")
```

**Pro tip:** `testing-patterns` has a full catalog of 25 dependency-breaking techniques in `references/dependency-breaking-catalog.md`. Gold for getting gnarly code under test.

---

## Knowledge Files

**8 on-demand context files** (~3,200 lines):

| File                       | Topics                                           |
| -------------------------- | ------------------------------------------------ |
| `error-patterns.md`        | Known error signatures + solutions               |
| `prevention-patterns.md`   | Debug-to-prevention workflow, pattern extraction |
| `nextjs-patterns.md`       | RSC, caching, App Router gotchas                 |
| `effect-patterns.md`       | Services, Layers, Schema, error handling         |
| `mastra-agent-patterns.md` | Multi-agent coordination, context engineering    |
| `testing-patterns.md`      | Test strategies, mocking, fixtures               |
| `typescript-patterns.md`   | Type-level programming, inference, narrowing     |
| `git-patterns.md`          | Branching, rebasing, conflict resolution         |

Load via `@knowledge/file-name.md` references when relevant. **Check `error-patterns.md` FIRST when hitting errors.**

---

## Debug-to-Prevention Pipeline

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

Every debugging session becomes a codebase improvement opportunity. Errors don't recur.

---

## Scale

**Codebase:**

- 3,626 lines of command documentation (25 slash commands)
- 3,043 lines of skill documentation (7 bundled skills)
- 1,082 lines in swarm plugin wrapper
- ~2,000 lines of custom tools
- ~800 lines of agent definitions

**Capabilities:**

- 57 swarm plugin tools
- 12 custom MCP tools
- 6 external MCP servers + 1 embedded
- 7 specialized agents + 4 overrides
- Learning system with outcome tracking, pattern maturity, anti-pattern inversion

---

## Configuration Highlights

**From `opencode.jsonc`:**

### Models

- Primary: `claude-opus-4-5`
- Small: `claude-haiku-4-5`
- Autoupdate: `true`

### Permissions

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

### Formatters

- Biome support (JS/TS/JSON)
- Prettier support (all above + MD/YAML/CSS)

---

## Installation

### Core Requirements

| Tool     | Version | Purpose         |
| -------- | ------- | --------------- |
| OpenCode | 1.0+    | Plugin host     |
| Node.js  | 18+     | Runtime         |
| pnpm     | 8+      | Package manager |

### Step 1: Clone Config

```bash
git clone https://github.com/joelhooks/opencode-config ~/.config/opencode
cd ~/.config/opencode && pnpm install
```

### Step 2: Install Swarm CLI

```bash
npm install -g opencode-swarm-plugin

# Verify
swarm --version  # Should show 0.30.0+
```

The swarm CLI provides:

- Hive (git-backed work tracking)
- Agent Mail (multi-agent coordination)
- Swarm orchestration (decompose, spawn, verify)
- Skills system (knowledge injection)

### Step 3: Install Ollama (for AI features)

Ollama powers local embeddings for semantic memory and PDF search.

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start the service
ollama serve

# Pull the embedding model
ollama pull nomic-embed-text

# Verify
ollama --version  # Should show 0.13.0+
```

### Step 4: Install Semantic Memory CLI

```bash
npm install -g semantic-memory

# Verify Ollama connection
semantic-memory check
```

### Step 5: Install CASS (Cross-Agent Session Search)

```bash
npm install -g cass-search

# Build the index (searches Claude, Cursor, Codex, etc.)
cass index

# Verify
cass --version  # Should show 0.1.35+
```

### Step 6: Verify Everything

```bash
# Run swarm doctor to check all dependencies
swarm doctor
```

### Optional: Kernel Cloud Browser

For cloud browser automation (Playwright in the cloud):

```bash
opencode mcp auth kernel
```

Opens browser for OAuth. Credentials stored locally and auto-refreshed.

### Optional: Snyk Security Scanning

For vulnerability scanning (SCA, SAST, IaC, containers):

```bash
# Authenticate with Snyk
snyk auth
```

---

## Version Reference

Current tested versions:

| Tool            | Version | Install Command                  |
| --------------- | ------- | -------------------------------- |
| swarm           | 0.30.0  | `npm i -g opencode-swarm-plugin` |
| semantic-memory | latest  | `npm i -g semantic-memory`       |
| cass            | 0.1.35  | `npm i -g cass-search`           |
| ollama          | 0.13.1  | `brew install ollama`            |

**Embedding model:** `nomic-embed-text` (required for semantic-memory and pdf-brain)

---

## Directory Structure

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

## Credits

Inspired by and borrowed from:

- **[joelhooks/swarmtools](https://github.com/joelhooks/swarmtools)** - The swarm orchestration core
- **[nexxeln/opencode-config](https://github.com/nexxeln/opencode-config)** - `/rmslop` command, notify plugin pattern, Effect-TS knowledge patterns
- **[OpenCode](https://opencode.ai)** - The foundation that makes this possible

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
