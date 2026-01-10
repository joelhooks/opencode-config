# Claude Code Rules

Follow `AGENTS.md` as the primary source of truth.

## Must Follow

- CLI-first scaffolding; never hand-write configs.
- TDD only: RED → GREEN → REFACTOR, tests first.
- Fix all lint errors before commit.

## OpenCode Rules

- Config sources merge; precedence: `.well-known/opencode` → global `~/.config/opencode/opencode.json` → `OPENCODE_CONFIG` → project `opencode.json` → `.opencode` dirs → `OPENCODE_CONFIG_CONTENT`.
- `permission` uses `allow` / `ask` / `deny`; last match wins. `.env` reads denied by default (except `*.env.example`).
- Use the **Plan** agent for analysis-only work (asks before edits or bash).
- Manage MCP servers with `opencode mcp add|list|auth|logout|debug`.
- OpenCode auto-runs formatters after edits; ensure formatter deps/configs exist.

## Style

- Direct, terse communication.
- Use JSDoc for components and functions.
- Simple over complex; explicit over implicit; composition > inheritance; don’t abstract until the third use.
