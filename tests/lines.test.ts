import { describe, expect, it } from "vitest";
import { gapsWithin, groupIntoLines } from "../src/lib/lines";
import type { TextRun } from "../src/parsers/types";

let nextOrder = 0;
const run = (x: number, y: number, w: number, str = "x", h = 10): TextRun => ({
  x,
  y,
  w,
  h,
  str,
  order: nextOrder++,
});

const texts = (lines: TextRun[][]): string[][] =>
  lines.map((line) => line.map((r) => r.str));

describe("groupIntoLines", () => {
  it("returns no lines for no runs", () => {
    expect(groupIntoLines([])).toEqual([]);
  });

  it("groups runs sharing a baseline into one line", () => {
    const lines = groupIntoLines([run(300, 100, 40, "b"), run(100, 100, 40, "a")]);
    expect(texts(lines)).toEqual([["a", "b"]]);
  });

  it("orders runs within a line left-to-right regardless of input order", () => {
    const lines = groupIntoLines([
      run(200, 50, 20, "second"),
      run(400, 50, 20, "third"),
      run(10, 50, 20, "first"),
    ]);
    expect(texts(lines)).toEqual([["first", "second", "third"]]);
  });

  it("separates runs on different lines and orders lines top-to-bottom", () => {
    const lines = groupIntoLines([run(10, 200, 30, "lower"), run(10, 40, 30, "upper")]);
    expect(texts(lines)).toEqual([["upper"], ["lower"]]);
  });

  it("keeps runs together when they overlap by more than half the shorter height", () => {
    const lines = groupIntoLines([run(10, 100, 30, "body"), run(60, 98, 10, "sup", 6)]);
    expect(texts(lines)).toEqual([["body", "sup"]]);
  });

  it("splits runs whose vertical overlap is under half the shorter height", () => {
    const lines = groupIntoLines([run(10, 100, 30, "upper"), run(10, 109, 30, "lower")]);
    expect(texts(lines)).toEqual([["upper"], ["lower"]]);
  });

  it("preserves every run exactly once", () => {
    const runs = Array.from({ length: 60 }, (_, i) =>
      run((i % 6) * 90, Math.floor(i / 6) * 14, 80, `r${i}`),
    );
    const grouped = groupIntoLines(runs).flat();
    expect(grouped).toHaveLength(runs.length);
    expect(new Set(grouped.map((r) => r.order)).size).toBe(runs.length);
  });
});

describe("gapsWithin", () => {
  it("has no gaps for a single run", () => {
    expect(gapsWithin([run(0, 0, 50)])).toEqual([]);
  });

  it("measures the whitespace between consecutive runs", () => {
    expect(gapsWithin([run(0, 0, 50), run(90, 0, 20), run(150, 0, 10)])).toEqual([
      40, 40,
    ]);
  });

  it("reports a negative gap for overlapping runs", () => {
    expect(gapsWithin([run(0, 0, 50), run(40, 0, 20)])).toEqual([-10]);
  });
});
