import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";
import { join } from "path";

/**
 * Semantic Memory - Local vector-based knowledge store
 *
 * Uses Qdrant + Ollama embeddings for semantic search.
 * Configurable tool descriptions via environment variables
 * (Qdrant MCP pattern) to customize agent behavior.
 *
 * Requires: semantic-memory CLI built and available
 * Location: ~/Code/joelhooks/semantic-memory
 */

const SEMANTIC_MEMORY_CLI = join(
  process.env.HOME || "~",
  "Code/joelhooks/semantic-memory/src/cli.ts",
);

// Configurable descriptions - allows users to customize how agents use these tools
const STORE_DESCRIPTION =
  process.env.TOOL_STORE_DESCRIPTION ||
  "Store information for later semantic retrieval";
const FIND_DESCRIPTION =
  process.env.TOOL_FIND_DESCRIPTION ||
  "Search for relevant information using semantic similarity";

async function runCli(args: string[]): Promise<string> {
  try {
    const result = await $`bun ${SEMANTIC_MEMORY_CLI} ${args}`.text();
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
