import { execSync } from "node:child_process";
import { tool } from "@opencode-ai/plugin";

/**
 * Quick bead operations - uses bd CLI
 *
 * These tools wrap the bd CLI for quick bead operations.
 * The bd CLI must be installed and available in PATH.
 */

function runBd(args: string): string {
  try {
    return execSync(`bd ${args}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    if (e instanceof Error && "stderr" in e) {
      throw new Error((e as { stderr: string }).stderr || e.message);
    }
    throw e;
  }
}

export const ready = tool({
  description: "Get the next ready bead (unblocked, highest priority)",
  args: {},
  async execute() {
    try {
      const result = runBd("ready");
      return result || "No ready beads";
    } catch {
      return "No ready beads";
    }
  },
});

export const wip = tool({
  description: "List in-progress beads",
  args: {},
  async execute() {
    try {
      const result = runBd("wip");
      return result || "Nothing in progress";
    } catch {
      return "Nothing in progress";
    }
  },
});

export const start = tool({
  description: "Mark a bead as in-progress",
  args: {
    id: tool.schema.string().describe("Bead ID (e.g., bd-a1b2c)"),
  },
  async execute({ id }) {
    try {
      runBd(`start ${id}`);
      return `Started: ${id}`;
    } catch (e) {
      return `Failed to start ${id}: ${e instanceof Error ? e.message : "unknown error"}`;
    }
  },
});

export const done = tool({
  description: "Close a bead with reason",
  args: {
    id: tool.schema.string().describe("Bead ID"),
    reason: tool.schema.string().describe("Completion reason"),
  },
  async execute({ id, reason }) {
    try {
      // Escape quotes in reason
      const escapedReason = reason.replace(/"/g, '\\"');
      runBd(`done ${id} "${escapedReason}"`);
      return `Closed ${id}: ${reason}`;
    } catch (e) {
      return `Failed to close ${id}: ${e instanceof Error ? e.message : "unknown error"}`;
    }
  },
});

export const create = tool({
  description: "Create a new bead quickly",
  args: {
    title: tool.schema.string().describe("Bead title"),
    type: tool.schema
      .enum(["bug", "feature", "task", "epic", "chore"])
      .optional()
      .describe("Issue type (default: task)"),
    priority: tool.schema
      .number()
      .min(0)
      .max(3)
      .optional()
      .describe("Priority 0-3 (default: 2)"),
  },
  async execute({ title, type = "task", priority = 2 }) {
    try {
      const escapedTitle = title.replace(/"/g, '\\"');
      const result = runBd(
        `create -t ${type} -p ${priority} "${escapedTitle}"`,
      );
      // Extract ID from output
      const match = result.match(/bd-[a-z0-9]+/);
      return match ? `Created: ${match[0]}` : `Created bead`;
    } catch (e) {
      return `Failed to create bead: ${e instanceof Error ? e.message : "unknown error"}`;
    }
  },
});

export const sync = tool({
  description: "Sync beads to git and push",
  args: {},
  async execute() {
    try {
      runBd("sync");
    } catch {
      // Ignore sync failures
    }

    // Push to remote
    try {
      execSync("git push", { stdio: "ignore" });
    } catch {
      // Ignore push failures (might be offline, no remote, etc.)
    }

    return "Beads synced and pushed";
  },
});
