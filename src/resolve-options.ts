import { FileStateAdapter } from "./state/file.js";
import type { IndexNowOptions, ResolvedOptions } from "./types.js";

export function resolveOptions(opts: IndexNowOptions): ResolvedOptions {
  if (!opts.host) throw new Error("IndexNow: `host` is required.");
  const cwd = opts.cwd ?? process.cwd();
  return {
    host: opts.host,
    keyEnv: opts.keyEnv ?? "INDEXNOW_KEY",
    keyLocation: opts.keyLocation ?? null,
    include: opts.include ?? ["/**"],
    exclude: opts.exclude ?? [],
    state: opts.state ?? new FileStateAdapter({ cwd }),
    endpoint: opts.endpoint ?? "https://api.indexnow.org/indexnow",
    submitEnv: opts.submitEnv ?? "INDEXNOW_SUBMIT",
    distDir: opts.distDir ?? ".next",
    cwd,
  };
}
