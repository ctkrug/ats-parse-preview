import type { PageContent, Rect, TextRun } from "../parsers/types";
import { bottom, overlap1d, right, union } from "./geometry";

/** A detected vertical text column and the runs that live inside it. */
export interface Column {
  /** Left/right bounds of the column band in page coordinates. */
  x0: number;
  x1: number;
  bounds: Rect;
  runs: TextRun[];
}

/**
 * Runs wider than this share of the page are treated as spanning the full
 * width (headers, section rules, name banners). They cross every gutter, so
 * including them in the projection would erase the gaps we are looking for.
 */
const SPANNING_WIDTH_RATIO = 0.6;

/** A gutter must be at least this wide, and at least this share of the page. */
const MIN_GUTTER_PT = 18;
const MIN_GUTTER_RATIO = 0.04;

/** Gutters inside these outer margins are page margin, not a column split. */
const INTERIOR_MARGIN_RATIO = 0.15;

/** A real column needs this many runs; fewer is a stray label or a bullet. */
const MIN_RUNS_PER_COLUMN = 3;

/** Side-by-side columns must overlap vertically by this share of the shorter. */
const MIN_VERTICAL_OVERLAP_RATIO = 0.5;

export function isSpanningRun(run: TextRun, pageWidth: number): boolean {
  return run.w >= pageWidth * SPANNING_WIDTH_RATIO;
}

/**
 * Detect side-by-side text columns by looking for a vertical whitespace
 * gutter in the horizontal projection of the page's non-spanning runs.
 *
 * Returns the columns in left-to-right order, or an empty array when the page
 * is single-column — the common case, and the one where an ATS reads fine.
 */
export function detectColumns(page: PageContent): Column[] {
  const body = page.runs.filter((run) => !isSpanningRun(run, page.width));
  if (body.length < MIN_RUNS_PER_COLUMN * 2) return [];

  const gutter = findWidestGutter(body, page.width);
  if (!gutter) return [];

  const left = body.filter((run) => right(run) <= gutter.start);
  const rightRuns = body.filter((run) => run.x >= gutter.end);
  if (left.length < MIN_RUNS_PER_COLUMN || rightRuns.length < MIN_RUNS_PER_COLUMN) {
    return [];
  }
  if (!runsSitSideBySide(left, rightRuns)) return [];

  return [toColumn(left), toColumn(rightRuns)];
}

interface Gutter {
  start: number;
  end: number;
}

/**
 * The widest interior span of the page that no run's horizontal extent covers.
 */
function findWidestGutter(runs: readonly TextRun[], pageWidth: number): Gutter | null {
  const spans = [...runs]
    .map((run) => ({ start: run.x, end: right(run) }))
    .sort((a, b) => a.start - b.start);

  const minWidth = Math.max(MIN_GUTTER_PT, pageWidth * MIN_GUTTER_RATIO);
  const interiorStart = pageWidth * INTERIOR_MARGIN_RATIO;
  const interiorEnd = pageWidth * (1 - INTERIOR_MARGIN_RATIO);

  let best: Gutter | null = null;
  let covered = spans[0].end;

  for (const span of spans) {
    const gap = { start: covered, end: span.start };
    const wideEnough = gap.end - gap.start >= minWidth;
    const interior = gap.start >= interiorStart && gap.end <= interiorEnd;

    if (wideEnough && interior && (!best || gap.end - gap.start > best.end - best.start)) {
      best = gap;
    }
    covered = Math.max(covered, span.end);
  }

  return best;
}

/**
 * True when the two run groups occupy the same vertical band — the signature
 * of real columns, as opposed to two blocks that merely sit on opposite sides
 * of the page at different heights.
 */
function runsSitSideBySide(a: readonly TextRun[], b: readonly TextRun[]): boolean {
  const boundsA = union(a);
  const boundsB = union(b);
  if (!boundsA || !boundsB) return false;

  const shared = overlap1d(
    boundsA.y,
    bottom(boundsA),
    boundsB.y,
    bottom(boundsB),
  );
  const shorter = Math.min(boundsA.h, boundsB.h);
  return shorter > 0 && shared >= shorter * MIN_VERTICAL_OVERLAP_RATIO;
}

function toColumn(runs: TextRun[]): Column {
  const bounds = union(runs)!;
  return { x0: bounds.x, x1: right(bounds), bounds, runs };
}
