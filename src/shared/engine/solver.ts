// Backtracking solver using candidate bitmasks and most-constrained-cell-first.

import { bit, Geometry, shuffle } from "./grid";

interface SolveResult {
  count: number;
  solution: number[] | null;
  // True if the search gave up after `maxNodes` guesses.
  aborted: boolean;
}

// Find up to `limit` solutions. With `randomize`, digits are tried in random
// order, which turns the solver into a generator of random full grids.
export function solve(
  geometry: Geometry,
  puzzle: number[],
  limit = 2,
  randomize = false,
  maxNodes = Infinity
): SolveResult {
  const { cellCount, unitsOf, allDigits, digits } = geometry;
  const board = [...puzzle];
  // Digits already used in each unit.
  const used = Array(geometry.units.length).fill(0);
  for (let cell = 0; cell < cellCount; cell++) {
    const v = board[cell];
    if (!v) continue;
    const b = bit(v);
    if (unitsOf[cell].some((u) => used[u] & b)) {
      return { count: 0, solution: null, aborted: false };
    }
    unitsOf[cell].forEach((u) => (used[u] |= b));
  }

  let count = 0;
  let solution: number[] | null = null;
  let nodes = 0;
  let aborted = false;

  const search = (): boolean => {
    if (++nodes > maxNodes) {
      aborted = true;
      return true;
    }
    let best = -1;
    let bestMask = 0;
    let bestSize = Infinity;
    for (let cell = 0; cell < cellCount; cell++) {
      if (board[cell]) continue;
      const [r, c, g] = unitsOf[cell];
      const mask = allDigits & ~(used[r] | used[c] | used[g]);
      let size = 0;
      for (let m = mask; m; m &= m - 1) size++;
      if (size < bestSize) {
        best = cell;
        bestMask = mask;
        bestSize = size;
        if (size <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (!solution) solution = [...board];
      return count >= limit;
    }
    if (bestSize === 0) return false;

    const units = unitsOf[best];
    const options = digits.filter((d) => bestMask & bit(d));
    for (const d of randomize ? shuffle(options) : options) {
      const b = bit(d);
      board[best] = d;
      units.forEach((u) => (used[u] |= b));
      if (search()) return true;
      units.forEach((u) => (used[u] &= ~b));
    }
    board[best] = 0;
    return false;
  };

  search();
  return aborted
    ? { count: 0, solution: null, aborted }
    : { count, solution, aborted };
}

export const countSolutions = (
  geometry: Geometry,
  puzzle: number[],
  limit = 2
) => solve(geometry, puzzle, limit).count;

// Random jigsaw layouts sometimes have no solution, and proving that can take
// an exhaustive search; give up quickly and let the caller try another layout.
const FILL_BUDGET = 20000;

// A random full grid, or null if none was found within the search budget.
export function randomSolvedGrid(geometry: Geometry): number[] | null {
  return solve(geometry, Array(geometry.cellCount).fill(0), 1, true, FILL_BUDGET)
    .solution;
}
