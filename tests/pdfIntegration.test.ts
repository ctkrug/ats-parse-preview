import { fileURLToPath } from "node:url";
import * as pdfjsLib from "pdfjs-dist";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from "../src/parsers/pdf";
import { PAGE_HEIGHT, PAGE_WIDTH, buildPdf, fromTop } from "./fixtures/pdfFixture";
import type { FixtureRun } from "./fixtures/pdfFixture";

/**
 * End-to-end coverage through real pdf.js: fixture bytes in, warnings out.
 * The unit tests fix the detectors' behaviour on synthetic runs; these fix the
 * one thing they cannot — that pdf.js's real geometry lands where we expect.
 */

// The app points pdf.js at a bundled worker URL, which Node cannot import.
// Repoint it at the file on disk; the parsing under test is unchanged.
pdfjsLib.GlobalWorkerOptions.workerSrc = fileURLToPath(
  new URL("../node_modules/pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
);

const asFile = (bytes: Uint8Array<ArrayBuffer>, name = "resume.pdf"): File =>
  new File([bytes], name, { type: "application/pdf" });

/** A conventional single-column resume: reads cleanly. */
const singleColumn = (): FixtureRun[] => [
  { x: 72, y: fromTop(80), text: "CHARLIE KRUG", size: 18 },
  { x: 72, y: fromTop(110), text: "Senior Software Engineer, Berlin" },
  ...Array.from({ length: 8 }, (_, i) => ({
    x: 72,
    y: fromTop(150 + i * 20),
    text: `Built and shipped platform work, line number ${i} of the summary.`,
  })),
];

/**
 * A two-column resume emitted row-major — the layout that scrambles. Left
 * column at x=60, right at x=340, each row emitting left then right.
 */
const twoColumnRowMajor = (): FixtureRun[] => {
  const runs: FixtureRun[] = [
    { x: 72, y: fromTop(70), text: "CHARLIE KRUG - SENIOR ENGINEER", size: 16 },
  ];
  for (let i = 0; i < 8; i++) {
    runs.push({ x: 60, y: fromTop(140 + i * 22), text: `Skill entry ${i}` });
    runs.push({ x: 340, y: fromTop(140 + i * 22), text: `Experience detail ${i}` });
  }
  return runs;
};

describe("extractFromPdf", () => {
  it("extracts text and page geometry from a real PDF", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf(singleColumn())));

    expect(parsed.fileName).toBe("resume.pdf");
    expect(parsed.text).toContain("CHARLIE KRUG");
    expect(parsed.text).toContain("Senior Software Engineer, Berlin");
    expect(parsed.pages).toHaveLength(1);
  });

  it("reports the page size pdf.js sees", async () => {
    const [page] = (await extractFromPdf(asFile(buildPdf(singleColumn())))).pages;

    expect(page.width).toBe(PAGE_WIDTH);
    expect(page.height).toBe(PAGE_HEIGHT);
    expect(page.pageNumber).toBe(1);
  });

  it("places runs in top-left coordinates matching the layout", async () => {
    const [page] = (await extractFromPdf(asFile(buildPdf(singleColumn())))).pages;
    const name = page.runs.find((run) => run.str.includes("CHARLIE"))!;

    expect(name.x).toBeCloseTo(72, 0);
    // The name sits at 80pt from the top; its box starts one line-height above.
    expect(name.y).toBeGreaterThan(55);
    expect(name.y).toBeLessThan(85);
    expect(name.w).toBeGreaterThan(0);
  });

  it("keeps runs in the order the content stream emits them", async () => {
    const [page] = (await extractFromPdf(asFile(buildPdf(twoColumnRowMajor())))).pages;
    const streamed = page.runs.map((run) => run.str.trim()).filter(Boolean);

    expect(streamed[0]).toContain("CHARLIE KRUG");
    expect(streamed[1]).toBe("Skill entry 0");
    expect(streamed[2]).toBe("Experience detail 0");
  });

  it("finds no problems in a clean single-column resume", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf(singleColumn())));
    expect(parsed.warnings).toEqual([]);
  });

  it("warns that a row-major two-column resume is read across", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf(twoColumnRowMajor())));
    const columnWarning = parsed.warnings.find((w) => w.kind === "multi-column");

    expect(columnWarning).toBeDefined();
    expect(columnWarning!.regions).toHaveLength(2);
  });

  it("reproduces the scramble in the extracted text", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf(twoColumnRowMajor())));

    // The wow moment: the columns interleave rather than reading down.
    expect(parsed.text).toContain("Skill entry 0 Experience detail 0");
    expect(parsed.text).not.toContain("Skill entry 0 Skill entry 1");
  });

  it("highlights column regions that sit within the page", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf(twoColumnRowMajor())));
    const [left, right] = parsed.warnings.find((w) => w.kind === "multi-column")!.regions;

    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(right.x + right.w).toBeLessThanOrEqual(PAGE_WIDTH);
    expect(left.x + left.w).toBeLessThan(right.x);
  });

  it("warns when a page has no text layer at all", async () => {
    const parsed = await extractFromPdf(asFile(buildPdf([])));

    expect(parsed.text).toBe("");
    expect(parsed.warnings.map((w) => w.kind)).toEqual(["no-text-layer"]);
  });

  it("rejects a file that is not a PDF", async () => {
    const notAPdf = new File([new TextEncoder().encode("hello")], "resume.pdf");
    await expect(extractFromPdf(notAPdf)).rejects.toThrow();
  });
});
