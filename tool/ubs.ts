import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";

/**
 * UBS - Ultimate Bug Scanner
 *
 * Multi-language bug scanner that catches what humans and AI miss:
 * null safety, XSS, async/await bugs, memory leaks, type coercion issues.
 *
 * Supports: JavaScript/TypeScript, Python, C/C++, Rust, Go, Java, Ruby, Swift
 *
 * Run BEFORE committing to catch bugs early. Exit 0 = clean, Exit 1 = issues found.
 */

async function runUbs(args: string[]): Promise<string> {
  try {
    const result = await $`ubs ${args}`.text();
    return result.trim();
  } catch (e: any) {
    // ubs exits non-zero when it finds issues - that's expected behavior
    const stdout = e.stdout?.toString() || "";
    const stderr = e.stderr?.toString() || "";
    if (stdout) return stdout.trim();
    if (stderr) return stderr.trim();
    return `Error: ${e.message || e}`;
  }
}

export const scan = tool({
  description:
    "Scan code for bugs: null safety, XSS, async/await issues, memory leaks, type coercion. Run BEFORE committing. Supports JS/TS, Python, C++, Rust, Go, Java, Ruby.",
  args: {
    path: tool.schema
      .string()
      .optional()
      .describe("Path to scan (default: current directory)"),
    only: tool.schema
      .string()
      .optional()
      .describe(
        "Restrict to languages: js,python,cpp,rust,golang,java,ruby,swift",
      ),
    staged: tool.schema
      .boolean()
      .optional()
      .describe("Scan only files staged for commit"),
    diff: tool.schema
      .boolean()
      .optional()
      .describe("Scan only modified files (working tree vs HEAD)"),
    failOnWarning: tool.schema
      .boolean()
      .optional()
      .describe("Exit non-zero if warnings exist (default for CI)"),
  },
  async execute({ path, only, staged, diff, failOnWarning }) {
    const args: string[] = [];
    if (staged) args.push("--staged");
    if (diff) args.push("--diff");
    if (only) args.push(`--only=${only}`);
    if (failOnWarning) args.push("--fail-on-warning");
    args.push(path || ".");
    return runUbs(args);
  },
});

export const scan_json = tool({
  description:
    "Scan code for bugs with JSON output. Better for parsing results programmatically.",
  args: {
    path: tool.schema
      .string()
      .optional()
      .describe("Path to scan (default: current directory)"),
    only: tool.schema
      .string()
      .optional()
      .describe(
        "Restrict to languages: js,python,cpp,rust,golang,java,ruby,swift",
      ),
  },
  async execute({ path, only }) {
    const args = ["--format=json", "--ci"];
    if (only) args.push(`--only=${only}`);
    args.push(path || ".");
    return runUbs(args);
  },
});

export const doctor = tool({
  description:
    "Check UBS health: validate modules, dependencies, and configuration.",
  args: {
    fix: tool.schema
      .boolean()
      .optional()
      .describe("Automatically download or refresh cached modules"),
  },
  async execute({ fix }) {
    const args = ["doctor"];
    if (fix) args.push("--fix");
    return runUbs(args);
  },
});
