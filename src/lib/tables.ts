import type { PageContent, Rect, TextRun } from "../parsers/types";
import { union } from "./geometry";
import { gapsWithin, groupIntoLines } from "./lines";

/** A run of consecutive lines that look like the rows of a table. */
export interface TableRegion {
  bounds: Rect;
  rows: TextRun[][];
  /** Left edges shared by the rows — the detected cell columns. */
  cellEdges: number[];
}

/** A row needs at least this many cells; two runs is usually a label and value. */
const MIN_CELLS_PER_ROW = 3;

/** Whitespace this wide between runs reads as a cell boundary, not a word space. */
const MIN_CELL_GAP_PT = 12;

/** Cell edges within this distance across rows count as the same column. */
const EDGE_TOLERANCE_PT = 6;

/** A table needs this many consecutive aligned rows; one row is a stray line. */
const MIN_ROWS = 2;

/** Rows must share at least this many cell edges to be the same table. */
const MIN_SHARED_EDGES = 2;

/** True when a line splits into cells: enough runs, separated by wide gaps. */
export function isRowLike(line: readonly TextRun[]): boolean {
  if (line.length < MIN_CELLS_PER_ROW) return false;
  const wideGaps = gapsWithin(line).filter((gap) => gap >= MIN_CELL_GAP_PT);
  return wideGaps.length >= MIN_CELLS_PER_ROW - 1;
}

/**
 * Detect tables as consecutive row-like lines whose cells align on shared left
 * edges. Alignment is what separates a table from a paragraph that happens to
 * have wide word spacing from justified text.
 */
export function detectTables(page: PageContent): TableRegion[] {
  const lines = groupIntoLines(page.runs);
  const regions: TableRegion[] = [];
  let current: TextRun[][] = [];

  const flush = () => {
    if (current.length >= MIN_ROWS) {
      const bounds = union(current.flat());
      if (bounds) regions.push({ bounds, rows: current, cellEdges: sharedEdges(current) });
    }
    current = [];
  };

  for (const line of lines) {
    if (!isRowLike(line)) {
      flush();
      continue;
    }
    if (current.length > 0 && sharedEdges([...current, line]).length < MIN_SHARED_EDGES) {
      flush();
    }
    current.push(line);
  }
  flush();

  return regions;
}

/**
 * Left edges present in every row, within tolerance. Uses the first row's
 * edges as candidates: a table's columns are established by its first row.
 */
function sharedEdges(rows: readonly TextRun[][]): number[] {
  if (rows.length === 0) return [];

  return rows[0]
    .map((run) => run.x)
    .filter((edge) =>
      rows.every((row) => row.some((run) => Math.abs(run.x - edge) <= EDGE_TOLERANCE_PT)),
    );
}

/**
 * Read a table's cells in the order the document reports them, which is what
 * an ATS ingests. Cells emitted column-major arrive out of visual row order —
 * a job title landing next to another row's dates.
 */
export function tableCellsInNativeOrder(region: TableRegion): TextRun[] {
  return region.rows.flat().sort((a, b) => a.order - b.order);
}

/** True when the document emits the table's cells out of visual row order. */
export function isTableOutOfOrder(region: TableRegion): boolean {
  const visual = region.rows.flat();
  const native = tableCellsInNativeOrder(region);
  return visual.some((run, index) => native[index].order !== run.order);
}
