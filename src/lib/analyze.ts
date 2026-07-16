import type { PageContent, ParseWarning } from "../parsers/types";
import { detectColumns } from "./columns";
import { pad } from "./geometry";
import { measureInterleaving, nativeOrder, runsToText } from "./readingOrder";
import { detectTables, isTableOutOfOrder } from "./tables";

/** A page with fewer extractable characters than this has no usable text layer. */
const MIN_TEXT_LAYER_CHARS = 10;

/** Breathing room around a highlighted region so the box does not clip glyphs. */
const HIGHLIGHT_PAD_PT = 4;

/** Analyse one page and describe every structural problem an ATS would hit. */
export function analyzePage(page: PageContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];

  const characters = page.runs.reduce((total, run) => total + run.str.trim().length, 0);
  if (characters < MIN_TEXT_LAYER_CHARS) {
    warnings.push({
      id: `page-${page.pageNumber}-no-text-layer`,
      kind: "no-text-layer",
      title: "No extractable text on this page",
      explanation:
        "This page produced almost no characters, so it is probably an image or a scan. " +
        "An ATS reads the text layer, not pixels — to a parser this page is blank.",
      pageNumber: page.pageNumber,
      regions: [{ x: 0, y: 0, w: page.width, h: page.height }],
    });
    return warnings;
  }

  const columns = detectColumns(page);
  const interleaving = measureInterleaving(page, columns);
  if (interleaving.isInterleaved) {
    warnings.push({
      id: `page-${page.pageNumber}-multi-column`,
      kind: "multi-column",
      title: "Columns are read across, not down",
      explanation:
        "Your columns look separate to the eye, but the parser jumps between them line by " +
        "line, so text from one column lands in the middle of the other. Job titles end up " +
        "next to a neighbouring column's dates.",
      pageNumber: page.pageNumber,
      regions: columns.map((column) => pad(column.bounds, HIGHLIGHT_PAD_PT)),
    });
  }

  for (const [index, region] of detectTables(page).entries()) {
    const scrambled = isTableOutOfOrder(region);
    warnings.push({
      id: `page-${page.pageNumber}-table-${index}`,
      kind: "table",
      title: scrambled ? "Table cells arrive out of order" : "Table detected",
      explanation: scrambled
        ? "The parser emits this table's cells down the columns instead of across the rows, " +
          "so each row's values are separated from their labels in the text stream."
        : "Tables are often read cell-by-cell, and many parsers drop the row structure " +
          "entirely — safest to lay this content out as plain lines.",
      pageNumber: page.pageNumber,
      regions: [pad(region.bounds, HIGHLIGHT_PAD_PT)],
    });
  }

  return warnings;
}

export function analyzePages(pages: readonly PageContent[]): ParseWarning[] {
  return pages.flatMap(analyzePage);
}

/** The full text stream an ATS ingests: every page in native order. */
export function extractedText(pages: readonly PageContent[]): string {
  return pages
    .map((page) => runsToText(nativeOrder(page)))
    .join("\n\n")
    .trim();
}
