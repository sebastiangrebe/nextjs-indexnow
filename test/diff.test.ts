import { describe, expect, it } from "vitest";
import { buildNextState, diffUrls } from "../src/diff.js";
import type { DiscoveredUrl, IndexNowState } from "../src/types.js";

function d(url: string, hash: string): DiscoveredUrl {
  return { url, hash };
}

describe("diffUrls", () => {
  it("marks all as added when no prior state", () => {
    const res = diffUrls([d("a", "h1"), d("b", "h2")], null);
    expect(res.added.map((u) => u.url)).toEqual(["a", "b"]);
    expect(res.changed).toEqual([]);
    expect(res.unchanged).toEqual([]);
    expect(res.removed).toEqual([]);
  });

  it("splits added, changed, unchanged, removed", () => {
    const prior: IndexNowState = {
      version: 1,
      host: "x",
      lastSubmittedAt: null,
      urls: {
        a: { hash: "h1", submittedAt: "" },
        b: { hash: "h2", submittedAt: "" },
        gone: { hash: "h3", submittedAt: "" },
      },
    };
    const res = diffUrls([d("a", "h1"), d("b", "h2-new"), d("c", "h4")], prior);
    expect(res.unchanged.map((u) => u.url)).toEqual(["a"]);
    expect(res.changed.map((u) => u.url)).toEqual(["b"]);
    expect(res.added.map((u) => u.url)).toEqual(["c"]);
    expect(res.removed).toEqual(["gone"]);
  });
});

describe("buildNextState", () => {
  it("updates submittedAt only for submitted urls", () => {
    const now = new Date("2026-04-14T00:00:00.000Z");
    const prior: IndexNowState = {
      version: 1,
      host: "x",
      lastSubmittedAt: "2026-04-01T00:00:00Z",
      urls: {
        a: { hash: "h1", submittedAt: "2026-04-01T00:00:00Z" },
      },
    };
    const discovered = [d("a", "h1"), d("b", "h2")];
    const state = buildNextState("x", discovered, new Set(["b"]), prior, now);
    expect(state.urls["a"]?.submittedAt).toBe("2026-04-01T00:00:00Z");
    expect(state.urls["b"]?.submittedAt).toBe("2026-04-14T00:00:00.000Z");
    expect(state.lastSubmittedAt).toBe("2026-04-14T00:00:00.000Z");
  });

  it("retains prior lastSubmittedAt when nothing submitted now", () => {
    const state = buildNextState(
      "x",
      [d("a", "h")],
      new Set(),
      {
        version: 1,
        host: "x",
        lastSubmittedAt: "2026-01-01T00:00:00Z",
        urls: { a: { hash: "h", submittedAt: "2026-01-01T00:00:00Z" } },
      },
      new Date("2026-04-14T00:00:00.000Z"),
    );
    expect(state.lastSubmittedAt).toBe("2026-01-01T00:00:00Z");
  });
});
