import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { analyzePages, extractedText } from "../lib/analyze";
import type { ExtractedDocument, PageContent, TextRun } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Convert one pdf.js text item to a run in top-left page coordinates.
 *
 * pdf.js reports text in PDF user space, where the transform's e/f hold the
 * glyph origin measured up from the bottom-left of the page. Flipping to a
 * top-left origin here keeps the detectors and the canvas overlay in one
 * coordinate system.
 */
export function toRun(item: TextItem, pageHeight: number, order: number): TextRun {
  const [, , , scaleY, x, baselineY] = item.transform;
  const h = item.height || Math.abs(scaleY) || 0;

  return {
    str: item.str,
    x,
    y: pageHeight - baselineY - h,
    w: item.width,
    h,
    order,
  };
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

/**
 * Extract a PDF's text with its geometry intact, in the order the content
 * stream reports it — the linear order a real ATS ingests, rather than the
 * visual reading order a human would use.
 */
export async function extractFromPdf(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  // pdf.js takes ownership of the buffer it is handed; keep an intact copy so
  // the canvas preview can load the same document independently.
  const previewSource = buffer.slice(0);
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  try {
    const pages: PageContent[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const runs = content.items
        .filter(isTextItem)
        .map((item, index) => toRun(item, viewport.height, index))
        .filter((run) => run.str.trim().length > 0);

      pages.push({ pageNumber, width: viewport.width, height: viewport.height, runs });
    }

    return {
      fileName: file.name,
      text: extractedText(pages),
      pages,
      warnings: analyzePages(pages),
      preview: { kind: "pdf", source: previewSource },
    };
  } finally {
    await doc.destroy();
  }
}
