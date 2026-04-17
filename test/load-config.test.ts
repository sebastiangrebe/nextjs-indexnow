import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadIndexNowConfig } from "../src/load-config.js";
import { sidecarPath } from "../src/sidecar.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indexnow-load-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeSidecar(options: Record<string, unknown>): Promise<void> {
  const path = sidecarPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(options));
}

describe("loadIndexNowConfig", () => {
  it("returns null when nothing is found", async () => {
    expect(await loadIndexNowConfig(root)).toBeNull();
  });

  it("reads options from the sidecar file", async () => {
    await writeSidecar({ host: "example.com", exclude: ["/api/**"] });
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("example.com");
    expect(opts?.exclude).toEqual(["/api/**"]);
  });

  it("ignores sidecar files with no host", async () => {
    await writeSidecar({ exclude: ["/api/**"] });
    expect(await loadIndexNowConfig(root)).toBeNull();
  });

  it("falls back to indexnow.config.mjs when sidecar is missing", async () => {
    await writeFile(
      join(root, "indexnow.config.mjs"),
      'export default { host: "fallback.com" };',
    );
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("fallback.com");
  });

  it("prefers sidecar over indexnow.config.mjs", async () => {
    await writeSidecar({ host: "from-sidecar.com" });
    await writeFile(
      join(root, "indexnow.config.mjs"),
      'export default { host: "from-standalone.com" };',
    );
    const opts = await loadIndexNowConfig(root);
    expect(opts?.host).toBe("from-sidecar.com");
  });
});
