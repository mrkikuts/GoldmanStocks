import Anthropic from "@anthropic-ai/sdk";

/** Server-only Claude access. The `.server.ts` suffix keeps this out of the browser bundle. */

export const MODEL = "claude-opus-5";
/** Server-side refusal fallback: a declined request is re-run on Anthropic's recommended model. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** A failure with a message that's safe and useful to show the boss. */
export class LlmError extends Error {
  override name = "LlmError";
}

let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!process.env["ANTHROPIC_API_KEY"]) {
    throw new LlmError(
      "ANTHROPIC_API_KEY is not set — add it to .env and restart the dev server.",
    );
  }
  client ??= new Anthropic();
  return client;
}

/** Turn SDK errors into a readable message (most specific first); pass LlmErrors through. */
export function toLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (error instanceof Anthropic.AuthenticationError) {
    return new LlmError(
      "The Anthropic API key was rejected — check ANTHROPIC_API_KEY.",
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new LlmError(
      "Claude is rate-limited right now — try again in a minute.",
    );
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new LlmError(
      "Couldn't reach the Anthropic API — check the network.",
    );
  }
  if (error instanceof Anthropic.APIError) {
    return new LlmError(
      `Claude request failed (${error.status ?? "no status"}).`,
    );
  }
  return new LlmError("Claude request failed.");
}

/** Throw a readable error when Claude (and the fallback) declined the request. */
export function assertNotRefused(message: { stop_reason: string | null }) {
  if (message.stop_reason === "refusal") {
    throw new LlmError("Claude declined this request.");
  }
}
