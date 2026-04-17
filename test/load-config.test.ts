import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadIndexNowConfig } from "../src/load-config.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indexnow-load-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeRequiredServerFiles(
  config: Record<string, unknown>,
  distDir = ".next",
): Promise<void> {
  const dir = join(root, distDir);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "required-server-files.json"),
    JSON.stringify({ version: 1, config }),
  );
}

describe("loadIndexNowConfig", () => {
  it("returns null when nothing is found", async () => {
    expect(await loadIndexNowConfig(root)).toBeNull();
  });

  it("reads __indexnow from .next/required-server-files.json", async () => {
    await writeRequiredServerFiles({
      __indexnow: { host: "example.com", exclude: ["/api/**"] },
    });
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("example.com");
    expect(opts?.exclude).toEqual(["/api/**"]);
  });

  it("ignores required-server-files.json without __indexnow", async () => {
    await writeRequiredServerFiles({ someOtherField: true });
    expect(await loadIndexNowConfig(root)).toBeNull();
  });

  it("falls back to indexnow.config.mjs when no Next build output", async () => {
    await writeFile(
      join(root, "indexnow.config.mjs"),
      'export default { host: "fallback.com" };',
    );
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("fallback.com");
  });

  it("prefers Next build output over indexnow.config.mjs", async () => {
    await writeRequiredServerFiles({
      __indexnow: { host: "from-next.com" },
    });
    await writeFile(
      join(root, "indexnow.config.mjs"),
      'export default { host: "from-standalone.com" };',
    );
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("from-next.com");
  });

  it("respects custom distDir", async () => {
    await writeRequiredServerFiles(
      { __indexnow: { host: "custom-dist.com" } },
      "build",
    );
    const opts = await loadIndexNowConfig(root, "build");
    expect(opts?.host).toBe("custom-dist.com");
  });
});
