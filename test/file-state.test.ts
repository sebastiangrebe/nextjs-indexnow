import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileStateAdapter } from "../src/state/file.js";
import type { IndexNowState } from "../src/types.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "indexnow-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileStateAdapter", () => {
  it("returns null when file missing", async () => {
    const a = new FileStateAdapter({ cwd: dir });
    expect(await a.read()).toBeNull();
  });

  it("round-trips state", async () => {
    const a = new FileStateAdapter({ cwd: dir });
    const state: IndexNowState = {
      version: 1,
      host: "example.com",
      lastSubmittedAt: "2026-04-14T00:00:00Z",
      urls: {
        "https://example.com/a": { hash: "sha256:abc", submittedAt: "2026-04-14T00:00:00Z" },
      },
    };
    await a.write(state);
    const b = new FileStateAdapter({ cwd: dir });
    expect(await b.read()).toEqual(state);
  });

  it("returns null for incompatible version", async () => {
    const a = new FileStateAdapter({ cwd: dir, path: "state.json" });
    await a.write({ version: 99, host: "x", lastSubmittedAt: null, urls: {} } as unknown as IndexNowState);
    expect(await a.read()).toBeNull();
  });
});
