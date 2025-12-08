import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";

/**
 * CASS - Coding Agent Session Search
 *
 * Unified search across all your AI coding agent histories:
 * Claude Code, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode, Amp, Pi-Agent
 *
 * ALWAYS use --robot or --json flags - never launch bare cass (it opens TUI)
 */

const CASS_BIN = `${process.env.HOME}/.local/bin/cass`;

async function runCass(args: string[]): Promise<string> {
  try {
    const result = await $`${CASS_BIN} ${args}`.text();
    return result.trim();
  } catch (e: any) {
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
  async execute({ query, limit, agent, days, fields }) {
    const args = ["search", query, "--robot"];
    if (limit) args.push("--limit", String(limit));
    if (agent) args.push("--agent", agent);
    if (days) args.push("--days", String(days));
    if (fields) args.push("--fields", fields);
    return runCass(args);
  },
});

export const health = tool({
  description:
    "Check if cass index is healthy. Exit 0 = ready, Exit 1 = needs indexing. Run this before searching.",
  args: {},
  async execute() {
    return runCass(["health", "--json"]);
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
  async execute({ full }) {
    const args = ["index", "--json"];
    if (full) args.push("--full");
    return runCass(args);
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
  async execute({ path, line }) {
    const args = ["view", path, "--json"];
    if (line) args.push("-n", String(line));
    return runCass(args);
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
  async execute({ path, line, context }) {
    const args = ["expand", path, "-n", String(line), "--json"];
    if (context) args.push("-C", String(context));
    return runCass(args);
  },
});

export const stats = tool({
  description:
    "Show index statistics - how many sessions, messages, agents indexed.",
  args: {},
  async execute() {
    return runCass(["stats", "--json"]);
  },
});

export const capabilities = tool({
  description:
    "Discover cass features, supported agents, and API capabilities.",
  args: {},
  async execute() {
    return runCass(["capabilities", "--json"]);
  },
});
