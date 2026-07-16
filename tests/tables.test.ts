import { describe, expect, it } from "vitest";
import {
  detectTables,
  isRowLike,
  isTableOutOfOrder,
  tableCellsInNativeOrder,
} from "../src/lib/tables";
import type { PageContent, TextRun } from "../src/parsers/types";

let nextOrder = 0;
const run = (x: number, y: number, w: number, str = "cell", order?: number): TextRun => ({
  x,
  y,
  w,
  h: 11,
  str,
  order: order ?? nextOrder++,
});

const page = (runs: TextRun[]): PageContent => ({
  pageNumber: 1,
  width: 612,
  height: 792,
  runs,
});

/** Three cell columns at x=72/220/400, rows every 20pt, emitted row-major. */
const tableRuns = (rows = 3): TextRun[] => {
  const runs: TextRun[] = [];
  let order = 0;
  for (let r = 0; r < rows; r++) {
    runs.push(run(72, 100 + r * 20, 100, `r${r}c0`, order++));
    runs.push(run(220, 100 + r * 20, 120, `r${r}c1`, order++));
    runs.push(run(400, 100 + r * 20, 90, `r${r}c2`, order++));
  }
  return runs;
};

describe("isRowLike", () => {
  it("is false for an empty line", () => {
    expect(isRowLike([])).toBe(false);
  });

  it("is false for a line with too few runs", () => {
    expect(isRowLike([run(72, 100, 100), run(220, 100, 100)])).toBe(false);
  });

  it("is true for three runs separated by wide gaps", () => {
    expect(isRowLike([run(72, 100, 100), run(220, 100, 120), run(400, 100, 90)])).toBe(
      true,
    );
  });

  it("is false when runs are only word-spaced apart", () => {
    expect(isRowLike([run(72, 100, 40), run(116, 100, 40), run(160, 100, 40)])).toBe(
      false,
    );
  });
});

describe("detectTables", () => {
  it("finds no tables on an empty page", () => {
    expect(detectTables(page([]))).toEqual([]);
  });

  it("finds no tables in ordinary prose", () => {
    const prose = Array.from({ length: 6 }, (_, i) => run(72, 100 + i * 16, 460));
    expect(detectTables(page(prose))).toEqual([]);
  });

  it("finds a table with aligned rows", () => {
    const regions = detectTables(page(tableRuns(3)));

    expect(regions).toHaveLength(1);
    expect(regions[0].rows).toHaveLength(3);
    expect(regions[0].cellEdges).toEqual([72, 220, 400]);
  });

  it("bounds the table region around all of its cells", () => {
    const [region] = detectTables(page(tableRuns(3)));

    expect(region.bounds.x).toBe(72);
    expect(region.bounds.y).toBe(100);
    expect(region.bounds.w).toBe(418);
    expect(region.bounds.h).toBe(51);
  });

  it("requires more than one row", () => {
    expect(detectTables(page(tableRuns(1)))).toEqual([]);
  });

  it("does not merge two tables separated by prose", () => {
    const runs = [
      ...tableRuns(2),
      run(72, 200, 460, "a paragraph of prose between the tables"),
      ...tableRuns(2).map((r) => ({ ...r, y: r.y + 300, order: r.order + 100 })),
    ];
    expect(detectTables(page(runs))).toHaveLength(2);
  });

  it("ignores row-like lines whose cells do not align", () => {
    const runs = [
      run(72, 100, 60, "a"),
      run(200, 100, 60, "b"),
      run(380, 100, 60, "c"),
      run(120, 120, 60, "d"),
      run(260, 120, 60, "e"),
      run(460, 120, 60, "f"),
    ];
    expect(detectTables(page(runs))).toEqual([]);
  });

  it("tolerates cell edges that drift within a few points", () => {
    const runs = [
      run(72, 100, 100),
      run(220, 100, 120),
      run(400, 100, 90),
      run(75, 120, 100),
      run(223, 120, 120),
      run(403, 120, 90),
    ];
    expect(detectTables(page(runs))).toHaveLength(1);
  });
});

describe("table cell ordering", () => {
  it("reports a row-major table as read in visual order", () => {
    const [region] = detectTables(page(tableRuns(3)));
    expect(isTableOutOfOrder(region)).toBe(false);
  });

  it("reports a column-major table as read out of visual order", () => {
    const runs = tableRuns(3);
    // Re-emit the same cells column-major: every cell of column 0, then 1, then 2.
    const columnMajor = [...runs]
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map((r, i) => ({ ...r, order: i }));

    const [region] = detectTables(page(columnMajor));
    expect(isTableOutOfOrder(region)).toBe(true);
  });

  it("returns cells in the order the document emitted them", () => {
    const runs = tableRuns(2);
    const columnMajor = [...runs]
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map((r, i) => ({ ...r, order: i }));

    const [region] = detectTables(page(columnMajor));
    expect(tableCellsInNativeOrder(region).map((r) => r.str)).toEqual([
      "r0c0",
      "r1c0",
      "r0c1",
      "r1c1",
      "r0c2",
      "r1c2",
    ]);
  });
});
