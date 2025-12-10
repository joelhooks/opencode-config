import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { truncateOutput, MAX_OUTPUT } from "./tool-utils";

/**
 * Clone a repo locally and perform deep analysis
 * Uses the full local toolchain: rg, ast-grep, git, etc.
 */

const AUTOPSY_DIR = join(process.env.HOME || "~", ".opencode-autopsy");

/** Cache duration in ms - skip fetch if repo was updated within this time */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Track last fetch time per repo to avoid redundant fetches */
const lastFetchTime: Map<string, number> = new Map();

function parseRepoUrl(
  input: string,
): { owner: string; repo: string; url: string } | null {
  // Handle: owner/repo, github.com/owner/repo, https://github.com/owner/repo, git@github.com:owner/repo
  let owner: string, repo: string;

  if (input.includes("git@")) {
    const match = input.match(/git@github\.com:([^\/]+)\/(.+?)(?:\.git)?$/);
    if (!match) return null;
    owner = match[1];
    repo = match[2];
  } else {
    const match = input.match(
      /(?:(?:https?:\/\/)?github\.com\/)?([^\/]+)\/([^\/\s]+)/i,
    );
    if (!match) return null;
    owner = match[1];
    repo = match[2].replace(/\.git$/, "");
  }

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}.git`,
  };
}

async function ensureRepo(
  repoInput: string,
  signal?: AbortSignal,
  forceRefresh = false,
): Promise<
  { path: string; owner: string; repo: string; cached: boolean } | string
> {
  const parsed = parseRepoUrl(repoInput);
  if (!parsed) return "Invalid repo format. Use: owner/repo or GitHub URL";

  const { owner, repo, url } = parsed;
  const repoPath = join(AUTOPSY_DIR, owner, repo);
  const cacheKey = `${owner}/${repo}`;

  // Check abort before starting
  if (signal?.aborted) return "Operation cancelled";

  // Ensure autopsy directory exists
  await $`mkdir -p ${AUTOPSY_DIR}/${owner}`.quiet();

  if (signal?.aborted) return "Operation cancelled";

  if (existsSync(repoPath)) {
    // Check if we can skip fetch (cache hit)
    const lastFetch = lastFetchTime.get(cacheKey) || 0;
    const timeSinceLastFetch = Date.now() - lastFetch;

    if (!forceRefresh && timeSinceLastFetch < CACHE_TTL_MS) {
      // Cache hit - skip fetch
      return { path: repoPath, owner, repo, cached: true };
    }

    // Update existing repo
    try {
      await $`git -C ${repoPath} fetch --all --prune`.quiet();
      if (signal?.aborted) return "Operation cancelled";
      await $`git -C ${repoPath} reset --hard origin/HEAD`.quiet();
      lastFetchTime.set(cacheKey, Date.now());
    } catch {
      // If fetch fails, re-clone
      if (signal?.aborted) return "Operation cancelled";
      await $`rm -rf ${repoPath}`.quiet();
      await $`git clone --depth 100 ${url} ${repoPath}`.quiet();
      lastFetchTime.set(cacheKey, Date.now());
    }
  } else {
    // Clone fresh (shallow for speed, but enough history for blame)
    await $`git clone --depth 100 ${url} ${repoPath}`.quiet();
    lastFetchTime.set(cacheKey, Date.now());
  }

  if (signal?.aborted) return "Operation cancelled";

  return { path: repoPath, owner, repo, cached: false };
}

export const clone = tool({
  description:
    "Clone/update a GitHub repo locally for deep analysis. Returns the local path.",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    refresh: tool.schema
      .boolean()
      .optional()
      .describe("Force refresh even if cached"),
  },
  async execute({ repo, refresh = false }, ctx) {
    try {
      const result = await ensureRepo(repo, ctx?.abort, refresh);
      if (typeof result === "string") return result;

      const cacheStatus = result.cached ? "📦 (cached)" : "🔄 (fetched)";

      // Get basic stats in parallel for speed
      const [fileCount, languages] = await Promise.all([
        $`find ${result.path} -type f -not -path '*/.git/*' | wc -l`.text(),
        $`find ${result.path} -type f -not -path '*/.git/*' | sed 's/.*\\.//' | sort | uniq -c | sort -rn | head -10`.text(),
      ]);

      return `✓ Repo ready at: ${result.path} ${cacheStatus}

Files: ${fileCount.trim()}

Top extensions:
${languages.trim()}

Use other repo-autopsy tools to analyze:
- repo-autopsy_structure - directory tree
- repo-autopsy_search - ripgrep search
- repo-autopsy_ast - ast-grep patterns
- repo-autopsy_deps - dependency analysis
- repo-autopsy_hotspots - find complex/changed files
- repo-autopsy_exports - map public API`;
    } catch (e) {
      return `Failed to clone repo: ${e}`;
    }
  },
});

export const structure = tool({
  description: "Get detailed directory structure of cloned repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    path: tool.schema.string().optional().describe("Subpath to explore"),
    depth: tool.schema.number().optional().describe("Max depth (default: 4)"),
  },
  async execute({ repo, path = "", depth = 4 }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    const targetPath = path ? join(result.path, path) : result.path;

    try {
      // Use tree if available, fall back to find
      const tree =
        await $`tree -L ${depth} --dirsfirst -I '.git|node_modules|__pycache__|.venv|dist|build|.next' ${targetPath} 2>/dev/null || find ${targetPath} -maxdepth ${depth} -not -path '*/.git/*' -not -path '*/node_modules/*' | head -200`.text();
      return tree.trim();
    } catch (e) {
      return `Failed: ${e}`;
    }
  },
});

export const search = tool({
  description: "Ripgrep search in cloned repo - full regex power",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    pattern: tool.schema.string().describe("Regex pattern to search"),
    fileGlob: tool.schema
      .string()
      .optional()
      .describe("File glob filter (e.g., '*.ts')"),
    context: tool.schema
      .number()
      .optional()
      .describe("Lines of context (default: 2)"),
    maxResults: tool.schema
      .number()
      .optional()
      .describe("Max results (default: 50)"),
  },
  async execute(
    { repo, pattern, fileGlob, context = 2, maxResults = 50 },
    ctx,
  ) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      const globArg = fileGlob ? `--glob '${fileGlob}'` : "";
      const cmd = `rg '${pattern}' ${result.path} -C ${context} ${globArg} --max-count ${maxResults} -n --color never 2>/dev/null | head -500`;
      const output = await $`sh -c ${cmd}`.text();
      return truncateOutput(output.trim() || "No matches found");
    } catch {
      return "No matches found";
    }
  },
});

export const ast = tool({
  description: "AST-grep structural search in cloned repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    pattern: tool.schema
      .string()
      .describe(
        "ast-grep pattern (e.g., 'function $NAME($$$ARGS) { $$$BODY }')",
      ),
    lang: tool.schema
      .string()
      .optional()
      .describe("Language: ts, tsx, js, py, go, rust (default: auto)"),
  },
  async execute({ repo, pattern, lang }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      const langArg = lang ? `--lang ${lang}` : "";
      const output =
        await $`ast-grep --pattern ${pattern} ${langArg} ${result.path} 2>/dev/null | head -200`.text();
      return output.trim() || "No matches found";
    } catch (e) {
      return `ast-grep failed (installed?): ${e}`;
    }
  },
});

export const deps = tool({
  description: "Analyze dependencies in cloned repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
  },
  async execute({ repo }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    const outputs: string[] = [];

    // Node.js
    const pkgPath = join(result.path, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = await Bun.file(pkgPath).json();
        const deps = Object.keys(pkg.dependencies || {}).slice(0, 20);
        const devDeps = Object.keys(pkg.devDependencies || {}).slice(0, 15);

        outputs.push(`## Node.js (package.json)

Dependencies (${Object.keys(pkg.dependencies || {}).length}):
${deps.join(", ")}${Object.keys(pkg.dependencies || {}).length > 20 ? " ..." : ""}

DevDependencies (${Object.keys(pkg.devDependencies || {}).length}):
${devDeps.join(", ")}${Object.keys(pkg.devDependencies || {}).length > 15 ? " ..." : ""}`);
      } catch {}
    }

    // Python
    const pyprojectPath = join(result.path, "pyproject.toml");
    const requirementsPath = join(result.path, "requirements.txt");

    if (existsSync(requirementsPath)) {
      const reqs = await Bun.file(requirementsPath).text();
      const deps = reqs
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .slice(0, 20);
      outputs.push(`## Python (requirements.txt)\n${deps.join("\n")}`);
    } else if (existsSync(pyprojectPath)) {
      const content = await Bun.file(pyprojectPath).text();
      outputs.push(`## Python (pyproject.toml)\n${content.slice(0, 1500)}...`);
    }

    // Go
    const goModPath = join(result.path, "go.mod");
    if (existsSync(goModPath)) {
      const content = await Bun.file(goModPath).text();
      outputs.push(`## Go (go.mod)\n${content.slice(0, 1500)}`);
    }

    // Rust
    const cargoPath = join(result.path, "Cargo.toml");
    if (existsSync(cargoPath)) {
      const content = await Bun.file(cargoPath).text();
      outputs.push(`## Rust (Cargo.toml)\n${content.slice(0, 1500)}`);
    }

    return outputs.length ? outputs.join("\n\n") : "No dependency files found";
  },
});

export const hotspots = tool({
  description:
    "Find code hotspots - most changed files, largest files, most complex",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
  },
  async execute({ repo }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    // Run all analyses in parallel for speed
    const [churnResult, largestResult, todosResult, recentResult] =
      await Promise.allSettled([
        // Most changed files (churn)
        $`git -C ${result.path} log --oneline --name-only --pretty=format: | sort | uniq -c | sort -rn | grep -v '^$' | head -15`.text(),
        // Largest files
        $`fd -t f -E .git -E node_modules -E __pycache__ . ${result.path} --exec wc -l {} 2>/dev/null | sort -rn | head -15`.text(),
        // Files with most TODOs/FIXMEs
        $`rg -c 'TODO|FIXME|HACK|XXX' ${result.path} --glob '!.git' 2>/dev/null | sort -t: -k2 -rn | head -10`.text(),
        // Recent activity
        $`git -C ${result.path} log --oneline -20`.text(),
      ]);

    const outputs: string[] = [];

    if (churnResult.status === "fulfilled" && churnResult.value.trim()) {
      outputs.push(
        `## Most Changed Files (Git Churn)\n${churnResult.value.trim()}`,
      );
    }
    if (largestResult.status === "fulfilled" && largestResult.value.trim()) {
      outputs.push(
        `## Largest Files (by lines)\n${largestResult.value.trim()}`,
      );
    }
    if (todosResult.status === "fulfilled" && todosResult.value.trim()) {
      outputs.push(`## Most TODOs/FIXMEs\n${todosResult.value.trim()}`);
    }
    if (recentResult.status === "fulfilled" && recentResult.value.trim()) {
      outputs.push(`## Recent Commits\n${recentResult.value.trim()}`);
    }

    return truncateOutput(outputs.join("\n\n"));
  },
});

export const stats = tool({
  description:
    "Code statistics - lines of code, languages, file counts (uses tokei)",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
  },
  async execute({ repo }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      const stats =
        await $`tokei ${result.path} --exclude .git --exclude node_modules --exclude vendor --exclude __pycache__ 2>/dev/null`.text();
      return stats.trim();
    } catch (e) {
      return `tokei failed: ${e}`;
    }
  },
});

export const secrets = tool({
  description: "Scan for leaked secrets in repo (uses gitleaks)",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
  },
  async execute({ repo }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      // gitleaks returns non-zero if it finds secrets, so we catch
      const output =
        await $`gitleaks detect --source ${result.path} --no-banner -v 2>&1`
          .text()
          .catch((e) => e.stdout || e.message);

      if (output.includes("no leaks found")) {
        return "✓ No secrets detected";
      }

      // Truncate if too long
      if (output.length > 5000) {
        return output.slice(0, 5000) + "\n\n... (truncated)";
      }

      return output.trim() || "Scan complete (check output)";
    } catch (e) {
      return `gitleaks failed: ${e}`;
    }
  },
});

export const find = tool({
  description: "Fast file finding with fd (better than find)",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    pattern: tool.schema.string().describe("File name pattern (regex)"),
    type: tool.schema
      .enum(["f", "d", "l", "x"])
      .optional()
      .describe("Type: f=file, d=dir, l=symlink, x=executable"),
    extension: tool.schema
      .string()
      .optional()
      .describe("Filter by extension (e.g., 'ts')"),
  },
  async execute({ repo, pattern, type, extension }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      const typeArg = type ? `-t ${type}` : "";
      const extArg = extension ? `-e ${extension}` : "";
      const output =
        await $`fd ${pattern} ${result.path} ${typeArg} ${extArg} -E .git -E node_modules 2>/dev/null | head -50`.text();
      return output.trim() || "No matches";
    } catch {
      return "No matches";
    }
  },
});

export const exports_map = tool({
  description: "Map public API - all exports from a repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    entryPoint: tool.schema
      .string()
      .optional()
      .describe("Entry point to analyze (e.g., 'src/index.ts')"),
  },
  async execute({ repo, entryPoint }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    const outputs: string[] = [];

    // Find main entry points if not specified
    if (!entryPoint) {
      const possibleEntries = [
        "src/index.ts",
        "src/index.tsx",
        "src/index.js",
        "lib/index.ts",
        "lib/index.js",
        "index.ts",
        "index.js",
        "src/main.ts",
        "src/main.js",
        "mod.ts", // Deno
      ];

      for (const entry of possibleEntries) {
        if (existsSync(join(result.path, entry))) {
          entryPoint = entry;
          break;
        }
      }
    }

    // Run all export searches in parallel
    const [namedResult, defaultResult, reexportResult] =
      await Promise.allSettled([
        $`rg "^export (const|function|class|type|interface|enum|let|var) " ${result.path} --glob '*.ts' --glob '*.tsx' --glob '*.js' -o -N 2>/dev/null | sort | uniq -c | sort -rn | head -30`.text(),
        $`rg "^export default" ${result.path} --glob '*.ts' --glob '*.tsx' --glob '*.js' -l 2>/dev/null | head -20`.text(),
        $`rg "^export \\* from|^export \\{[^}]+\\} from" ${result.path} --glob '*.ts' --glob '*.tsx' --glob '*.js' 2>/dev/null | head -30`.text(),
      ]);

    if (namedResult.status === "fulfilled" && namedResult.value.trim()) {
      outputs.push(`## Named Exports\n${namedResult.value.trim()}`);
    }
    if (defaultResult.status === "fulfilled" && defaultResult.value.trim()) {
      outputs.push(
        `## Files with Default Exports\n${defaultResult.value.trim()}`,
      );
    }
    if (reexportResult.status === "fulfilled" && reexportResult.value.trim()) {
      outputs.push(`## Re-exports\n${reexportResult.value.trim()}`);
    }

    // Read entry point if found
    if (entryPoint) {
      const entryPath = join(result.path, entryPoint);
      if (existsSync(entryPath)) {
        const content = await Bun.file(entryPath).text();
        outputs.unshift(
          `## Entry Point: ${entryPoint}\n\`\`\`typescript\n${content.slice(0, 2000)}${content.length > 2000 ? "\n// ... truncated" : ""}\n\`\`\``,
        );
      }
    }

    return truncateOutput(outputs.join("\n\n") || "No exports found");
  },
});

export const file = tool({
  description: "Read a file from cloned repo with optional line range",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    path: tool.schema.string().describe("File path within repo"),
    startLine: tool.schema
      .number()
      .optional()
      .describe("Start line (1-indexed)"),
    endLine: tool.schema.number().optional().describe("End line"),
  },
  async execute({ repo, path, startLine, endLine }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    const filePath = join(result.path, path);

    if (!existsSync(filePath)) {
      return `File not found: ${path}`;
    }

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split("\n");

      if (startLine || endLine) {
        const start = (startLine || 1) - 1;
        const end = endLine || lines.length;
        const slice = lines.slice(start, end);
        return slice.map((l, i) => `${start + i + 1}: ${l}`).join("\n");
      }

      // Add line numbers and truncate if needed
      if (lines.length > 500) {
        return (
          lines
            .slice(0, 500)
            .map((l, i) => `${i + 1}: ${l}`)
            .join("\n") + `\n\n... (${lines.length - 500} more lines)`
        );
      }

      return lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
    } catch (e) {
      return `Failed to read file: ${e}`;
    }
  },
});

export const blame = tool({
  description: "Git blame for a file - who wrote what",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    path: tool.schema.string().describe("File path within repo"),
    startLine: tool.schema.number().optional().describe("Start line"),
    endLine: tool.schema.number().optional().describe("End line"),
  },
  async execute({ repo, path, startLine, endLine }, ctx) {
    const result = await ensureRepo(repo, ctx?.abort);
    if (typeof result === "string") return result;

    try {
      const lineRange =
        startLine && endLine ? `-L ${startLine},${endLine}` : "";
      const output =
        await $`git -C ${result.path} blame ${lineRange} --date=short ${path} 2>/dev/null | head -100`.text();
      return output.trim() || "No blame info";
    } catch (e) {
      return `Blame failed: ${e}`;
    }
  },
});

export const cleanup = tool({
  description: "Remove a cloned repo from local autopsy cache",
  args: {
    repo: tool.schema
      .string()
      .describe("GitHub repo (owner/repo or URL) or 'all' to clear everything"),
  },
  async execute({ repo }, ctx) {
    if (repo === "all") {
      await $`rm -rf ${AUTOPSY_DIR}`.quiet();
      return `Cleared all repos from ${AUTOPSY_DIR}`;
    }

    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format";

    const repoPath = join(AUTOPSY_DIR, parsed.owner, parsed.repo);
    if (existsSync(repoPath)) {
      await $`rm -rf ${repoPath}`.quiet();
      return `Removed: ${repoPath}`;
    }

    return "Repo not in cache";
  },
});
