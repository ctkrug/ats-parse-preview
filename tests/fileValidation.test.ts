import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  extensionOf,
  formatBytes,
  validateFile,
} from "../src/lib/fileValidation";

const file = (name: string, size = 1024) => ({ name, size });

describe("extensionOf", () => {
  it("returns the lowercased extension", () => {
    expect(extensionOf("Resume.PDF")).toBe(".pdf");
  });

  it("returns an empty string when there is no extension", () => {
    expect(extensionOf("resume")).toBe("");
  });

  it("uses the last dot in a multi-dot name", () => {
    expect(extensionOf("charlie.krug.resume.docx")).toBe(".docx");
  });

  it("handles a dotfile with no extension", () => {
    expect(extensionOf(".gitignore")).toBe(".gitignore");
  });
});

describe("formatBytes", () => {
  it("shows bytes below a kilobyte", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("shows kilobytes", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("shows megabytes with one decimal", () => {
    expect(formatBytes(12 * 1024 * 1024)).toBe("12.0 MB");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("validateFile", () => {
  it("accepts a PDF", () => {
    expect(validateFile(file("resume.pdf"))).toEqual({ ok: true, kind: "pdf" });
  });

  it("accepts a DOCX", () => {
    expect(validateFile(file("resume.docx"))).toEqual({ ok: true, kind: "docx" });
  });

  it("accepts regardless of extension case", () => {
    expect(validateFile(file("RESUME.PDF"))).toEqual({ ok: true, kind: "pdf" });
  });

  it("rejects an unsupported type, naming it", () => {
    const result = validateFile(file("headshot.png"));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(".png");
  });

  it("rejects legacy .doc, which is not the same format as .docx", () => {
    expect(validateFile(file("resume.doc")).ok).toBe(false);
  });

  it("rejects a file with no extension", () => {
    const result = validateFile(file("resume"));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("no extension");
  });

  it("rejects an empty file", () => {
    const result = validateFile(file("resume.pdf", 0));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("empty");
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateFile(file("resume.pdf", MAX_FILE_BYTES)).ok).toBe(true);
  });

  it("rejects a file one byte over the limit, naming both sizes", () => {
    const result = validateFile(file("resume.pdf", MAX_FILE_BYTES + 1));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("10.0 MB");
  });

  it("checks the type before the size, so an oversized PNG reads as unsupported", () => {
    const result = validateFile(file("scan.png", MAX_FILE_BYTES * 3));
    expect(result.ok === false && result.reason).toContain("not supported");
  });
});
