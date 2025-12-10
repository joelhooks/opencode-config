import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";

/**
 * Semantic Memory - Local vector-based knowledge store
 *
 * Uses PGlite + pgvector + Ollama embeddings for semantic search.
 * Configurable tool descriptions via environment variables
 * (Qdrant MCP pattern) to customize agent behavior.
 */

// Rich descriptions that shape agent behavior (Qdrant MCP pattern)
// Can be overridden via env vars for different contexts
const STORE_DESCRIPTION =
  process.env.TOOL_STORE_DESCRIPTION ||
  "Persist important discoveries, decisions, and learnings for future sessions. Use for: architectural decisions, debugging breakthroughs, user preferences, project-specific patterns. Include context about WHY something matters.";
const FIND_DESCRIPTION =
  process.env.TOOL_FIND_DESCRIPTION ||
  "Search your persistent memory for relevant context. Query BEFORE making architectural decisions, when hitting familiar-feeling bugs, or when you need project history. Returns semantically similar memories ranked by relevance.";

async function runCli(args: string[], signal?: AbortSignal): Promise<string> {
  try {
    // Check abort before starting
    if (signal?.aborted) return "Operation cancelled";

    const result = await $`npx semantic-memory ${args}`.text();
    return result.trim();
  } catch (e: any) {
    // Handle abort
    if (signal?.aborted) {
      return "Operation cancelled";
    }
    return `Error: ${e.stderr || e.message || e}`;
  }
}

export const store = tool({
  description: STORE_DESCRIPTION,
  args: {
    information: tool.schema.string().describe("The information to store"),
    metadata: tool.schema
      .string()
      .optional()
      .describe("Optional JSON metadata object"),
    collection: tool.schema
      .string()
      .optional()
      .describe("Collection name (default: 'default')"),
  },
  async execute({ information, metadata, collection }, ctx) {
    const args = ["store", information];
    if (metadata) args.push("--metadata", metadata);
    if (collection) args.push("--collection", collection);

    return runCli(args, ctx?.abort);
  },
});

export const find = tool({
  description: FIND_DESCRIPTION,
  args: {
    query: tool.schema.string().describe("Natural language search query"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results (default: 10)"),
    collection: tool.schema
      .string()
      .optional()
      .describe("Collection to search (default: 'default')"),
    fts: tool.schema
      .boolean()
      .optional()
      .describe("Use full-text search only (no embeddings)"),
  },
  async execute({ query, limit, collection, fts }, ctx) {
    const args = ["find", query];
    if (limit) args.push("--limit", String(limit));
    if (collection) args.push("--collection", collection);
    if (fts) args.push("--fts");

    return runCli(args, ctx?.abort);
  },
});

export const list = tool({
  description: "List stored memories",
  args: {
    collection: tool.schema
      .string()
      .optional()
      .describe("Collection to list (default: all)"),
  },
  async execute({ collection }, ctx) {
    const args = ["list"];
    if (collection) args.push("--collection", collection);
    return runCli(args, ctx?.abort);
  },
});

export const stats = tool({
  description: "Show memory statistics",
  args: {},
  async execute(_args, ctx) {
    return runCli(["stats"], ctx?.abort);
  },
});

export const check = tool({
  description: "Check if Ollama is ready for embeddings",
  args: {},
  async execute(_args, ctx) {
    return runCli(["check"], ctx?.abort);
  },
});

export const validate = tool({
  description:
    "Validate/reinforce a memory to reset its decay timer. Use when you confirm a memory is still accurate and relevant. This refreshes the memory's relevance score in search results.",
  args: {
    id: tool.schema.string().describe("The memory ID to validate"),
  },
  async execute({ id }, ctx) {
    return runCli(["validate", id], ctx?.abort);
  },
});
