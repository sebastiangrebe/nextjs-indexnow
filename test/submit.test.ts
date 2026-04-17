import { describe, expect, it, vi } from "vitest";
import { submitToIndexNow } from "../src/submit.js";

function mockFetch(status: number) {
  return vi.fn().mockResolvedValue({ status, text: async () => "" } as Response);
}

describe("submitToIndexNow", () => {
  it("returns early when urlList is empty", async () => {
    const f = mockFetch(200);
    const res = await submitToIndexNow({
      host: "x",
      key: "a".repeat(16),
      keyLocation: null,
      urlList: [],
      fetchImpl: f as unknown as typeof fetch,
    });
    expect(res.submittedCount).toBe(0);
    expect(res.batches).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it("posts a single batch for <10k urls", async () => {
    const f = mockFetch(200);
    const res = await submitToIndexNow({
      host: "example.com",
      key: "a".repeat(16),
      keyLocation: "https://example.com/key.txt",
      urlList: ["https://example.com/a", "https://example.com/b"],
      fetchImpl: f as unknown as typeof fetch,
    });
    expect(f).toHaveBeenCalledOnce();
    const body = JSON.parse((f.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.host).toBe("example.com");
    expect(body.urlList).toHaveLength(2);
    expect(body.keyLocation).toBe("https://example.com/key.txt");
    expect(res.ok).toBe(true);
    expect(res.batches).toBe(1);
  });

  it("batches at 10,000 urls per request", async () => {
    const f = mockFetch(202);
    const urlList = Array.from({ length: 25_000 }, (_, i) => `https://x/p${i}`);
    const res = await submitToIndexNow({
      host: "x",
      key: "a".repeat(16),
      keyLocation: null,
      urlList,
      fetchImpl: f as unknown as typeof fetch,
    });
    expect(res.batches).toBe(3);
    expect(f).toHaveBeenCalledTimes(3);
    expect(res.ok).toBe(true);
  });

  it("treats non-200/202 as failure and stops", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 422 });
    const urlList = Array.from({ length: 15_000 }, (_, i) => `https://x/p${i}`);
    const res = await submitToIndexNow({
      host: "x",
      key: "a".repeat(16),
      keyLocation: null,
      urlList,
      fetchImpl: f as unknown as typeof fetch,
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
    expect(res.batches).toBe(2);
  });

  it("omits keyLocation when null", async () => {
    const f = mockFetch(200);
    await submitToIndexNow({
      host: "x",
      key: "a".repeat(16),
      keyLocation: null,
      urlList: ["https://x/a"],
      fetchImpl: f as unknown as typeof fetch,
    });
    const body = JSON.parse((f.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.keyLocation).toBeUndefined();
  });
});
