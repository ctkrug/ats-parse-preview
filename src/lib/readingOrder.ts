import type { PageContent, TextRun } from "../parsers/types";
import type { Column } from "./columns";
import { groupIntoLines } from "./lines";

/**
 * The order a parser actually ingests: the order the document reports its text
 * runs in, which is content-stream order for a PDF. This is what an ATS sees.
 */
export function nativeOrder(page: PageContent): TextRun[] {
  return [...page.runs].sort((a, b) => a.order - b.order);
}

/**
 * The order a human reads: full-width runs above the columns (the header),
 * then each column top-to-bottom left-to-right, then anything below.
 *
 * Only meaningful for the simple header/columns/footer shape that resumes use;
 * a page with columns interrupted mid-way by spanning content is approximated.
 */
export function columnAwareOrder(page: PageContent, columns: readonly Column[]): TextRun[] {
  if (columns.length === 0) return byPosition(page.runs);

  const columnTop = Math.min(...columns.map((c) => c.bounds.y));
  const columnBottom = Math.max(...columns.map((c) => c.bounds.y + c.bounds.h));

  const spanning = page.runs.filter((run) => columnOf(run, columns) === -1);
  const above = spanning.filter((run) => run.y < columnTop);
  const below = spanning.filter((run) => run.y >= columnBottom);
  const between = spanning.filter((run) => !above.includes(run) && !below.includes(run));

  return [
    ...byPosition(above),
    ...columns.flatMap((column) => byPosition(column.runs)),
    ...byPosition(between),
    ...byPosition(below),
  ];
}

/** Reading order within one block: line by line, left to right. */
function byPosition(runs: readonly TextRun[]): TextRun[] {
  return groupIntoLines(runs).flat();
}

/**
 * Index of the column that fully contains a run, or -1 for a run that spans
 * across the gutter — a header, a section rule, a footer.
 */
export function columnOf(run: TextRun, columns: readonly Column[]): number {
  return columns.findIndex(
    (column) => run.x >= column.x0 && run.x + run.w <= column.x1,
  );
}

export interface Interleaving {
  /** Times the native order jumps from one column to another. */
  switches: number;
  /** Switches an uninterleaved read would need: one per column boundary. */
  ideal: number;
  /** True when the parser hops between columns more than reading them in turn. */
  isInterleaved: boolean;
}

/**
 * Measure how badly the native order interleaves the columns. Reading two
 * columns properly means exactly one switch (finish left, start right); a
 * row-major content stream switches on nearly every line, which is what
 * scrambles job titles into their neighbouring column's dates.
 */
export function measureInterleaving(
  page: PageContent,
  columns: readonly Column[],
): Interleaving {
  const ideal = Math.max(0, columns.length - 1);
  if (columns.length < 2) return { switches: 0, ideal, isInterleaved: false };

  const sequence = nativeOrder(page)
    .map((run) => columnOf(run, columns))
    .filter((index) => index >= 0);

  let switches = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) switches++;
  }

  return { switches, ideal, isInterleaved: switches > ideal };
}

/** Join runs into the text stream, breaking lines where the run's line changes. */
export function runsToText(runs: readonly TextRun[]): string {
  if (runs.length === 0) return "";

  const parts: string[] = [];
  let previous: TextRun | null = null;

  for (const run of runs) {
    if (previous && !onSameLine(previous, run)) parts.push("\n");
    else if (previous) parts.push(" ");
    parts.push(run.str);
    previous = run;
  }

  return parts.join("").replace(/[ \t]+\n/g, "\n").trim();
}

function onSameLine(a: TextRun, b: TextRun): boolean {
  const shared = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return shared > Math.min(a.h, b.h) / 2;
}
