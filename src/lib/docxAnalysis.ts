import type { ParseWarning } from "../parsers/types";

/**
 * Warnings derivable from a DOCX's converted HTML.
 *
 * A DOCX has no fixed page geometry — text reflows — so the column and table
 * *position* detectors do not apply. What the markup does tell us is which
 * structures are present, which is enough to explain the ATS risk. Warnings
 * carry no regions: there is no rendered page to draw a box on.
 */
export function analyzeDocxHtml(html: string): ParseWarning[] {
  const warnings: ParseWarning[] = [];

  const tables = countMatches(html, /<table[\s>]/gi);
  if (tables > 0) {
    warnings.push({
      id: "docx-table",
      kind: "table",
      title: tables === 1 ? "Table detected" : `${tables} tables detected`,
      explanation:
        "Tables are often read cell-by-cell, and many parsers drop the row structure " +
        "entirely — so a row's dates can end up detached from its job title. Plain lines " +
        "survive every parser.",
      pageNumber: 1,
      regions: [],
    });
  }

  const images = countMatches(html, /<img[\s>]/gi);
  if (images > 0) {
    warnings.push({
      id: "docx-image",
      kind: "no-text-layer",
      title: images === 1 ? "Image found" : `${images} images found`,
      explanation:
        "Any words inside an image are invisible to an ATS — it reads the text layer, not " +
        "pixels. If this image holds a skills chart or contact details, repeat them as text.",
      pageNumber: 1,
      regions: [],
    });
  }

  return warnings;
}

function countMatches(haystack: string, pattern: RegExp): number {
  return haystack.match(pattern)?.length ?? 0;
}

/**
 * mammoth converts only the document body, dropping content that lives in text
 * boxes, headers, and footers — the same blind spot most ATS parsers have. If
 * the raw text is much shorter than the document's own character count, some
 * content was skipped this way.
 */
export function warnOnSkippedContent(
  extractedChars: number,
  messages: readonly { message: string }[],
): ParseWarning | null {
  const skipped = messages.filter((m) => /unrecognised|ignoring|unsupported/i.test(m.message));
  if (skipped.length === 0) return null;

  return {
    id: "docx-skipped-content",
    kind: "no-text-layer",
    title: "Some content was skipped",
    explanation:
      `The converter skipped ${skipped.length} element(s) it could not read — text boxes, ` +
      "shapes, and SmartArt are the usual causes, and ATS parsers skip them too. " +
      (extractedChars === 0
        ? "Nothing at all was extracted from this file."
        : "Anything you cannot see in the text stream is invisible to a parser."),
    pageNumber: 1,
    regions: [],
  };
}
