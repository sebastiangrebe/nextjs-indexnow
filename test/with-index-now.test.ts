import { describe, expect, it } from "vitest";
import { withIndexNow } from "../src/with-index-now.js";

describe("withIndexNow", () => {
  it("attaches __indexnow to the config", () => {
    const merged = withIndexNow({ reactStrictMode: true }, { host: "example.com" });
    expect(merged.reactStrictMode).toBe(true);
    expect(merged.__indexnow.host).toBe("example.com");
  });

  it("throws without host", () => {
    // @ts-expect-error — exercising runtime check
    expect(() => withIndexNow({}, {})).toThrow(/host/);
  });

  it("throws when host contains protocol", () => {
    expect(() => withIndexNow({}, { host: "https://example.com" })).toThrow(/bare hostname/);
  });
});
