/** Axis-aligned rectangle in page coordinates, top-left origin, PDF points. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A single positioned run of text as the document reports it. */
export interface TextRun extends Rect {
  str: string;
  /** Index in the document's native (as-reported) order. */
  order: number;
}

/** One page of a source document with its geometry preserved. */
export interface PageContent {
  pageNumber: number;
  width: number;
  height: number;
  runs: TextRun[];
}

export type WarningKind = "multi-column" | "table" | "no-text-layer";

/**
 * A structural problem an ATS parser would hit. `regions` are the page areas
 * to highlight on the original render; `explanation` is the plain-language
 * "why this matters" shown in the warnings rail.
 */
export interface ParseWarning {
  id: string;
  kind: WarningKind;
  title: string;
  explanation: string;
  pageNumber: number;
  regions: Rect[];
}

/** Rendered preview of the original document, shown beside the text stream. */
export type DocumentPreview =
  | { kind: "pdf"; source: ArrayBuffer }
  | { kind: "html"; html: string };

export interface ExtractedDocument {
  fileName: string;
  /** The linear text stream an ATS would ingest. */
  text: string;
  pages: PageContent[];
  warnings: ParseWarning[];
  preview: DocumentPreview;
}
