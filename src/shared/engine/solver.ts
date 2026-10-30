// Backtracking solver using candidate bitmasks and most-constrained-cell-first.

import { ALL_DIGITS, boxOf, colOf, DIGITS, rowOf, shuffle, bit } from "./grid";

interface SolveResult {
  count: number;
  solution: number[] | null;
}

// Find up to `limit` solutions. With `randomize`, digits are tried in random
// order, which turns the solver into a generator of random full grids.
export function solve(
  puzzle: number[],
  limit = 2,
  randomize = false
): SolveResult {
  const board = [...puzzle];
  const rows = Array(9).fill(0);
  const cols = Array(9).fill(0);
  const boxes = Array(9).fill(0);
  for (let cell = 0; cell < 81; cell++) {
    const v = board[cell];
    if (!v) continue;
    const b = bit(v);
    if (
      rows[rowOf(cell)] & b ||
      cols[colOf(cell)] & b ||
      boxes[boxOf(cell)] & b
    ) {
      return { count: 0, solution: null };
    }
    rows[rowOf(cell)] |= b;
    cols[colOf(cell)] |= b;
    boxes[boxOf(cell)] |= b;
  }

  let count = 0;
  let solution: number[] | null = null;

  const search = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestSize = 10;
    for (let cell = 0; cell < 81; cell++) {
      if (board[cell]) continue;
      const mask =
        ALL_DIGITS &
        ~(rows[rowOf(cell)] | cols[colOf(cell)] | boxes[boxOf(cell)]);
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

    const r = rowOf(best);
    const c = colOf(best);
    const bx = boxOf(best);
    const digits = DIGITS.filter((d) => bestMask & bit(d));
    for (const d of randomize ? shuffle(digits) : digits) {
      const b = bit(d);
      board[best] = d;
      rows[r] |= b;
      cols[c] |= b;
      boxes[bx] |= b;
      if (search()) return true;
      rows[r] &= ~b;
      cols[c] &= ~b;
      boxes[bx] &= ~b;
    }
    board[best] = 0;
    return false;
  };

  search();
  return { count, solution };
}

export const countSolutions = (puzzle: number[], limit = 2) =>
  solve(puzzle, limit).count;

export function randomSolvedGrid(): number[] {
  return solve(Array(81).fill(0), 1, true).solution!;
}
