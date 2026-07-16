import { describe, expect, it } from "vitest";
import { detectColumns } from "../src/lib/columns";
import {
  columnAwareOrder,
  columnOf,
  measureInterleaving,
  nativeOrder,
  runsToText,
} from "../src/lib/readingOrder";
import type { PageContent, TextRun } from "../src/parsers/types";

const PAGE_W = 612;

const page = (runs: TextRun[]): PageContent => ({
  pageNumber: 1,
  width: PAGE_W,
  height: 792,
  runs,
});

/**
 * A two-column resume emitted row-major — the shape that scrambles. Content
 * stream order is: left row 0, right row 0, left row 1, right row 1, ...
 */
const rowMajorPage = (rows = 5): PageContent => {
  const runs: TextRun[] = [];
  let order = 0;
  for (let i = 0; i < rows; i++) {
    runs.push({ x: 60, y: 120 + i * 20, w: 160, h: 11, str: `L${i}`, order: order++ });
    runs.push({ x: 340, y: 120 + i * 20, w: 210, h: 11, str: `R${i}`, order: order++ });
  }
  return page(runs);
};

/** The same layout emitted column-major — reads correctly despite the columns. */
const columnMajorPage = (rows = 5): PageContent => {
  const runs: TextRun[] = [];
  let order = 0;
  for (let i = 0; i < rows; i++) {
    runs.push({ x: 60, y: 120 + i * 20, w: 160, h: 11, str: `L${i}`, order: order++ });
  }
  for (let i = 0; i < rows; i++) {
    runs.push({ x: 340, y: 120 + i * 20, w: 210, h: 11, str: `R${i}`, order: order++ });
  }
  return page(runs);
};

const strings = (runs: TextRun[]): string[] => runs.map((r) => r.str);

describe("nativeOrder", () => {
  it("returns runs in the order the document reported them", () => {
    expect(strings(nativeOrder(rowMajorPage(2)))).toEqual(["L0", "R0", "L1", "R1"]);
  });

  it("returns nothing for an empty page", () => {
    expect(nativeOrder(page([]))).toEqual([]);
  });
});

describe("columnAwareOrder", () => {
  it("reads each column in turn rather than row by row", () => {
    const p = rowMajorPage(3);
    const ordered = columnAwareOrder(p, detectColumns(p));
    expect(strings(ordered)).toEqual(["L0", "L1", "L2", "R0", "R1", "R2"]);
  });

  it("places a full-width header before the columns", () => {
    const p = rowMajorPage(3);
    p.runs.push({ x: 60, y: 60, w: 500, h: 20, str: "HEADER", order: 99 });
    const ordered = columnAwareOrder(p, detectColumns(p));
    expect(strings(ordered)[0]).toBe("HEADER");
  });

  it("places a full-width footer after the columns", () => {
    const p = rowMajorPage(3);
    p.runs.push({ x: 60, y: 400, w: 500, h: 12, str: "FOOTER", order: 99 });
    const ordered = columnAwareOrder(p, detectColumns(p));
    expect(strings(ordered).at(-1)).toBe("FOOTER");
  });

  it("falls back to positional order when there are no columns", () => {
    const p = page([
      { x: 72, y: 200, w: 400, h: 11, str: "second", order: 0 },
      { x: 72, y: 100, w: 400, h: 11, str: "first", order: 1 },
    ]);
    expect(strings(columnAwareOrder(p, []))).toEqual(["first", "second"]);
  });

  it("keeps every run exactly once", () => {
    const p = rowMajorPage(6);
    const ordered = columnAwareOrder(p, detectColumns(p));
    expect(new Set(ordered.map((r) => r.order)).size).toBe(p.runs.length);
  });
});

describe("columnOf", () => {
  it("locates a run by its horizontal center", () => {
    const p = rowMajorPage();
    const columns = detectColumns(p);
    expect(columnOf(p.runs[0], columns)).toBe(0);
    expect(columnOf(p.runs[1], columns)).toBe(1);
  });

  it("returns -1 for a run in no column", () => {
    const columns = detectColumns(rowMajorPage());
    const header: TextRun = { x: 60, y: 60, w: 500, h: 20, str: "HEADER", order: 0 };
    expect(columnOf(header, columns)).toBe(-1);
  });
});

describe("measureInterleaving", () => {
  it("flags a row-major stream as interleaved", () => {
    const p = rowMajorPage(5);
    const result = measureInterleaving(p, detectColumns(p));

    expect(result.isInterleaved).toBe(true);
    expect(result.switches).toBe(9);
    expect(result.ideal).toBe(1);
  });

  it("does not flag a column-major stream", () => {
    const p = columnMajorPage(5);
    const result = measureInterleaving(p, detectColumns(p));

    expect(result.isInterleaved).toBe(false);
    expect(result.switches).toBe(1);
  });

  it("reports no interleaving for a single-column page", () => {
    const p = page([{ x: 72, y: 100, w: 400, h: 11, str: "only", order: 0 }]);
    expect(measureInterleaving(p, [])).toEqual({
      switches: 0,
      ideal: 0,
      isInterleaved: false,
    });
  });
});

describe("runsToText", () => {
  it("returns an empty string for no runs", () => {
    expect(runsToText([])).toBe("");
  });

  it("joins runs on one line with spaces", () => {
    const p = rowMajorPage(1);
    expect(runsToText(nativeOrder(p))).toBe("L0 R0");
  });

  it("breaks a line when the run moves to a new line", () => {
    const p = columnMajorPage(2);
    expect(runsToText(nativeOrder(p))).toBe("L0\nL1\nR0\nR1");
  });

  it("shows the scramble: row-major columns interleave in the text stream", () => {
    const p = rowMajorPage(3);
    expect(runsToText(nativeOrder(p))).toBe("L0 R0\nL1 R1\nL2 R2");
    expect(runsToText(columnAwareOrder(p, detectColumns(p)))).toBe(
      "L0\nL1\nL2\nR0\nR1\nR2",
    );
  });
});
