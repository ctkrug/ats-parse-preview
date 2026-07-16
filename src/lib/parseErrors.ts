import type { FileKind } from "./fileValidation";

/** A failure a user can act on. Everything shown in the UI is one of these. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Translate a parser's internal failure into something a job seeker can act
 * on. pdf.js signals its known failures through the error's `name`; anything
 * unrecognised gets a plain statement rather than a raw stack trace, because
 * a blank screen with a console error is the failure mode this tool exists to
 * prevent.
 */
export function describeParseFailure(kind: FileKind, error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  if (name === "PasswordException") {
    return "This PDF is password-protected, so its text cannot be read. Save an unlocked copy and try again.";
  }

  if (name === "InvalidPDFException" || /invalid pdf/i.test(message)) {
    return "This file is not a readable PDF — it may be damaged or renamed from another format.";
  }

  if (kind === "docx" && /(zip|end of central directory|corrupt)/i.test(message)) {
    return "This file is not a readable DOCX — it may be damaged, or a .doc renamed to .docx.";
  }

  return kind === "pdf"
    ? "This PDF could not be parsed. It may be damaged or use an unusual encoding."
    : "This DOCX could not be parsed. It may be damaged or use an unusual encoding.";
}
