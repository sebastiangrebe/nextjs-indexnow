import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverUrls } from "../src/discover-urls.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indexnow-disc-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeManifests(
  prerender: Record<string, unknown>,
  routes: Record<string, unknown>,
): Promise<void> {
  const next = join(root, ".next");
  await mkdir(next, { recursive: true });
  await writeFile(join(next, "prerender-manifest.json"), JSON.stringify(prerender));
  await writeFile(join(next, "routes-manifest.json"), JSON.stringify(routes));
}

describe("discoverUrls", () => {
  it("returns concrete URLs from prerender and static routes, with host", async () => {
    await writeManifests(
      {
        version: 4,
        routes: {
          "/": { initialRevalidateSeconds: false },
          "/blog/hello": { srcRoute: "/blog/[slug]" },
          "/api/internal": {},
        },
      },
      {
        version: 3,
        staticRoutes: [{ page: "/pricing" }, { page: "/_not-found" }],
      },
    );
    const urls = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/**"],
      exclude: [],
    });
    const list = urls.map((u) => u.url);
    expect(list).toContain("https://example.com/");
    expect(list).toContain("https://example.com/blog/hello");
    expect(list).toContain("https://example.com/pricing");
    expect(list).not.toContain("https://example.com/api/internal");
    expect(list).not.toContain("https://example.com/_not-found");
  });

  it("applies basePath", async () => {
    await writeManifests(
      { version: 4, routes: { "/about": {} } },
      { version: 3, basePath: "/app", staticRoutes: [] },
    );
    const urls = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/**"],
      exclude: [],
    });
    expect(urls[0]?.url).toBe("https://example.com/app/about");
  });

  it("drops routes matched by redirects.source", async () => {
    await writeManifests(
      { version: 4, routes: { "/old": {}, "/new": {} } },
      { version: 3, staticRoutes: [], redirects: [{ source: "/old" }] },
    );
    const urls = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/**"],
      exclude: [],
    });
    expect(urls.map((u) => u.url)).toEqual(["https://example.com/new"]);
  });

  it("honors include/exclude globs", async () => {
    await writeManifests(
      {
        version: 4,
        routes: { "/blog/a": {}, "/blog/b": {}, "/admin/x": {}, "/pricing": {} },
      },
      { version: 3, staticRoutes: [] },
    );
    const urls = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/blog/**", "/pricing"],
      exclude: ["/blog/b"],
    });
    expect(urls.map((u) => u.url).sort()).toEqual([
      "https://example.com/blog/a",
      "https://example.com/pricing",
    ]);
  });

  it("throws when no Next build output exists", async () => {
    await expect(
      discoverUrls({
        distDir: ".next",
        cwd: root,
        host: "example.com",
        include: ["/**"],
        exclude: [],
      }),
    ).rejects.toThrow(/No Next build output/);
  });

  it("produces stable hashes across runs", async () => {
    await writeManifests(
      { version: 4, routes: { "/a": { initialRevalidateSeconds: 60, dataRoute: "/a.rsc" } } },
      { version: 3, staticRoutes: [] },
    );
    const first = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/**"],
      exclude: [],
    });
    const second = await discoverUrls({
      distDir: ".next",
      cwd: root,
      host: "example.com",
      include: ["/**"],
      exclude: [],
    });
    expect(first[0]?.hash).toBe(second[0]?.hash);
  });
});
