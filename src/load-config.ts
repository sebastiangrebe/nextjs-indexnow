import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { IndexNowOptions } from "./types.js";

const CONFIG_CANDIDATES = [
  "indexnow.config.ts",
  "indexnow.config.mts",
  "indexnow.config.mjs",
  "indexnow.config.js",
  "indexnow.config.cjs",
];

const NEXT_CONFIG_CANDIDATES = [
  "next.config.ts",
  "next.config.mts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
];

/**
 * Resolve IndexNow options from one of:
 *   1. An explicit `indexnow.config.*` file
 *   2. The `__indexnow` field on the exported `next.config.*`
 *
 * Returns null if nothing is found so the CLI can produce an actionable error.
 */
export async function loadIndexNowConfig(cwd: string): Promise<IndexNowOptions | null> {
  for (const name of CONFIG_CANDIDATES) {
    const full = join(cwd, name);
    if (await exists(full)) {
      const mod = await importFile(full);
      const options = unwrap(mod);
      if (options) return options;
    }
  }

  for (const name of NEXT_CONFIG_CANDIDATES) {
    const full = join(cwd, name);
    if (await exists(full)) {
      try {
        const mod = await importFile(full);
        const config = unwrap(mod);
        if (config && typeof config === "object" && "__indexnow" in config) {
          return (config as { __indexnow: IndexNowOptions }).__indexnow;
        }
      } catch {
        // If next.config is TS and we can't load it without a TS loader, fall through.
        continue;
      }
    }
  }

  return null;
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
