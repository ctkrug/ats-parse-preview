/**
 * A minimal PDF writer for test fixtures.
 *
 * Real ATS behaviour depends on the order a PDF's content stream emits text,
 * which is exactly what a generic PDF library hides. Writing the bytes by hand
 * is the only way to fix that order in a test — a row-major two-column page is
 * the scramble this whole tool exists to reveal.
 */

export interface FixtureRun {
  /** Distance from the left edge of the page, in points. */
  x: number;
  /** Baseline distance from the *bottom* of the page: PDF user space. */
  y: number;
  text: string;
  size?: number;
}

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

/**
 * Build a single-page PDF whose text is emitted in exactly the given order.
 * Text is drawn with Helvetica, whose metrics pdf.js knows without embedding.
 */
export function buildPdf(runs: readonly FixtureRun[]): Uint8Array<ArrayBuffer> {
  const content = runs
    .map(
      (run) =>
        `BT /F1 ${run.size ?? 11} Tf 1 0 0 1 ${run.x} ${run.y} Tm (${escapeText(run.text)}) Tj ET`,
    )
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return toWinAnsiBytes(pdf);
}

function escapeText(text: string): string {
  return text.replace(/([\\()])/g, "\\$1");
}

/**
 * The page's font declares /Encoding /WinAnsiEncoding, which — for every
 * character this fixture builder can produce — maps a codepoint to the byte
 * of the same value (WinAnsi matches Latin-1 outside the 0x80-0x9F control
 * range). Encoding the whole file as UTF-8 instead would split any character
 * above U+007F into multiple bytes that WinAnsiEncoding decodes as garbage —
 * exactly the mojibake a real hostile/accented resume must not produce.
 */
function toWinAnsiBytes(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      throw new Error(
        `Fixture text contains U+${code.toString(16)}, outside WinAnsiEncoding's single-byte ` +
          "range (0x00-0xFF) — this builder cannot represent it faithfully.",
      );
    }
    bytes[i] = code;
  }
  return bytes as Uint8Array<ArrayBuffer>;
}

/** Convert a top-left y (how a layout is described) to PDF's bottom-left origin. */
export function fromTop(yFromTop: number): number {
  return PAGE_HEIGHT - yFromTop;
}
