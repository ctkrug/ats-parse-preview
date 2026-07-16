import { describe, expect, it } from "vitest";
import { detectColumns } from "../src/lib/columns";
import type { PageContent, TextRun } from "../src/parsers/types";

const PAGE_W = 612;
const PAGE_H = 792;

let nextOrder = 0;
const run = (x: number, y: number, w: number, str = "text"): TextRun => ({
  x,
  y,
  w,
  h: 11,
  str,
  order: nextOrder++,
});

const page = (runs: TextRun[]): PageContent => ({
  pageNumber: 1,
  width: PAGE_W,
  height: PAGE_H,
  runs,
});

/** Left column at x=60 (w=160), right column at x=340 (w=210): a 120pt gutter. */
const twoColumnRuns = (rows = 6): TextRun[] =>
  Array.from({ length: rows }, (_, i) => [
    run(60, 120 + i * 20, 160, `left-${i}`),
    run(340, 120 + i * 20, 210, `right-${i}`),
  ]).flat();

describe("detectColumns", () => {
  it("returns nothing for an empty page", () => {
    expect(detectColumns(page([]))).toEqual([]);
  });

  it("returns nothing for a single-column page", () => {
    const runs = Array.from({ length: 10 }, (_, i) => run(72, 100 + i * 18, 460));
    expect(detectColumns(page(runs))).toEqual([]);
  });

  it("finds two columns in a genuine two-column layout", () => {
    const columns = detectColumns(page(twoColumnRuns()));

    expect(columns).toHaveLength(2);
    expect(columns[0].runs.every((r) => r.str.startsWith("left"))).toBe(true);
    expect(columns[1].runs.every((r) => r.str.startsWith("right"))).toBe(true);
  });

  it("returns columns in left-to-right order with sane bounds", () => {
    const [left, right] = detectColumns(page(twoColumnRuns()));

    expect(left.x0).toBe(60);
    expect(left.x1).toBe(220);
    expect(right.x0).toBe(340);
    expect(right.x1).toBe(550);
    expect(left.x1).toBeLessThan(right.x0);
  });

  it("still finds columns under a full-width header that crosses the gutter", () => {
    const runs = [run(60, 60, 500, "CHARLIE KRUG — SENIOR ENGINEER"), ...twoColumnRuns()];
    expect(detectColumns(page(runs))).toHaveLength(2);
  });

  it("still finds columns under a header too narrow to span the page", () => {
    // A 16pt name banner is only ~250pt wide, but it crosses the gutter all
    // the same — the crossing is what matters, not the width.
    const runs = [run(72, 60, 250, "CHARLIE KRUG"), ...twoColumnRuns()];
    expect(detectColumns(page(runs))).toHaveLength(2);
  });

  it("excludes a gutter-crossing header from both columns", () => {
    const header = run(72, 60, 250, "CHARLIE KRUG");
    const columns = detectColumns(page([header, ...twoColumnRuns()]));

    const assigned = columns.flatMap((c) => c.runs).map((r) => r.str);
    expect(assigned).not.toContain("CHARLIE KRUG");
  });

  it("does not treat a gutter as open when most lines cross it", () => {
    // Prose with a wide justified gap on a couple of lines is not a column.
    const runs = [
      ...Array.from({ length: 8 }, (_, i) => run(72, 100 + i * 18, 460)),
      run(72, 280, 100),
      run(340, 280, 100),
    ];
    expect(detectColumns(page(runs))).toEqual([]);
  });

  it("ignores a narrow inter-word gap", () => {
    const runs = Array.from({ length: 8 }, (_, i) => [
      run(72, 100 + i * 18, 200),
      run(280, 100 + i * 18, 260),
    ]).flat();
    expect(detectColumns(page(runs))).toEqual([]);
  });

  it("ignores whitespace inside the page margins", () => {
    const runs = Array.from({ length: 8 }, (_, i) => run(300, 100 + i * 18, 240));
    expect(detectColumns(page(runs))).toEqual([]);
  });

  it("does not report columns when one side has too little content", () => {
    const runs = [...twoColumnRuns().filter((r) => r.str.startsWith("left")), run(340, 130, 210)];
    expect(detectColumns(page(runs))).toEqual([]);
  });

  it("does not report columns for blocks that never sit side by side", () => {
    const upperLeft = Array.from({ length: 5 }, (_, i) => run(60, 100 + i * 18, 160));
    const lowerRight = Array.from({ length: 5 }, (_, i) => run(340, 500 + i * 18, 210));
    expect(detectColumns(page([...upperLeft, ...lowerRight]))).toEqual([]);
  });

  it("assigns every body run to exactly one column", () => {
    const runs = twoColumnRuns(9);
    const assigned = detectColumns(page(runs)).flatMap((c) => c.runs);
    expect(new Set(assigned.map((r) => r.order)).size).toBe(runs.length);
  });
});
