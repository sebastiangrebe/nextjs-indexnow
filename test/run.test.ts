import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runIndexNow } from "../src/run.js";

let root: string;
const ORIGINAL_ENV = { ...process.env };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indexnow-run-"));
  process.env = { ...ORIGINAL_ENV };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  process.env = { ...ORIGINAL_ENV };
});

async function seedBuild(): Promise<void> {
  const next = join(root, ".next");
  await mkdir(next, { recursive: true });
  await writeFile(
    join(next, "prerender-manifest.json"),
    JSON.stringify({ version: 4, routes: { "/a": {}, "/b": {} } }),
  );
  await writeFile(
    join(next, "routes-manifest.json"),
    JSON.stringify({ version: 3, staticRoutes: [] }),
  );
}

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

describe("runIndexNow", () => {
  it("throws when key env is missing", async () => {
    await seedBuild();
    delete process.env.INDEXNOW_KEY;
    await expect(
      runIndexNow({
        options: { host: "example.com", cwd: root },
        logger: silentLogger,
      }),
    ).rejects.toThrow(/INDEXNOW_KEY/);
  });

  it("dry-runs by default (submitEnv != 'true')", async () => {
    await seedBuild();
    process.env.INDEXNOW_KEY = "a".repeat(16);
    delete process.env.INDEXNOW_SUBMIT;
    const fetchImpl = vi.fn();
    const res = await runIndexNow({
      options: { host: "example.com", cwd: root },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: silentLogger,
    });
    expect(res.dryRun).toBe(true);
    expect(res.submittedUrls).toHaveLength(2);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("submits when INDEXNOW_SUBMIT=true and updates state", async () => {
    await seedBuild();
    process.env.INDEXNOW_KEY = "a".repeat(16);
    process.env.INDEXNOW_SUBMIT = "true";
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 } as Response);
    const res = await runIndexNow({
      options: { host: "example.com", cwd: root },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: silentLogger,
    });
    expect(res.dryRun).toBe(false);
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();

    // Second run: state file should show everything unchanged.
    const res2 = await runIndexNow({
      options: { host: "example.com", cwd: root },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: silentLogger,
    });
    expect(res2.submittedUrls).toHaveLength(0);
    expect(fetchImpl).toHaveBeenCalledOnce(); // not called again
  });

  it("leaves state untouched when submission fails", async () => {
    await seedBuild();
    process.env.INDEXNOW_KEY = "a".repeat(16);
    process.env.INDEXNOW_SUBMIT = "true";
    const fetchImpl = vi.fn().mockResolvedValue({ status: 422 } as Response);
    const res = await runIndexNow({
      options: { host: "example.com", cwd: root },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: silentLogger,
    });
    expect(res.ok).toBe(false);

    const fetchImpl2 = vi.fn().mockResolvedValue({ status: 200 } as Response);
    const res2 = await runIndexNow({
      options: { host: "example.com", cwd: root },
      fetchImpl: fetchImpl2 as unknown as typeof fetch,
      logger: silentLogger,
    });
    expect(res2.submittedUrls).toHaveLength(2);
  });
});
