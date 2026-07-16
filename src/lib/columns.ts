import type { PageContent, Rect, TextRun } from "../parsers/types";
import { bottom, overlap1d, right, union } from "./geometry";
import { groupIntoLines } from "./lines";

/** A detected vertical text column and the runs that live inside it. */
export interface Column {
  /** Left/right bounds of the column band in page coordinates. */
  x0: number;
  x1: number;
  bounds: Rect;
  runs: TextRun[];
}

/** A gutter must be at least this wide, and at least this share of the page. */
const MIN_GUTTER_PT = 18;
const MIN_GUTTER_RATIO = 0.04;

/** Gutters inside these outer margins are page margin, not a column split. */
const INTERIOR_MARGIN_RATIO = 0.15;

/**
 * Share of lines allowed to cross a gutter. A resume's name banner, section
 * rule, or footer spans the full width and legitimately crosses; the body
 * lines do not. Requiring a perfectly empty gutter would miss every layout
 * with a header — which is nearly all of them.
 */
const MAX_CROSSING_LINE_RATIO = 0.25;

/** A page needs this many lines before a gutter reading means anything. */
const MIN_LINES = 4;

/** A real column needs this many runs; fewer is a stray label or a bullet. */
const MIN_RUNS_PER_COLUMN = 3;

/** Side-by-side columns must overlap vertically by this share of the shorter. */
const MIN_VERTICAL_OVERLAP_RATIO = 0.5;

/**
 * Detect side-by-side text columns by finding the vertical band of the page
 * that almost no line of text crosses.
 *
 * Returns the columns left-to-right, or an empty array when the page is
 * single-column — the common case, and the one an ATS reads fine.
 */
export function detectColumns(page: PageContent): Column[] {
  const lines = groupIntoLines(page.runs);
  if (lines.length < MIN_LINES) return [];

  const gutter = findGutter(lines, page.width);
  if (!gutter) return [];

  const left = page.runs.filter((run) => right(run) <= gutter.start);
  const rightRuns = page.runs.filter((run) => run.x >= gutter.end);
  if (left.length < MIN_RUNS_PER_COLUMN || rightRuns.length < MIN_RUNS_PER_COLUMN) {
    return [];
  }
  if (!sitSideBySide(left, rightRuns)) return [];

  return [toColumn(left), toColumn(rightRuns)];
}

interface Gutter {
  start: number;
  end: number;
}

/**
 * The widest interior band crossed by at most a quarter of the page's lines.
 *
 * Coverage is counted per line rather than per run, so a line split into many
 * runs cannot outvote a line that is one run.
 */
function findGutter(lines: readonly TextRun[][], pageWidth: number): Gutter | null {
  const width = Math.ceil(pageWidth);
  const crossings = new Array<number>(width).fill(0);

  for (const line of lines) {
    const covered = new Set<number>();
    for (const run of line) {
      const from = Math.max(0, Math.floor(run.x));
      const to = Math.min(width, Math.ceil(right(run)));
      for (let x = from; x < to; x++) covered.add(x);
    }
    for (const x of covered) crossings[x]++;
  }

  const maxCrossings = Math.floor(lines.length * MAX_CROSSING_LINE_RATIO);
  const minWidth = Math.max(MIN_GUTTER_PT, pageWidth * MIN_GUTTER_RATIO);
  const interiorStart = Math.floor(pageWidth * INTERIOR_MARGIN_RATIO);
  const interiorEnd = Math.ceil(pageWidth * (1 - INTERIOR_MARGIN_RATIO));

  let best: Gutter | null = null;
  let start: number | null = null;

  for (let x = interiorStart; x <= interiorEnd; x++) {
    const open = x < interiorEnd && crossings[x] <= maxCrossings;

    if (open && start === null) start = x;
    if (!open && start !== null) {
      const candidate = { start, end: x };
      if (candidate.end - candidate.start >= minWidth) {
        if (!best || candidate.end - candidate.start > best.end - best.start) best = candidate;
      }
      start = null;
    }
  }

  return best;
}

/**
 * True when the two run groups occupy the same vertical band — the signature
 * of real columns, as opposed to two blocks that merely sit on opposite sides
 * of the page at different heights.
 */
function sitSideBySide(a: readonly TextRun[], b: readonly TextRun[]): boolean {
  const boundsA = union(a);
  const boundsB = union(b);
  if (!boundsA || !boundsB) return false;

  const shared = overlap1d(boundsA.y, bottom(boundsA), boundsB.y, bottom(boundsB));
  const shorter = Math.min(boundsA.h, boundsB.h);
  return shorter > 0 && shared >= shorter * MIN_VERTICAL_OVERLAP_RATIO;
}

function toColumn(runs: TextRun[]): Column {
  const bounds = union(runs)!;
  return { x0: bounds.x, x1: right(bounds), bounds, runs };
}
