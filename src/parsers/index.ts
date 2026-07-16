import { validateFile } from "../lib/fileValidation";
import { ParseError, describeParseFailure } from "../lib/parseErrors";
import { extractFromDocx } from "./docx";
import { extractFromPdf } from "./pdf";
import type { ExtractedDocument } from "./types";

export { ParseError };
export type { ExtractedDocument };

/**
 * Parse a dropped file into the text stream and warnings, entirely in the
 * browser — nothing here touches the network.
 *
 * Throws only ParseError: validation and parser failures alike arrive as a
 * message the UI can show directly.
 */
export async function parseFile(file: File): Promise<ExtractedDocument> {
  const validation = validateFile(file);
  if (!validation.ok) throw new ParseError(validation.reason);

  try {
    return validation.kind === "pdf"
      ? await extractFromPdf(file)
      : await extractFromDocx(file);
  } catch (error) {
    throw new ParseError(describeParseFailure(validation.kind, error));
  }
}
