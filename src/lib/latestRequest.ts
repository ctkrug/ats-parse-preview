/**
 * Guards against out-of-order async work: dropping file A then quickly
 * dropping file B before A's parse resolves must not let A's result win just
 * because it happens to finish last. Each caller starts a token and checks it
 * is still current before acting on its result.
 */
export interface LatestGuard {
  start(): number;
  isCurrent(token: number): boolean;
}

export function createLatestGuard(): LatestGuard {
  let current = 0;

  return {
    start(): number {
      current += 1;
      return current;
    },
    isCurrent(token: number): boolean {
      return token === current;
    },
  };
}
