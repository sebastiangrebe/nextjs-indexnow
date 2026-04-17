import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { IndexNowOptions } from "./types.js";

const STANDALONE_CANDIDATES = [
  "indexnow.config.mjs",
  "indexnow.config.js",
  "indexnow.config.cjs",
];

/**
 * Resolve IndexNow options, in priority order:
 *
 *   1. `.next/required-server-files.json` — Next writes the fully-resolved
 *      merged config here after every build. Reading the `__indexnow` field
 *      from this JSON avoids parsing `next.config.ts`/`.mjs` ourselves, so we
 *      don't need a TS loader and we benefit from every extension Next
 *      already supports natively.
 *
 *   2. A standalone `indexnow.config.{mjs,js,cjs}` in cwd — for users who
 *      don't want to touch `next.config`, or who use a custom `distDir`
 *      the default lookup can't find.
 *
 * Returns null if nothing is found so the CLI can produce an actionable error.
 */
export async function loadIndexNowConfig(
  cwd: string,
  distDir = ".next",
): Promise<IndexNowOptions | null> {
  const fromNext = await readFromNextBuild(cwd, distDir);
  if (fromNext) return fromNext;

  for (const name of STANDALONE_CANDIDATES) {
    const full = join(cwd, name);
    if (await exists(full)) {
      const mod = await importFile(full);
      const options = unwrap(mod);
      if (options) return options;
    }
  }

  return null;
}

async function readFromNextBuild(
  cwd: string,
  distDir: string,
): Promise<IndexNowOptions | null> {
  const path = join(cwd, distDir, "required-server-files.json");
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as { config?: { __indexnow?: IndexNowOptions } };
    const opts = parsed.config?.__indexnow;
    if (opts && typeof opts === "object" && typeof opts.host === "string") {
      return opts;
    }
    return null;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function importFile(absPath: string): Promise<unknown> {
  return import(pathToFileURL(absPath).href);
}

function unwrap(mod: unknown): IndexNowOptions | null {
  if (!mod || typeof mod !== "object") return null;
  const m = mod as Record<string, unknown>;
  const candidate = (m.default ?? m) as unknown;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as IndexNowOptions;
}
