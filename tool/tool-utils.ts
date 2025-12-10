/**
 * Maximum output length for tool responses (30K characters)
 * OpenCode caps tool output at this limit to prevent context exhaustion
 */
export const MAX_OUTPUT = 30_000;

/**
 * Truncates tool output to a maximum length with a clear truncation message.
 *
 * @param output - The string output to potentially truncate
 * @param maxLength - Maximum allowed length (default: MAX_OUTPUT)
 * @returns Original string if under limit, otherwise truncated with notice
 *
 * @example
 * ```ts
 * const result = truncateOutput(largeString)
 * // Returns: "content...[Output truncated at 30000 chars. 5000 chars omitted.]"
 * ```
 */
export function truncateOutput(
  output: string,
  maxLength: number = MAX_OUTPUT,
): string {
  if (output.length <= maxLength) return output;

  return (
    output.slice(0, maxLength) +
    `\n\n[Output truncated at ${maxLength} chars. ${output.length - maxLength} chars omitted.]`
  );
}

/**
 * Formats an unknown error into a consistent string representation.
 * Handles Error objects, strings, and other types gracefully.
 *
 * @param error - The error to format (unknown type from catch blocks)
 * @returns Formatted error string with stack trace when available
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   return formatError(error)
 * }
 * ```
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    const stackLines = error.stack?.split("\n").slice(0, 5).join("\n") || "";
    return `${error.name}: ${error.message}${stackLines ? `\n\nStack trace (first 5 lines):\n${stackLines}` : ""}`;
  }

  if (typeof error === "string") {
    return `Error: ${error}`;
  }

  if (error && typeof error === "object") {
    try {
      return `Error: ${JSON.stringify(error, null, 2)}`;
    } catch {
      return `Error: ${String(error)}`;
    }
  }

  return `Unknown error: ${String(error)}`;
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within the specified time.
 *
 * @param promise - The promise to wrap with a timeout
 * @param ms - Timeout in milliseconds
 * @returns Promise that resolves with the original value or rejects on timeout
 * @throws {Error} "Operation timed out after {ms}ms" if timeout is reached
 *
 * @example
 * ```ts
 * try {
 *   const result = await withTimeout(fetchData(), 5000)
 * } catch (error) {
 *   // Handle timeout or other errors
 * }
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms,
    ),
  );

  return Promise.race([promise, timeout]);
}
