export interface ParseWarning {
  id: string;
  message: string;
}

export interface ExtractedDocument {
  fileName: string;
  text: string;
  warnings: ParseWarning[];
}
