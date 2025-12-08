# OpenCode Config

Personal OpenCode configuration for Joel Hooks. Commands, tools, agents, and knowledge files.

## Structure

```
├── command/          # Custom slash commands
├── tool/             # Custom MCP tools
├── plugin/           # Custom plugins (swarm orchestration)
├── agent/            # Specialized subagents
├── knowledge/        # Injected context files
├── opencode.jsonc    # Main config
└── AGENTS.md         # Workflow instructions
```

## Commands

| Command               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `/swarm <task>`       | Decompose task into beads, spawn parallel agents with context sync |
| `/swarm-status`       | Check status of running swarm                                      |
| `/swarm-collect`      | Collect and merge swarm results                                    |
| `/iterate <task>`     | Evaluator-optimizer loop until quality threshold met               |
| `/debug <error>`      | Investigate error, check known patterns first                      |
| `/triage <request>`   | Classify and route to appropriate handler                          |
| `/parallel "t1" "t2"` | Run explicit tasks in parallel                                     |
| `/fix-all`            | Survey PRs + beads, dispatch agents                                |
| `/review-my-shit`     | Pre-PR self-review                                                 |
| `/handoff`            | End session, sync beads, generate continuation                     |
| `/sweep`              | Codebase cleanup pass                                              |
| `/focus <bead-id>`    | Start focused session on specific bead                             |
| `/context-dump`       | Dump state for context recovery                                    |
| `/checkpoint`         | Compress context, summarize session, preserve decisions            |
| `/commit`             | Smart commit with conventional format                              |
| `/pr-create`          | Create PR with beads linking                                       |
| `/repo-dive <repo>`   | Deep analysis of GitHub repo                                       |
| `/worktree-task <id>` | Create git worktree for isolated work                              |
| `/retro <bead-id>`    | Post-mortem: extract learnings, update knowledge files             |
| `/standup`            | Daily standup summary                                              |
| `/estimate`           | Task estimation                                                    |
| `/migrate`            | Migration helper                                                   |
| `/test`               | Test runner with smart filtering                                   |

## Tools

| Tool           | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `bd-quick`     | Fast beads operations: ready, wip, start, done, create, sync |
| `typecheck`    | TypeScript check with grouped errors                         |
| `git-context`  | Branch, status, commits, ahead/behind in one call            |
| `find-exports` | Find where symbols are exported                              |
| `pkg-scripts`  | List package.json scripts                                    |
| `repo-crawl`   | GitHub API repo exploration                                  |
| `repo-autopsy` | Clone & deep analyze repos locally                           |
| `pdf-library`  | PDF knowledge base with vector search                        |

## Agents

| Agent           | Mode     | Purpose                                       |
| --------------- | -------- | --------------------------------------------- |
| `beads`         | subagent | Issue tracker operations (Haiku, locked down) |
| `archaeologist` | subagent | Read-only codebase exploration                |
| `refactorer`    | subagent | Pattern migration across codebase             |
| `reviewer`      | subagent | Read-only code review, audits                 |

## Knowledge Files

- **effect-patterns.md** - Effect-TS services, layers, schema, error handling
- **error-patterns.md** - Common errors with known fixes (TS, Next.js, Effect)
- **git-patterns.md** - Git workflows, branching strategies
- **mastra-agent-patterns.md** - Patterns from Sam Bhagwat's AI agent books
- **nextjs-patterns.md** - RSC, caching, App Router gotchas
- **testing-patterns.md** - Testing strategies and patterns
- **typescript-patterns.md** - Advanced TypeScript patterns

## MCP Servers

Configured in `opencode.jsonc`:

- `next-devtools` - Next.js dev server integration
- `agent-mail` - Multi-agent coordination (localhost:8765)
- `chrome-devtools` - Browser automation
- `context7` - Library documentation lookup
- `fetch` - Web fetching with markdown conversion

## Key Patterns

### Beads Workflow

All task tracking goes through beads (git-backed issue tracker):

```bash
bd ready --json          # What's next?
bd create "Task" -p 1    # File work
bd update ID --status in_progress
bd close ID --reason "Done"
bd sync && git push      # Land the plane
```

### Swarm with Context Sync

`/swarm` spawns parallel agents that share context mid-task via Agent Mail threads. Prevents incompatible outputs.

### Error Pattern Injection

`/debug` and `/iterate` check `knowledge/error-patterns.md` first. Known patterns get instant fixes. Novel patterns can be saved with `--learn` or `--save`.

## License

MIT
