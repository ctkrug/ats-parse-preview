import type { Rect } from "../parsers/types";

export function right(r: Rect): number {
  return r.x + r.w;
}

export function bottom(r: Rect): number {
  return r.y + r.h;
}

export function centerY(r: Rect): number {
  return r.y + r.h / 2;
}

/** Smallest rectangle containing every input. Returns null for an empty list. */
export function union(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, right(r));
    maxY = Math.max(maxY, bottom(r));
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Grow a rect by `pad` on every side, clamped to non-negative coordinates. */
export function pad(r: Rect, amount: number): Rect {
  const x = Math.max(0, r.x - amount);
  const y = Math.max(0, r.y - amount);
  return {
    x,
    y,
    w: Math.max(0, right(r) + amount - x),
    h: Math.max(0, bottom(r) + amount - y),
  };
}

/** True when the rects share any area. Touching edges do not count. */
export function intersects(a: Rect, b: Rect): boolean {
  return a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
}

/** Length of the overlap between two 1-D spans; 0 when they are disjoint. */
export function overlap1d(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
