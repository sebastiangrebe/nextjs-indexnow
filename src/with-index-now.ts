import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sidecarPath } from "./sidecar.js";
import type { IndexNowOptions } from "./types.js";

/**
 * Next.js config wrapper. Writes the IndexNow options to a sidecar file at
 * `node_modules/.cache/nextjs-indexnow/options.json` so the CLI can read them
 * after `next build`.
 *
 * We previously attached a `__indexnow` field directly to the Next config,
 * but Next validates its config and strips/warns on unknown top-level keys,
 * so the field never made it to the build output. Writing to a sidecar file
 * avoids that entirely and keeps the returned config 100% valid.
 *
 * This wrapper does NOT run any build hooks — Turbopack silently ignores
 * webpack customizations, and we want the behavior to be identical across
 * bundlers. Run `nextjs-indexnow` from your `postbuild` script.
 */
export function withIndexNow<Config extends object>(
  nextConfig: Config,
  options: IndexNowOptions,
): Config {
  if (!options.host || typeof options.host !== "string") {
    throw new Error("withIndexNow: `host` is required (e.g. \"example.com\").");
  }
  if (options.host.includes("://")) {
    throw new Error("withIndexNow: `host` must be a bare hostname, not a URL.");
  }

  writeSidecar(options);
  return nextConfig;
}

function writeSidecar(options: IndexNowOptions): void {
  try {
    const path = sidecarPath(process.cwd());
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(options, null, 2), "utf8");
  } catch (err) {
    // Don't fail the user's build if we can't write the sidecar — the CLI
    // will surface a clearer "no config found" error afterwards.
    if (process.env.DEBUG?.includes("nextjs-indexnow")) {
      console.warn(`[nextjs-indexnow] Failed to write sidecar: ${String(err)}`);
    }
  }
}
