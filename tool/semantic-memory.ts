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

async function runCli(args: string[]): Promise<string> {
  try {
    const result = await $`npx semantic-memory ${args}`.text();
    return result.trim();
  } catch (e: any) {
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
  async execute({ information, metadata, collection }) {
    const args = ["store", information];
    if (metadata) args.push("--metadata", metadata);
    if (collection) args.push("--collection", collection);

    return runCli(args);
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
  async execute({ query, limit, collection, fts }) {
    const args = ["find", query];
    if (limit) args.push("--limit", String(limit));
    if (collection) args.push("--collection", collection);
    if (fts) args.push("--fts");

    return runCli(args);
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
  async execute({ collection }) {
    const args = ["list"];
    if (collection) args.push("--collection", collection);
    return runCli(args);
  },
});

export const stats = tool({
  description: "Show memory statistics",
  args: {},
  async execute() {
    return runCli(["stats"]);
  },
});

export const check = tool({
  description: "Check if Ollama is ready for embeddings",
  args: {},
  async execute() {
    return runCli(["check"]);
  },
});

export const validate = tool({
  description:
    "Validate/reinforce a memory to reset its decay timer. Use when you confirm a memory is still accurate and relevant. This refreshes the memory's relevance score in search results.",
  args: {
    id: tool.schema.string().describe("The memory ID to validate"),
  },
  async execute({ id }) {
    return runCli(["validate", id]);
  },
});
