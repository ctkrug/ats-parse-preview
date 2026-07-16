import { describe, expect, it } from "vitest";
import { analyzePage, analyzePages, extractedText } from "../src/lib/analyze";
import type { PageContent, TextRun } from "../src/parsers/types";

const page = (runs: TextRun[], pageNumber = 1): PageContent => ({
  pageNumber,
  width: 612,
  height: 792,
  runs,
});

const prosePage = (pageNumber = 1): PageContent =>
  page(
    Array.from({ length: 6 }, (_, i) => ({
      x: 72,
      y: 100 + i * 16,
      w: 460,
      h: 11,
      str: `A line of ordinary resume prose number ${i}`,
      order: i,
    })),
    pageNumber,
  );

/** Two columns emitted row-major: the scrambling case. */
const scrambledColumnPage = (): PageContent => {
  const runs: TextRun[] = [];
  let order = 0;
  for (let i = 0; i < 5; i++) {
    runs.push({ x: 60, y: 120 + i * 20, w: 160, h: 11, str: `Left ${i}`, order: order++ });
    runs.push({ x: 340, y: 120 + i * 20, w: 210, h: 11, str: `Right ${i}`, order: order++ });
  }
  return page(runs);
};

const tablePage = (columnMajor: boolean): PageContent => {
  const runs: TextRun[] = [];
  for (let r = 0; r < 3; r++) {
    runs.push({ x: 72, y: 100 + r * 20, w: 100, h: 11, str: `r${r}c0`, order: 0 });
    runs.push({ x: 220, y: 100 + r * 20, w: 120, h: 11, str: `r${r}c1`, order: 0 });
    runs.push({ x: 400, y: 100 + r * 20, w: 90, h: 11, str: `r${r}c2`, order: 0 });
  }
  const emitted = columnMajor ? [...runs].sort((a, b) => a.x - b.x || a.y - b.y) : runs;
  emitted.forEach((run, i) => (run.order = i));
  return page(runs);
};

describe("analyzePage", () => {
  it("reports no warnings for a clean single-column page", () => {
    expect(analyzePage(prosePage())).toEqual([]);
  });

  it("warns that a page with no text is not extractable", () => {
    const warnings = analyzePage(page([]));

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("no-text-layer");
  });

  it("highlights the whole page when there is no text layer", () => {
    const [warning] = analyzePage(page([]));
    expect(warning.regions).toEqual([{ x: 0, y: 0, w: 612, h: 792 }]);
  });

  it("treats a page with only a stray character as having no text layer", () => {
    const runs = [{ x: 72, y: 100, w: 4, h: 11, str: "1", order: 0 }];
    expect(analyzePage(page(runs))[0].kind).toBe("no-text-layer");
  });

  it("reports only the text-layer warning for an empty page", () => {
    expect(analyzePage(page([])).map((w) => w.kind)).toEqual(["no-text-layer"]);
  });

  it("warns when columns are read across instead of down", () => {
    const warnings = analyzePage(scrambledColumnPage());

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe("multi-column");
  });

  it("highlights both column regions", () => {
    const [warning] = analyzePage(scrambledColumnPage());

    expect(warning.regions).toHaveLength(2);
    expect(warning.regions[0].x).toBeLessThan(warning.regions[1].x);
  });

  it("does not warn about columns a parser happens to read in order", () => {
    const runs: TextRun[] = [];
    let order = 0;
    for (let i = 0; i < 5; i++) {
      runs.push({ x: 60, y: 120 + i * 20, w: 160, h: 11, str: `L${i}`, order: order++ });
    }
    for (let i = 0; i < 5; i++) {
      runs.push({ x: 340, y: 120 + i * 20, w: 210, h: 11, str: `R${i}`, order: order++ });
    }
    expect(analyzePage(page(runs))).toEqual([]);
  });

  it("warns about a table and highlights its region", () => {
    const warnings = analyzePage(tablePage(false));

    expect(warnings.map((w) => w.kind)).toEqual(["table"]);
    expect(warnings[0].regions).toHaveLength(1);
  });

  it("calls out a column-major table as out of order", () => {
    const [warning] = analyzePage(tablePage(true));

    expect(warning.title).toMatch(/out of order/i);
    expect(warning.explanation).toMatch(/cells/i);
  });

  it("gives every warning a stable id carrying its page number", () => {
    const warnings = analyzePage({ ...scrambledColumnPage(), pageNumber: 3 });
    expect(warnings[0].id).toBe("page-3-multi-column");
    expect(warnings[0].pageNumber).toBe(3);
  });

  it("explains why each warning matters rather than just labelling it", () => {
    for (const warning of [...analyzePage(scrambledColumnPage()), ...analyzePage(page([]))]) {
      expect(warning.explanation.length).toBeGreaterThan(40);
      expect(warning.title.length).toBeGreaterThan(0);
    }
  });
});

describe("analyzePages", () => {
  it("returns nothing for no pages", () => {
    expect(analyzePages([])).toEqual([]);
  });

  it("collects warnings across pages, tagged by page", () => {
    const pages = [prosePage(1), { ...scrambledColumnPage(), pageNumber: 2 }];
    const warnings = analyzePages(pages);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].pageNumber).toBe(2);
  });
});

describe("extractedText", () => {
  it("returns an empty string for no pages", () => {
    expect(extractedText([])).toBe("");
  });

  it("returns the text stream in the order the parser reads it", () => {
    expect(extractedText([scrambledColumnPage()])).toContain("Left 0 Right 0");
  });

  it("separates pages with a blank line", () => {
    const pages = [prosePage(1), prosePage(2)];
    expect(extractedText(pages).split("\n\n")).toHaveLength(2);
  });
});
