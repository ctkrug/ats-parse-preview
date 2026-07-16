import { describe, expect, it } from "vitest";
import {
  bottom,
  centerY,
  intersects,
  overlap1d,
  pad,
  right,
  union,
} from "../src/lib/geometry";
import type { Rect } from "../src/parsers/types";

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

describe("edges", () => {
  it("derives right, bottom, and vertical center", () => {
    const r = rect(10, 20, 30, 40);
    expect(right(r)).toBe(40);
    expect(bottom(r)).toBe(60);
    expect(centerY(r)).toBe(40);
  });
});

describe("union", () => {
  it("returns null for no rects", () => {
    expect(union([])).toBeNull();
  });

  it("returns an equal rect for a single input", () => {
    expect(union([rect(5, 5, 10, 10)])).toEqual(rect(5, 5, 10, 10));
  });

  it("spans every input rect", () => {
    expect(union([rect(10, 10, 10, 10), rect(50, 30, 20, 5)])).toEqual(
      rect(10, 10, 60, 25),
    );
  });

  it("contains each input rect for arbitrary inputs", () => {
    const rects = Array.from({ length: 40 }, (_, i) =>
      rect((i * 37) % 500, (i * 53) % 700, (i % 9) + 1, (i % 5) + 1),
    );
    const u = union(rects)!;

    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(u.x);
      expect(r.y).toBeGreaterThanOrEqual(u.y);
      expect(right(r)).toBeLessThanOrEqual(right(u));
      expect(bottom(r)).toBeLessThanOrEqual(bottom(u));
    }
  });
});

describe("pad", () => {
  it("grows the rect on every side", () => {
    expect(pad(rect(20, 20, 10, 10), 5)).toEqual(rect(15, 15, 20, 20));
  });

  it("clamps to the page origin instead of going negative", () => {
    const p = pad(rect(2, 1, 10, 10), 5);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
    expect(right(p)).toBe(17);
    expect(bottom(p)).toBe(16);
  });

  it("leaves the rect unchanged when padding by zero", () => {
    expect(pad(rect(3, 4, 5, 6), 0)).toEqual(rect(3, 4, 5, 6));
  });
});

describe("intersects", () => {
  it("detects overlapping rects", () => {
    expect(intersects(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
  });

  it("is false for disjoint rects", () => {
    expect(intersects(rect(0, 0, 10, 10), rect(20, 0, 10, 10))).toBe(false);
  });

  it("treats touching edges as non-overlapping", () => {
    expect(intersects(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false);
  });

  it("is symmetric", () => {
    const a = rect(0, 0, 10, 10);
    const b = rect(4, 4, 30, 2);
    expect(intersects(a, b)).toBe(intersects(b, a));
  });
});

describe("overlap1d", () => {
  it("measures the shared span", () => {
    expect(overlap1d(0, 10, 4, 20)).toBe(6);
  });

  it("returns zero for disjoint spans", () => {
    expect(overlap1d(0, 10, 10, 20)).toBe(0);
    expect(overlap1d(30, 40, 0, 10)).toBe(0);
  });

  it("never exceeds the shorter span", () => {
    expect(overlap1d(0, 100, 20, 25)).toBe(5);
  });
});
