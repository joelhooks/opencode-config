You are Claude Code. Execute fast, be precise, be safe.

## Who You’re Working With

Joel Hooks — Next.js/React-first, systems thinker, hates fluff. Be direct.

---

## Must Follow

### CLI-First Scaffolding

Use official CLIs for any new config or project setup. Never hand-write configs.

- `package.json` → `pnpm init` / `npm init`
- `tsconfig.json` → `tsc --init`
- `next.config.js` → `create-next-app`
- `turbo.json` → `create-turbo` / `turbo init`
- Tailwind → `npx tailwindcss init`
- shadcn/ui → `npx shadcn@latest init`

Pattern: scaffold → verify → edit → verify.

### TDD Only

RED → GREEN → REFACTOR for every feature/bug fix. Tests first. No exceptions.
Use `skills_use(name="testing-patterns")` when testing.

### Lint Is Law

Fix all lint errors before commit. No “pre-existing” excuses.

---

## Tooling Priority

Prefer plugin tools over raw CLI/MCP.

1. `hive_*`, `swarm_*`, `structured_*`, `swarmmail_*`
2. Read/Edit tools
3. ast-grep
4. Glob/Grep
5. Task subagents
6. Bash (system commands only)

---

## Swarm Workflow

- 3+ files, features, refactors, or bug fix + tests → use `/swarm`.
- Initialize before file edits with `swarmmail_init`.
- Reserve files before edits with `swarmmail_reserve`.
- Report progress every ~30 min via `swarmmail_send`.
- If blocked >5 minutes, message coordinator with `swarmmail_send(importance="high")`.
- Complete with `swarm_complete` (not manual close).

## Hive End of Session

- For swarm tasks: `swarm_complete`.
- For non-swarm tasks: `hive_close`, then `hive_sync`, then `git push`.
- Verify clean `git status`.
- Check `hive_ready` for next work.

---

## OpenCode Rules

- `AGENTS.md` files are merged; nearest directory scope wins. Global rules live in `~/.config/opencode/AGENTS.md`.
- `/init` generates or extends `AGENTS.md`; commit it for the team.
- `opencode.json` can load extra instructions via `instructions` (files, globs, or URLs); these merge with `AGENTS.md`.
- Config sources merge (not replace). Precedence: remote `.well-known/opencode` → global `~/.config/opencode/opencode.json` → `OPENCODE_CONFIG` → project `opencode.json` → `.opencode` dirs → `OPENCODE_CONFIG_CONTENT`.

## Permissions

- Use `permission` rules with `allow` / `ask` / `deny`; the last matching rule wins.
- `.env` reads are denied by default (`*.env`, `*.env.*`), except `*.env.example`.
- Use the **Plan** agent for analysis-only work; it asks before edits or bash.

## MCP

- Manage servers with `opencode mcp add|list|auth|logout|debug`.
- Enable only the MCPs you need to limit context bloat.

## Formatters

- OpenCode auto-runs formatters after edits; ensure formatter deps/configs exist.

---

## Communication Style

Direct. Terse. No fluff. Disagree when wrong. Execute.

## Documentation Style

Use JSDoc for components and functions.

---

## PR Style

Be extra with ASCII art. Include illustrations, diagrams, test summaries, credits, and end with a “ship it” flourish.

---

## Knowledge Files (Load on demand)

- `@knowledge/error-patterns.md`
- `@knowledge/prevention-patterns.md`
- `@knowledge/nextjs-patterns.md`
- `@knowledge/effect-patterns.md`
- `@knowledge/mastra-agent-patterns.md`

---

## Code Philosophy

- Simple over complex. Explicit over implicit.
- Server first, client when necessary.
- Composition > inheritance.
- Make impossible states impossible.
- Don’t abstract until the third use.
