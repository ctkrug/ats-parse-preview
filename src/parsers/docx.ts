import mammoth from "mammoth";
import { analyzeDocxHtml, warnOnSkippedContent } from "../lib/docxAnalysis";
import type { ExtractedDocument, ParseWarning } from "./types";

/**
 * Extract a DOCX's plain text plus a rendered HTML preview of the original.
 *
 * mammoth reads the document body the way an ATS does — walking the XML for
 * text and passing over the floating shapes and text boxes that never reach a
 * parser's stream — so its output is a fair stand-in for what gets ingested.
 */
export async function extractFromDocx(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  const [raw, rendered] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  const text = raw.value.trim();
  const warnings: ParseWarning[] = analyzeDocxHtml(rendered.value);

  const skipped = warnOnSkippedContent(text.length, [
    ...raw.messages,
    ...rendered.messages,
  ]);
  if (skipped) warnings.push(skipped);

  if (text.length === 0 && !skipped) {
    warnings.push({
      id: "docx-empty",
      kind: "no-text-layer",
      title: "No text could be extracted",
      explanation:
        "This document produced zero characters. An ATS would receive an empty resume — " +
        "check that the content is real text rather than an image or a floating text box.",
      pageNumber: 1,
      regions: [],
    });
  }

  return {
    fileName: file.name,
    text,
    pages: [],
    warnings,
    preview: { kind: "html", html: rendered.value },
  };
}
