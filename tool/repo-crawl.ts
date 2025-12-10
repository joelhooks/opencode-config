import { tool } from "@opencode-ai/plugin";
import { truncateOutput } from "./tool-utils";

/**
 * Crawl a GitHub repo via GitHub API - no local clone needed
 * Supports GITHUB_TOKEN env var for higher rate limits (5000/hr vs 60/hr)
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

/** Get auth headers if GITHUB_TOKEN is set */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "opencode-repo-crawl",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGH(path: string, signal?: AbortSignal) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: getAuthHeaders(),
    signal,
  });
  if (!res.ok) {
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        const resetTime = res.headers.get("X-RateLimit-Reset");
        const resetDate = resetTime
          ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString()
          : "soon";
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetDate}. Set GITHUB_TOKEN for 5000 req/hr.`,
        );
      }
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

async function fetchRaw(
  owner: string,
  repo: string,
  path: string,
  signal?: AbortSignal,
) {
  const res = await fetch(`${GITHUB_RAW}/${owner}/${repo}/main/${path}`, {
    headers: getAuthHeaders(),
    signal,
  });
  if (!res.ok) {
    // Try master branch
    const res2 = await fetch(`${GITHUB_RAW}/${owner}/${repo}/master/${path}`, {
      headers: getAuthHeaders(),
      signal,
    });
    if (!res2.ok) return null;
    return res2.text();
  }
  return res.text();
}

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  // Handle: owner/repo, github.com/owner/repo, https://github.com/owner/repo
  const match = input.match(/(?:github\.com\/)?([^\/]+)\/([^\/\s]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export const structure = tool({
  description:
    "Get repo structure - directories, key files, tech stack detection",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    depth: tool.schema
      .number()
      .optional()
      .describe("Max depth to crawl (default: 2)"),
  },
  async execute({ repo, depth = 2 }, ctx) {
    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format. Use: owner/repo or GitHub URL";

    const { owner, repo: repoName } = parsed;
    const signal = ctx?.abort;

    try {
      // Get repo info and root contents in parallel
      const [repoInfo, contents] = await Promise.all([
        fetchGH(`/repos/${owner}/${repoName}`, signal),
        fetchGH(`/repos/${owner}/${repoName}/contents`, signal),
      ]);

      // Categorize files
      const dirs: string[] = [];
      const files: string[] = [];
      const keyFiles: string[] = [];

      const KEY_PATTERNS = [
        /^readme/i,
        /^package\.json$/,
        /^tsconfig/,
        /^\.env\.example$/,
        /^docker/i,
        /^makefile$/i,
        /^cargo\.toml$/,
        /^go\.mod$/,
        /^pyproject\.toml$/,
        /^requirements\.txt$/,
        /^setup\.py$/,
        /^pom\.xml$/,
        /^build\.gradle/,
      ];

      for (const item of contents) {
        if (item.type === "dir") {
          dirs.push(item.name + "/");
        } else {
          files.push(item.name);
          if (KEY_PATTERNS.some((p) => p.test(item.name))) {
            keyFiles.push(item.name);
          }
        }
      }

      // Detect tech stack
      const stack: string[] = [];
      if (files.includes("package.json")) stack.push("Node.js");
      if (files.some((f) => f.includes("tsconfig"))) stack.push("TypeScript");
      if (files.includes("Cargo.toml")) stack.push("Rust");
      if (files.includes("go.mod")) stack.push("Go");
      if (
        files.includes("pyproject.toml") ||
        files.includes("setup.py") ||
        files.includes("requirements.txt")
      )
        stack.push("Python");
      if (
        files.includes("pom.xml") ||
        files.some((f) => f.includes("build.gradle"))
      )
        stack.push("Java/Kotlin");
      if (dirs.includes("src/")) stack.push("src/ structure");
      if (dirs.includes("lib/")) stack.push("lib/ structure");
      if (dirs.includes("app/")) stack.push("app/ structure (Next.js/Rails?)");
      if (dirs.includes("pages/")) stack.push("pages/ (Next.js Pages Router?)");

      // Get subdir contents for depth > 1
      let subdirs = "";
      if (depth > 1) {
        const importantDirs = [
          "src",
          "lib",
          "app",
          "packages",
          "examples",
          "core",
        ];
        for (const dir of dirs) {
          const dirName = dir.replace("/", "");
          if (importantDirs.includes(dirName)) {
            try {
              const subContents = await fetchGH(
                `/repos/${owner}/${repoName}/contents/${dirName}`,
                signal,
              );
              const subItems = subContents.map((i: any) =>
                i.type === "dir" ? i.name + "/" : i.name,
              );
              subdirs += `\n  ${dir}\n    ${subItems.slice(0, 15).join(", ")}${subContents.length > 15 ? ` (+${subContents.length - 15} more)` : ""}`;
            } catch {
              // skip if error
            }
          }
        }
      }

      return `# ${owner}/${repoName}

${repoInfo.description || "(no description)"}

⭐ ${repoInfo.stargazers_count} | 🍴 ${repoInfo.forks_count} | 📅 Updated: ${new Date(repoInfo.updated_at).toLocaleDateString()}

## Tech Stack
${stack.length ? stack.join(", ") : "Unknown"}

## Structure
Directories: ${dirs.join(", ") || "(none)"}
Root files: ${files.slice(0, 10).join(", ")}${files.length > 10 ? ` (+${files.length - 10} more)` : ""}

## Key Files
${keyFiles.join(", ") || "(none detected)"}
${subdirs ? `\n## Important Subdirs${subdirs}` : ""}`;
    } catch (e) {
      return `Failed to fetch repo: ${e}`;
    }
  },
});

export const readme = tool({
  description: "Get repo README content",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    maxLength: tool.schema
      .number()
      .optional()
      .describe("Max chars to return (default: 5000)"),
  },
  async execute({ repo, maxLength = 5000 }, ctx) {
    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format";

    const { owner, repo: repoName } = parsed;
    const signal = ctx?.abort;

    // Try common README names
    const names = [
      "README.md",
      "readme.md",
      "README",
      "README.rst",
      "README.txt",
    ];

    for (const name of names) {
      if (signal?.aborted) return "Operation cancelled";
      const content = await fetchRaw(owner, repoName, name, signal);
      if (content) {
        return truncateOutput(content, maxLength);
      }
    }

    return "No README found";
  },
});

export const file = tool({
  description: "Get a specific file from a GitHub repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    path: tool.schema.string().describe("File path within repo"),
    maxLength: tool.schema
      .number()
      .optional()
      .describe("Max chars to return (default: 10000)"),
  },
  async execute({ repo, path, maxLength = 10000 }, ctx) {
    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format";

    const { owner, repo: repoName } = parsed;
    const content = await fetchRaw(owner, repoName, path, ctx?.abort);

    if (!content) return `File not found: ${path}`;

    return truncateOutput(content, maxLength);
  },
});

export const tree = tool({
  description: "Get directory tree of a path in a GitHub repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    path: tool.schema
      .string()
      .optional()
      .describe("Directory path (default: root)"),
    maxDepth: tool.schema
      .number()
      .optional()
      .describe("Max depth (default: 3)"),
  },
  async execute({ repo, path = "", maxDepth = 3 }, ctx) {
    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format";

    const { owner, repo: repoName } = parsed;
    const signal = ctx?.abort;

    async function getTree(
      p: string,
      depth: number,
      prefix: string,
    ): Promise<string> {
      if (depth > maxDepth) return "";
      if (signal?.aborted) return "";

      try {
        const contents = await fetchGH(
          `/repos/${owner}/${repoName}/contents/${p}`,
          signal,
        );
        let result = "";

        // Sort: dirs first, then files
        const sorted = contents.sort((a: any, b: any) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "dir" ? -1 : 1;
        });

        for (let i = 0; i < sorted.length && i < 50; i++) {
          const item = sorted[i];
          const isLast = i === Math.min(sorted.length, 50) - 1;
          const connector = isLast ? "└── " : "├── ";
          const newPrefix = prefix + (isLast ? "    " : "│   ");

          result += `${prefix}${connector}${item.name}${item.type === "dir" ? "/" : ""}\n`;

          if (item.type === "dir" && depth < maxDepth) {
            result += await getTree(item.path, depth + 1, newPrefix);
          }
        }

        if (sorted.length > 50) {
          result += `${prefix}... (+${sorted.length - 50} more)\n`;
        }

        return result;
      } catch {
        return "";
      }
    }

    const tree = await getTree(path, 1, "");
    return tree || "Empty or not found";
  },
});

export const search = tool({
  description: "Search for code in a GitHub repo",
  args: {
    repo: tool.schema.string().describe("GitHub repo (owner/repo or URL)"),
    query: tool.schema.string().describe("Search query"),
    maxResults: tool.schema
      .number()
      .optional()
      .describe("Max results (default: 10)"),
  },
  async execute({ repo, query, maxResults = 10 }, ctx) {
    const parsed = parseRepoUrl(repo);
    if (!parsed) return "Invalid repo format";

    const { owner, repo: repoName } = parsed;

    try {
      const searchQuery = encodeURIComponent(
        `${query} repo:${owner}/${repoName}`,
      );
      const results = await fetchGH(
        `/search/code?q=${searchQuery}&per_page=${maxResults}`,
        ctx?.abort,
      );

      if (!results.items?.length) return `No results for: ${query}`;

      const formatted = results.items
        .slice(0, maxResults)
        .map((item: any) => `${item.path}`)
        .join("\n");

      return `Found ${results.total_count} results (showing ${Math.min(maxResults, results.items.length)}):\n\n${formatted}`;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return "Operation cancelled";
      }
      return `Search failed: ${e}`;
    }
  },
});
