import type { TextRun } from "../parsers/types";
import { bottom, overlap1d } from "./geometry";

/**
 * Group runs into visual lines by vertical overlap, then sort each line
 * left-to-right. Two runs share a line when their vertical extents overlap by
 * more than half of the shorter run's height, which tolerates the small
 * baseline jitter of superscripts and mixed font sizes.
 */
export function groupIntoLines(runs: readonly TextRun[]): TextRun[][] {
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextRun[][] = [];

  for (const run of sorted) {
    const line = lines.find((candidate) => sharesLine(candidate, run));
    if (line) line.push(run);
    else lines.push([run]);
  }

  for (const line of lines) line.sort((a, b) => a.x - b.x);
  lines.sort((a, b) => a[0].y - b[0].y);
  return lines;
}

function sharesLine(line: readonly TextRun[], run: TextRun): boolean {
  return line.some((member) => {
    const shared = overlap1d(member.y, bottom(member), run.y, bottom(run));
    const shorter = Math.min(member.h, run.h);
    return shorter > 0 && shared > shorter / 2;
  });
}

/** Horizontal gaps between consecutive runs on a line, in reading order. */
export function gapsWithin(line: readonly TextRun[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < line.length; i++) {
    gaps.push(line[i].x - (line[i - 1].x + line[i - 1].w));
  }
  return gaps;
}
