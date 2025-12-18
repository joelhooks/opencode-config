import { tool } from "@opencode-ai/plugin";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import { spawn } from "child_process";

/**
 * PDF Brain - Local knowledge base with vector search
 *
 * Supports PDFs and Markdown files (local paths or URLs).
 * Uses PGlite + pgvector for semantic search via Ollama embeddings.
 * Stores in ~/Documents/.pdf-library/ for iCloud sync.
 */

const DEFAULT_TIMEOUT_MS = 30_000; // 30s default
const EMBEDDING_TIMEOUT_MS = 120_000; // 2min for operations that generate embeddings

async function runCli(
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("pdf-brain", args, {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      resolve(`Error: Command timed out after ${timeoutMs / 1000}s`);
    }, timeoutMs);

    // Handle abort signal
    const abortListener = () => {
      if (!killed) {
        killed = true;
        clearTimeout(timeout);
        proc.kill("SIGTERM");
        resolve("Operation cancelled");
      }
    };
    signal?.addEventListener("abort", abortListener);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortListener);
      if (killed) return;

      if (code === 0) {
        resolve(stdout.trim());
      } else {
        resolve(`Error (exit ${code}): ${stderr || stdout}`.trim());
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortListener);
      if (killed) return;
      resolve(`Error: ${err.message}`);
    });
  });
}

function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

function isValidFile(path: string): boolean {
  const ext = extname(path).toLowerCase();
  return ext === ".pdf" || ext === ".md" || ext === ".markdown";
}

export const add = tool({
  description:
    "Add a PDF or Markdown file to the library - extracts text, generates embeddings for semantic search. Supports local paths and URLs.",
  args: {
    path: tool.schema.string().describe("Path to file (PDF/Markdown) or URL"),
    tags: tool.schema.string().optional().describe("Comma-separated tags"),
    title: tool.schema
      .string()
      .optional()
      .describe("Custom title (default: filename or frontmatter)"),
  },
  async execute({ path: filePath, tags, title }, ctx) {
    // Handle URLs directly
    if (isUrl(filePath)) {
      const args = ["add", filePath];
      if (tags) args.push("--tags", tags);
      if (title) args.push("--title", title);
      return runCli(args, EMBEDDING_TIMEOUT_MS, ctx?.abort);
    }

    // Resolve local path
    const resolvedPath = filePath.startsWith("~")
      ? filePath.replace("~", process.env.HOME || "")
      : filePath.startsWith("/")
        ? filePath
        : join(process.cwd(), filePath);

    if (!existsSync(resolvedPath)) {
      return `File not found: ${resolvedPath}`;
    }

    if (!isValidFile(resolvedPath)) {
      return "Unsupported file type. Use PDF or Markdown files.";
    }

    const args = ["add", resolvedPath];
    if (tags) args.push("--tags", tags);
    if (title) args.push("--title", title);

    // Embedding generation can be slow
    return runCli(args, EMBEDDING_TIMEOUT_MS, ctx?.abort);
  },
});

export const search = tool({
  description:
    "Semantic search across all documents using vector similarity (requires Ollama)",
  args: {
    query: tool.schema.string().describe("Natural language search query"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results (default: 10)"),
    tag: tool.schema.string().optional().describe("Filter by tag"),
    fts: tool.schema
      .boolean()
      .optional()
      .describe("Use full-text search only (skip embeddings)"),
    expand: tool.schema
      .number()
      .optional()
      .describe("Expand context around matches (max: 4000 chars)"),
  },
  async execute({ query, limit, tag, fts, expand }, ctx) {
    const args = ["search", query];
    if (limit) args.push("--limit", String(limit));
    if (tag) args.push("--tag", tag);
    if (fts) args.push("--fts");
    if (expand) args.push("--expand", String(Math.min(expand, 4000)));

    // Vector search needs Ollama for query embedding (unless fts-only)
    return runCli(args, fts ? DEFAULT_TIMEOUT_MS : 60_000, ctx?.abort);
  },
});

export const read = tool({
  description: "Get document details and metadata",
  args: {
    query: tool.schema.string().describe("Document ID or title"),
  },
  async execute({ query }, ctx) {
    return runCli(["read", query], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const list = tool({
  description: "List all documents in the library",
  args: {
    tag: tool.schema.string().optional().describe("Filter by tag"),
  },
  async execute({ tag }, ctx) {
    const args = ["list"];
    if (tag) args.push("--tag", tag);
    return runCli(args, DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const remove = tool({
  description: "Remove a document from the library",
  args: {
    query: tool.schema.string().describe("Document ID or title to remove"),
  },
  async execute({ query }, ctx) {
    return runCli(["remove", query], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const tag = tool({
  description: "Set tags on a document",
  args: {
    query: tool.schema.string().describe("Document ID or title"),
    tags: tool.schema.string().describe("Comma-separated tags to set"),
  },
  async execute({ query, tags }, ctx) {
    return runCli(["tag", query, tags], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const stats = tool({
  description: "Show library statistics (documents, chunks, embeddings)",
  args: {},
  async execute(_args, ctx) {
    return runCli(["stats"], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const check = tool({
  description: "Check if Ollama is ready for embedding generation",
  args: {},
  async execute(_args, ctx) {
    return runCli(["check"], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const repair = tool({
  description:
    "Fix database integrity issues - removes orphaned chunks/embeddings",
  args: {},
  async execute(_args, ctx) {
    return runCli(["repair"], DEFAULT_TIMEOUT_MS, ctx?.abort);
  },
});

export const exportLib = tool({
  description: "Export library database for backup or sharing",
  args: {
    output: tool.schema
      .string()
      .optional()
      .describe("Output file path (default: ./pdf-brain-export.tar.gz)"),
  },
  async execute({ output }, ctx) {
    const args = ["export"];
    if (output) args.push("--output", output);
    return runCli(args, 60_000, ctx?.abort);
  },
});

export const importLib = tool({
  description: "Import library database from export archive",
  args: {
    file: tool.schema.string().describe("Path to export archive"),
    force: tool.schema
      .boolean()
      .optional()
      .describe("Overwrite existing library"),
  },
  async execute({ file, force }, ctx) {
    const args = ["import", file];
    if (force) args.push("--force");
    return runCli(args, 60_000, ctx?.abort);
  },
});

export const migrate = tool({
  description: "Database migration utilities",
  args: {
    check: tool.schema
      .boolean()
      .optional()
      .describe("Check if migration is needed"),
    importFile: tool.schema
      .string()
      .optional()
      .describe("Import from SQL dump file"),
    generateScript: tool.schema
      .boolean()
      .optional()
      .describe("Generate export script for current database"),
  },
  async execute({ check, importFile, generateScript }, ctx) {
    const args = ["migrate"];
    if (check) args.push("--check");
    if (importFile) args.push("--import", importFile);
    if (generateScript) args.push("--generate-script");

    // If no flags, just run migrate (shows help)
    if (!check && !importFile && !generateScript) {
      args.push("--check");
    }

    return runCli(args, 60_000, ctx?.abort);
  },
});

export const batch_add = tool({
  description: "Add multiple PDFs/Markdown files from a directory",
  args: {
    dir: tool.schema.string().describe("Directory containing documents"),
    tags: tool.schema.string().optional().describe("Tags to apply to all"),
    recursive: tool.schema
      .boolean()
      .optional()
      .describe("Search subdirectories"),
  },
  async execute({ dir, tags, recursive = false }, ctx) {
    const resolvedDir = dir.startsWith("~")
      ? dir.replace("~", process.env.HOME || "")
      : dir.startsWith("/")
        ? dir
        : join(process.cwd(), dir);

    if (!existsSync(resolvedDir)) {
      return `Directory not found: ${resolvedDir}`;
    }

    // Find documents
    const { readdirSync } = await import("fs");

    function findDocs(dir: string, recurse: boolean): string[] {
      const results: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && recurse) {
          results.push(...findDocs(fullPath, true));
        } else if (entry.isFile() && isValidFile(entry.name)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const docList = findDocs(resolvedDir, recursive);

    if (docList.length === 0) {
      return `No PDF or Markdown files found in ${resolvedDir}`;
    }

    const results: string[] = [];

    for (const docPath of docList) {
      // Check for abort between iterations
      if (ctx?.abort?.aborted) {
        results.push("\n\nOperation cancelled - remaining files not processed");
        break;
      }

      const title = basename(docPath, extname(docPath));
      try {
        const args = ["add", docPath];
        if (tags) args.push("--tags", tags);

        const result = await runCli(args, EMBEDDING_TIMEOUT_MS, ctx?.abort);
        if (result.includes("✓") || result.includes("Already")) {
          results.push(`✓ ${title}`);
        } else {
          results.push(`✗ ${title}: ${result.slice(0, 100)}`);
        }
      } catch (e) {
        results.push(`✗ ${title}: ${e}`);
      }
    }

    return `# Batch Add Results (${docList.length} documents)\n\n${results.join("\n")}`;
  },
});
