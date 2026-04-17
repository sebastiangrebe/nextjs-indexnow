import { describe, expect, it } from "vitest";
import { defaultKeyLocation, generateKey, validateKey } from "../src/key.js";

describe("generateKey", () => {
  it("produces a 32-char hex string", () => {
    const key = generateKey();
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces a valid key", () => {
    expect(() => validateKey(generateKey())).not.toThrow();
  });
});

describe("validateKey", () => {
  it("accepts 8-char hex", () => {
    expect(() => validateKey("abcdef01")).not.toThrow();
  });
  it("accepts 128-char hex", () => {
    expect(() => validateKey("a".repeat(128))).not.toThrow();
  });
  it("rejects too-short keys", () => {
    expect(() => validateKey("abc")).toThrow(/8.*128/);
  });
  it("rejects too-long keys", () => {
    expect(() => validateKey("a".repeat(129))).toThrow(/8.*128/);
  });
  it("rejects non-hex chars", () => {
    expect(() => validateKey("zzzzzzzz")).toThrow(/hex/);
  });
  it("rejects empty", () => {
    expect(() => validateKey("")).toThrow(/empty/i);
  });
});

describe("defaultKeyLocation", () => {
  it("builds the expected URL", () => {
    expect(defaultKeyLocation("example.com", "abc123")).toBe("https://example.com/abc123.txt");
  });
});
