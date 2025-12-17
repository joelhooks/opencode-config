/**
 * Notify Plugin - plays system sounds on task completion
 *
 * Uses macOS afplay to play system sounds when:
 * - Session becomes idle (response complete)
 * - Swarm completes successfully
 * - Swarm fails/aborts
 */

import { spawn } from "node:child_process";
import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin";

const SOUNDS = {
  /** Task/response completed */
  complete: "/System/Library/Sounds/Ping.aiff",
  /** Swarm finished successfully */
  success: "/System/Library/Sounds/Glass.aiff",
  /** Error or abort */
  error: "/System/Library/Sounds/Basso.aiff",
} as const;

/**
 * Play a system sound (non-blocking)
 */
function playSound(sound: keyof typeof SOUNDS): void {
  try {
    spawn("afplay", [SOUNDS[sound]], {
      stdio: "ignore",
      detached: true,
    }).unref();
  } catch {
    // Silently fail if afplay not available (non-macOS)
  }
}

export const NotifyPlugin: Plugin = async (
  _input: PluginInput,
): Promise<Hooks> => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        playSound("complete");
      }
    },

    "tool.execute.after": async (toolInput, output) => {
      // Swarm finalization success
      if (
        toolInput.tool === "swarm_finalize" ||
        toolInput.tool === "swarm_complete"
      ) {
        try {
          const result = JSON.parse(output.output ?? "{}");
          if (result.success) {
            playSound("success");
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Swarm abort
      if (toolInput.tool === "swarm_abort") {
        playSound("error");
      }

      // Beads sync (session end)
      if (toolInput.tool === "beads_sync") {
        try {
          const result = JSON.parse(output.output ?? "{}");
          if (result.success) {
            playSound("success");
          }
        } catch {
          // Ignore parse errors
        }
      }
    },
  };
};

export default NotifyPlugin;
