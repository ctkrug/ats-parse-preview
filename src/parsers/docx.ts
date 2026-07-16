import mammoth from "mammoth";
import type { ExtractedDocument } from "./types";

export async function extractFromDocx(file: File): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  return {
    fileName: file.name,
    text: result.value,
    warnings: [],
  };
}
