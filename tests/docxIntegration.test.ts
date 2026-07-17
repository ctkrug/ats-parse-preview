import { describe, expect, it } from "vitest";
import { extractFromDocx } from "../src/parsers/docx";
import { ParseError, parseFile } from "../src/parsers/index";
import { buildDocx } from "./fixtures/docxFixture";

/**
 * End-to-end coverage through real mammoth: fixture bytes in, warnings out.
 * The docxAnalysis unit tests fix warning shape on synthetic HTML/messages;
 * these fix the one thing they cannot — that mammoth's real output for a
 * table, an image, and a genuinely unrecognised element lands where
 * `extractFromDocx` expects it.
 */

const asFile = (bytes: Uint8Array<ArrayBuffer>, name = "resume.docx"): File =>
  new File([bytes], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

describe("extractFromDocx", () => {
  it("extracts plain paragraph text in document order", async () => {
    const bytes = await buildDocx({ paragraphs: ["Name: Jane Doe", "Experience: Acme Corp"] });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.text).toBe("Name: Jane Doe\n\nExperience: Acme Corp");
    expect(doc.fileName).toBe("resume.docx");
    expect(doc.pages).toEqual([]);
    expect(doc.preview.kind).toBe("html");
  });

  it("warns when the document contains a table", async () => {
    const bytes = await buildDocx({ paragraphs: ["Summary"], tableCount: 1 });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.warnings.some((w) => w.kind === "table")).toBe(true);
  });

  it("warns when the document contains an image", async () => {
    const bytes = await buildDocx({ paragraphs: ["Summary"], imageCount: 1 });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.warnings.some((w) => w.kind === "no-text-layer" && w.id === "docx-image")).toBe(
      true,
    );
  });

  it("counts multiple tables and images in the title", async () => {
    const bytes = await buildDocx({ paragraphs: ["Summary"], tableCount: 2, imageCount: 3 });
    const doc = await extractFromDocx(asFile(bytes));

    const table = doc.warnings.find((w) => w.kind === "table")!;
    const image = doc.warnings.find((w) => w.id === "docx-image")!;
    expect(table.title).toBe("2 tables detected");
    expect(image.title).toBe("3 images found");
  });

  it("warns when mammoth reports a genuinely unrecognised element", async () => {
    const bytes = await buildDocx({
      paragraphs: ["Some text mammoth can read."],
      includeUnrecognisedElement: true,
    });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.warnings.some((w) => w.id === "docx-skipped-content")).toBe(true);
  });

  it("reports an empty document as having no text layer", async () => {
    const bytes = await buildDocx({ paragraphs: [] });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.text).toBe("");
    expect(doc.warnings.some((w) => w.id === "docx-empty")).toBe(true);
  });

  it("does not double-warn empty when skipped content already explains it", async () => {
    const bytes = await buildDocx({ paragraphs: [], includeUnrecognisedElement: true });
    const doc = await extractFromDocx(asFile(bytes));

    expect(doc.warnings.filter((w) => w.pageNumber === 1 && w.kind === "no-text-layer")).toHaveLength(
      1,
    );
    expect(doc.warnings.some((w) => w.id === "docx-empty")).toBe(false);
    expect(doc.warnings.some((w) => w.id === "docx-skipped-content")).toBe(true);
  });
});

describe("parseFile dispatch", () => {
  it("routes a .docx file through the DOCX parser", async () => {
    const bytes = await buildDocx({ paragraphs: ["Routed correctly"] });
    const doc = await parseFile(asFile(bytes));

    expect(doc.text).toBe("Routed correctly");
  });

  it("rejects a file whose extension is not .pdf or .docx", async () => {
    const file = new File(["not a resume"], "resume.txt", { type: "text/plain" });

    await expect(parseFile(file)).rejects.toBeInstanceOf(ParseError);
  });

  it("wraps a corrupt DOCX in an actionable ParseError instead of a raw mammoth error", async () => {
    const file = new File(["this is not a zip file"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(parseFile(file)).rejects.toMatchObject({
      name: "ParseError",
      message: expect.stringContaining("not a readable DOCX"),
    });
  });
});
