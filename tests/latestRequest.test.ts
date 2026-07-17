import { describe, expect, it } from "vitest";
import { createLatestGuard } from "../src/lib/latestRequest";

describe("createLatestGuard", () => {
  it("treats the first started token as current", () => {
    const guard = createLatestGuard();
    const token = guard.start();

    expect(guard.isCurrent(token)).toBe(true);
  });

  it("invalidates an older token once a newer one starts", () => {
    const guard = createLatestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("resolves an out-of-order finish correctly: last started wins regardless of finish order", () => {
    // Simulates dropping file A then file B before A's async parse resolves,
    // where B's parse happens to resolve first.
    const guard = createLatestGuard();
    const tokenA = guard.start();
    const tokenB = guard.start();

    // B finishes first.
    expect(guard.isCurrent(tokenB)).toBe(true);
    // A finishes after B — it must be recognised as stale even though it
    // resolves "later" in wall-clock time.
    expect(guard.isCurrent(tokenA)).toBe(false);
  });

  it("keeps a lone token current indefinitely until superseded", () => {
    const guard = createLatestGuard();
    const token = guard.start();

    expect(guard.isCurrent(token)).toBe(true);
    expect(guard.isCurrent(token)).toBe(true);
  });

  it("tracks many rapid starts, only the very last is current", () => {
    const guard = createLatestGuard();
    const tokens = Array.from({ length: 50 }, () => guard.start());

    tokens.slice(0, -1).forEach((token) => expect(guard.isCurrent(token)).toBe(false));
    expect(guard.isCurrent(tokens[tokens.length - 1])).toBe(true);
  });
});
