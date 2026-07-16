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

  return new TextEncoder().encode(pdf);
}

function escapeText(text: string): string {
  return text.replace(/([\\()])/g, "\\$1");
}

/** Convert a top-left y (how a layout is described) to PDF's bottom-left origin. */
export function fromTop(yFromTop: number): number {
  return PAGE_HEIGHT - yFromTop;
}
