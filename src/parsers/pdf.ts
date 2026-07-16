import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { ExtractedDocument } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Reads text runs in the order pdf.js reports them per page — the same
// linear order most real-world ATS parsers use — rather than reconstructing
// visual reading order. That mismatch is what surfaces multi-column and
// table scrambling for the diff view.
export async function extractFromPdf(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return {
    fileName: file.name,
    text: pageTexts.join("\n\n"),
    warnings: [],
  };
}
