import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";
import { statSync } from "fs";

/**
 * CASS - Coding Agent Session Search
 *
 * Unified search across all your AI coding agent histories:
 * Claude Code, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode, Amp, Pi-Agent
 *
 * ALWAYS use --robot or --json flags - never launch bare cass (it opens TUI)
 */

const CASS_BIN = `${process.env.HOME}/.local/bin/cass`;

async function runCass(args: string[], signal?: AbortSignal): Promise<string> {
  try {
    // Create AbortController for the shell command
    const controller = new AbortController();
    signal?.addEventListener("abort", () => controller.abort());

    const result = await $`${CASS_BIN} ${args}`.text();
    return result.trim();
  } catch (e: any) {
    // Handle abort
    if (signal?.aborted) {
      return "Operation cancelled";
    }
    // cass outputs errors to stderr but may still have useful stdout
    const stderr = e.stderr?.toString() || "";
    const stdout = e.stdout?.toString() || "";
    if (stdout) return stdout.trim();
    return `Error: ${stderr || e.message || e}`;
  }
}

export const search = tool({
  description:
    "Search across all AI coding agent histories (Claude, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode). Query BEFORE solving problems from scratch - another agent may have already solved it.",
  args: {
    query: tool.schema.string().describe("Natural language search query"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results (default: 10)"),
    agent: tool.schema
      .string()
      .optional()
      .describe(
        "Filter by agent: claude, codex, cursor, gemini, aider, chatgpt, cline, opencode, amp",
      ),
    days: tool.schema.number().optional().describe("Limit to last N days"),
    fields: tool.schema
      .string()
      .optional()
      .describe(
        "Field selection: 'minimal' (path,line,agent), 'summary' (adds title,score), or comma-separated list",
      ),
  },
  async execute({ query, limit, agent, days, fields }, ctx) {
    const args = ["search", query, "--robot"];
    if (limit) args.push("--limit", String(limit));
    if (agent) args.push("--agent", agent);
    if (days) args.push("--days", String(days));
    if (fields) args.push("--fields", fields);

    const output = await runCass(args, ctx?.abort);

    // Parse and sort results by mtime (newest first)
    try {
      const lines = output.split("\n").filter((l) => l.trim());

      // Try to parse as JSON lines
      const results = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((r) => r !== null);

      // If we have parseable JSON results, sort by mtime
      if (results.length > 0) {
        results.sort((a, b) => {
          // Try mtime field first
          const mtimeA = a.mtime || a.modified || 0;
          const mtimeB = b.mtime || b.modified || 0;

          if (mtimeA && mtimeB) {
            return mtimeB - mtimeA;
          }

          // Fallback: get mtime from file path
          if (a.path && b.path) {
            try {
              const statA = statSync(a.path);
              const statB = statSync(b.path);
              return statB.mtimeMs - statA.mtimeMs;
            } catch {
              // If stat fails, maintain original order
              return 0;
            }
          }

          return 0;
        });

        // Return sorted results as JSON lines
        return results.map((r) => JSON.stringify(r)).join("\n");
      }
    } catch {
      // If parsing fails, return original output
    }

    return output;
  },
});

export const health = tool({
  description:
    "Check if cass index is healthy. Exit 0 = ready, Exit 1 = needs indexing. Run this before searching.",
  args: {},
  async execute(_args, ctx) {
    return runCass(["health", "--json"], ctx?.abort);
  },
});

export const index = tool({
  description:
    "Build or rebuild the search index. Run this if health check fails or to pick up new sessions.",
  args: {
    full: tool.schema
      .boolean()
      .optional()
      .describe("Force full rebuild (slower but thorough)"),
  },
  async execute({ full }, ctx) {
    const args = ["index", "--json"];
    if (full) args.push("--full");
    return runCass(args, ctx?.abort);
  },
});

export const view = tool({
  description:
    "View a specific conversation/session from search results. Use source_path from search output.",
  args: {
    path: tool.schema
      .string()
      .describe("Path to session file (from search results)"),
    line: tool.schema.number().optional().describe("Line number to focus on"),
  },
  async execute({ path, line }, ctx) {
    const args = ["view", path, "--json"];
    if (line) args.push("-n", String(line));
    return runCass(args, ctx?.abort);
  },
});

export const expand = tool({
  description:
    "Expand context around a specific line in a session. Shows messages before/after.",
  args: {
    path: tool.schema.string().describe("Path to session file"),
    line: tool.schema.number().describe("Line number to expand around"),
    context: tool.schema
      .number()
      .optional()
      .describe("Number of messages before/after (default: 3)"),
  },
  async execute({ path, line, context }, ctx) {
    const args = ["expand", path, "-n", String(line), "--json"];
    if (context) args.push("-C", String(context));
    return runCass(args, ctx?.abort);
  },
});

export const stats = tool({
  description:
    "Show index statistics - how many sessions, messages, agents indexed.",
  args: {},
  async execute(_args, ctx) {
    return runCass(["stats", "--json"], ctx?.abort);
  },
});

export const capabilities = tool({
  description:
    "Discover cass features, supported agents, and API capabilities.",
  args: {},
  async execute(_args, ctx) {
    return runCass(["capabilities", "--json"], ctx?.abort);
  },
});
