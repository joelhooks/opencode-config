import { tool } from "@opencode-ai/plugin";
import { existsSync } from "fs";
import { join, basename } from "path";
import { spawn } from "child_process";

/**
 * PDF Brain - Local PDF knowledge base with vector search
 *
 * Uses PGlite + pgvector for semantic search via Ollama embeddings.
 * Stores in ~/Documents/.pdf-library/ for iCloud sync.
 */

const DEFAULT_TIMEOUT_MS = 30_000; // 30s default
const EMBEDDING_TIMEOUT_MS = 120_000; // 2min for operations that generate embeddings

async function runCli(
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve) => {
    // Use bunx for faster execution than npx (no registry check if cached)
    const proc = spawn("bunx", ["pdf-brain", ...args], {
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

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (killed) return;

      if (code === 0) {
        resolve(stdout.trim());
      } else {
        resolve(`Error (exit ${code}): ${stderr || stdout}`.trim());
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      if (killed) return;
      resolve(`Error: ${err.message}`);
    });
  });
}

export const add = tool({
  description:
    "Add a PDF to the library - extracts text, generates embeddings for semantic search",
  args: {
    path: tool.schema.string().describe("Path to PDF file"),
    tags: tool.schema.string().optional().describe("Comma-separated tags"),
    title: tool.schema
      .string()
      .optional()
      .describe("Custom title (default: filename)"),
  },
  async execute({ path: pdfPath, tags, title }) {
    // Resolve path
    const resolvedPath = pdfPath.startsWith("~")
      ? pdfPath.replace("~", process.env.HOME || "")
      : pdfPath.startsWith("/")
        ? pdfPath
        : join(process.cwd(), pdfPath);

    if (!existsSync(resolvedPath)) {
      return `File not found: ${resolvedPath}`;
    }

    if (!resolvedPath.toLowerCase().endsWith(".pdf")) {
      return "Not a PDF file";
    }

    const args = ["add", resolvedPath];
    if (tags) args.push("--tags", tags);
    if (title) args.push("--title", title);

    // Embedding generation can be slow
    return runCli(args, EMBEDDING_TIMEOUT_MS);
  },
});

export const search = tool({
  description:
    "Semantic search across all PDFs using vector similarity (requires Ollama)",
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
      .describe("Use full-text search only (no embeddings)"),
  },
  async execute({ query, limit, tag, fts }) {
    const args = ["search", query];
    if (limit) args.push("--limit", String(limit));
    if (tag) args.push("--tag", tag);
    if (fts) args.push("--fts");

    // Vector search needs Ollama for query embedding (unless fts-only)
    return runCli(args, fts ? DEFAULT_TIMEOUT_MS : 60_000);
  },
});

export const read = tool({
  description: "Get details about a specific PDF in the library",
  args: {
    query: tool.schema.string().describe("PDF ID or title"),
  },
  async execute({ query }) {
    return runCli(["get", query]);
  },
});

export const list = tool({
  description: "List all PDFs in the library",
  args: {
    tag: tool.schema.string().optional().describe("Filter by tag"),
  },
  async execute({ tag }) {
    const args = ["list"];
    if (tag) args.push("--tag", tag);
    return runCli(args);
  },
});

export const remove = tool({
  description: "Remove a PDF from the library",
  args: {
    query: tool.schema.string().describe("PDF ID or title to remove"),
  },
  async execute({ query }) {
    return runCli(["remove", query]);
  },
});

export const tag = tool({
  description: "Set tags on a PDF",
  args: {
    query: tool.schema.string().describe("PDF ID or title"),
    tags: tool.schema.string().describe("Comma-separated tags to set"),
  },
  async execute({ query, tags }) {
    return runCli(["tag", query, tags]);
  },
});

export const stats = tool({
  description: "Show library statistics (documents, chunks, embeddings)",
  args: {},
  async execute() {
    return runCli(["stats"]);
  },
});

export const check = tool({
  description: "Check if Ollama is ready for embedding generation",
  args: {},
  async execute() {
    return runCli(["check"]);
  },
});

export const batch_add = tool({
  description: "Add multiple PDFs from a directory",
  args: {
    dir: tool.schema.string().describe("Directory containing PDFs"),
    tags: tool.schema.string().optional().describe("Tags to apply to all"),
    recursive: tool.schema
      .boolean()
      .optional()
      .describe("Search subdirectories"),
  },
  async execute({ dir, tags, recursive = false }) {
    const resolvedDir = dir.startsWith("~")
      ? dir.replace("~", process.env.HOME || "")
      : dir.startsWith("/")
        ? dir
        : join(process.cwd(), dir);

    if (!existsSync(resolvedDir)) {
      return `Directory not found: ${resolvedDir}`;
    }

    // Find PDFs
    const { readdirSync, statSync } = await import("fs");

    function findPdfs(dir: string, recurse: boolean): string[] {
      const results: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && recurse) {
          results.push(...findPdfs(fullPath, true));
        } else if (
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".pdf")
        ) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const pdfList = findPdfs(resolvedDir, recursive);

    if (pdfList.length === 0) {
      return `No PDFs found in ${resolvedDir}`;
    }

    const results: string[] = [];

    for (const pdfPath of pdfList) {
      const title = basename(pdfPath, ".pdf");
      try {
        const args = ["add", pdfPath];
        if (tags) args.push("--tags", tags);

        const result = await runCli(args, EMBEDDING_TIMEOUT_MS);
        if (result.includes("✓") || result.includes("Already")) {
          results.push(`✓ ${title}`);
        } else {
          results.push(`✗ ${title}: ${result.slice(0, 100)}`);
        }
      } catch (e) {
        results.push(`✗ ${title}: ${e}`);
      }
    }

    return `# Batch Add Results (${pdfList.length} PDFs)\n\n${results.join("\n")}`;
  },
});
