/** Files above this size are rejected before parsing; a resume is never this big. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type FileKind = "pdf" | "docx";

export type Validation =
  | { ok: true; kind: FileKind }
  | { ok: false; reason: string };

const EXTENSIONS: Record<string, FileKind> = {
  ".pdf": "pdf",
  ".docx": "docx",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * Decide whether a dropped file can be parsed, naming the reason when it
 * cannot. Every rejection is phrased for the user, not the console — this is
 * the only boundary where a bad file can enter the app.
 */
export function validateFile(file: { name: string; size: number }): Validation {
  const kind = EXTENSIONS[extensionOf(file.name)];

  if (!kind) {
    const extension = extensionOf(file.name);
    return {
      ok: false,
      reason: extension
        ? `${extension} files are not supported — upload a PDF or DOCX.`
        : "That file has no extension — upload a PDF or DOCX.",
    };
  }

  if (file.size === 0) {
    return { ok: false, reason: "That file is empty — there is nothing to parse." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason:
        `That file is ${formatBytes(file.size)}; the limit is ` +
        `${formatBytes(MAX_FILE_BYTES)}. A resume this large is usually a scan.`,
    };
  }

  return { ok: true, kind };
}
