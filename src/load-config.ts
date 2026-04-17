import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sidecarPath } from "./sidecar.js";
import type { IndexNowOptions } from "./types.js";

const STANDALONE_CANDIDATES = [
  "indexnow.config.mjs",
  "indexnow.config.js",
  "indexnow.config.cjs",
];

/**
 * Resolve IndexNow options, in priority order:
 *
 *   1. `node_modules/.cache/nextjs-indexnow/options.json` — the sidecar file
 *      written by `withIndexNow` when Next imports `next.config.*`. This
 *      works regardless of config file extension (.ts/.mjs/.js/.cjs) because
 *      Next loads the config itself.
 *
 *   2. A standalone `indexnow.config.{mjs,js,cjs}` in cwd — for users who
 *      don't wrap their Next config at all.
 *
 * Returns null if nothing is found so the CLI can produce an actionable error.
 */
export async function loadIndexNowConfig(
  cwd: string,
): Promise<IndexNowOptions | null> {
  const fromSidecar = await readSidecar(cwd);
  if (fromSidecar) return fromSidecar;

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

async function readSidecar(cwd: string): Promise<IndexNowOptions | null> {
  try {
    const raw = await readFile(sidecarPath(cwd), "utf8");
    const parsed = JSON.parse(raw) as IndexNowOptions;
    if (parsed && typeof parsed.host === "string") return parsed;
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
