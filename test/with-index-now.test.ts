import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sidecarPath } from "../src/sidecar.js";
import { withIndexNow } from "../src/with-index-now.js";

let root: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  root = await mkdtemp(join(tmpdir(), "indexnow-wrap-"));
  process.chdir(root);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(root, { recursive: true, force: true });
});

describe("withIndexNow", () => {
  it("returns the Next config unchanged (no injected fields)", () => {
    const input = { reactStrictMode: true };
    const output = withIndexNow(input, { host: "example.com" });
    expect(output).toEqual(input);
    expect(output).not.toHaveProperty("__indexnow");
  });

  it("writes options to the sidecar file", async () => {
    withIndexNow({}, { host: "example.com", exclude: ["/api/**"] });
    const raw = await readFile(sidecarPath(root), "utf8");
    expect(JSON.parse(raw)).toEqual({
      host: "example.com",
      exclude: ["/api/**"],
    });
  });

  it("throws without host", () => {
    // @ts-expect-error — exercising runtime check
    expect(() => withIndexNow({}, {})).toThrow(/host/);
  });

  it("throws when host contains protocol", () => {
    expect(() => withIndexNow({}, { host: "https://example.com" })).toThrow(/bare hostname/);
  });
});
