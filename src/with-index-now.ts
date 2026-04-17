import type { IndexNowOptions } from "./types.js";

/**
 * Next.js config wrapper. Attaches the IndexNow options to the config under the
 * `__indexnow` field so the CLI can read them after `next build`.
 *
 * This wrapper does NOT run any build hooks — Turbopack silently ignores webpack
 * customizations, and we want the behavior to be identical across bundlers.
 * Run `nextjs-indexnow` from your `postbuild` script.
 */
export function withIndexNow<Config extends object>(
  nextConfig: Config,
  options: IndexNowOptions,
): Config & { __indexnow: IndexNowOptions } {
  if (!options.host || typeof options.host !== "string") {
    throw new Error("withIndexNow: `host` is required (e.g. \"example.com\").");
  }
  if (options.host.includes("://")) {
    throw new Error("withIndexNow: `host` must be a bare hostname, not a URL.");
  }
  return { ...nextConfig, __indexnow: options };
}
