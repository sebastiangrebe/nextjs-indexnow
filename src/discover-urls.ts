import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import picomatch from "picomatch";
import type { DiscoveredUrl } from "./types.js";

interface PrerenderManifest {
  version: number;
  routes: Record<
    string,
    {
      srcRoute?: string | null;
      dataRoute?: string | null;
      initialRevalidateSeconds?: number | false;
      renderingMode?: string;
    }
  >;
  dynamicRoutes?: Record<string, unknown>;
  notFoundRoutes?: string[];
}

interface RoutesManifest {
  version: number;
  basePath?: string;
  staticRoutes?: Array<{ page: string; regex?: string }>;
  dynamicRoutes?: Array<{ page: string; regex?: string }>;
  redirects?: Array<{ source: string; regex?: string }>;
}

const INTERNAL_PATH_RE = /^\/_|\.rsc$/;
const ASSET_EXT_RE = /\.(xml|txt|json|ico|png|jpg|jpeg|gif|svg|webp|avif|mp4|webm|woff2?|ttf|otf|map|css|js)$/i;

export interface DiscoverOptions {
  distDir: string;
  cwd: string;
  host: string;
  include: string[];
  exclude: string[];
}

export async function discoverUrls(opts: DiscoverOptions): Promise<DiscoveredUrl[]> {
  const { distDir, cwd, host, include, exclude } = opts;
  const distAbs = join(cwd, distDir);

  const prerender = await readJson<PrerenderManifest>(join(distAbs, "prerender-manifest.json"));
  const routes = await readJson<RoutesManifest>(join(distAbs, "routes-manifest.json"));

  if (!prerender && !routes) {
    throw new Error(
      `No Next build output found at ${distAbs}. Run \`next build\` before nextjs-indexnow.`,
    );
  }

  const basePath = routes?.basePath ?? "";
  const redirectSources = new Set((routes?.redirects ?? []).map((r) => r.source));
  const pathSet = new Set<string>();

  for (const pathname of Object.keys(prerender?.routes ?? {})) {
    pathSet.add(pathname);
  }
  for (const entry of routes?.staticRoutes ?? []) {
    if (entry.page) pathSet.add(entry.page);
  }
  for (const np of prerender?.notFoundRoutes ?? []) {
    pathSet.delete(np);
  }

  const includeMatch = picomatch(include);
  const excludeMatch = exclude.length ? picomatch(exclude) : () => false;

  const discovered: DiscoveredUrl[] = [];
  for (const raw of pathSet) {
    if (!raw || typeof raw !== "string") continue;
    if (INTERNAL_PATH_RE.test(raw)) continue;
    if (raw.startsWith("/api/")) continue;
    if (ASSET_EXT_RE.test(raw)) continue;
    if (redirectSources.has(raw)) continue;
    if (!includeMatch(raw)) continue;
    if (excludeMatch(raw)) continue;

    const fullPath = `${basePath}${raw === "/" ? "" : raw}` || "/";
    const url = `https://${host}${fullPath}`;
    const hash = await hashRoute(distAbs, raw, prerender?.routes[raw]);
    discovered.push({ url, hash });
  }

  discovered.sort((a, b) => a.url.localeCompare(b.url));
  return discovered;
}

async function hashRoute(
  distAbs: string,
  pathname: string,
  route: PrerenderManifest["routes"][string] | undefined,
): Promise<string> {
  const h = createHash("sha256");
  h.update(pathname);
  if (route) {
    h.update(String(route.initialRevalidateSeconds ?? ""));
    h.update(route.dataRoute ?? "");
    h.update(route.renderingMode ?? "");
  }
  const htmlPath = join(distAbs, "server", "app", `${pathname === "/" ? "/index" : pathname}.html`);
  try {
    const s = await stat(htmlPath);
    h.update(String(s.size));
    h.update(s.mtime.toISOString());
  } catch {
    // static route without prerendered html — fine
  }
  return `sha256:${h.digest("hex").slice(0, 32)}`;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const buf = await readFile(path, "utf8");
    return JSON.parse(buf) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
