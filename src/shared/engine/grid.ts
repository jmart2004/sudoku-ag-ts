// Geometry of a 9x9 board. Boards are flat arrays of 81 numbers (row-major),
// 0 meaning empty. Candidate sets are bitmasks where bit n means digit n.

export const CELLS = Array.from({ length: 81 }, (_, i) => i);
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const ALL_DIGITS = 0b1111111110;

export const rowOf = (cell: number) => Math.floor(cell / 9);
export const colOf = (cell: number) => cell % 9;
export const boxOf = (cell: number) =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3);

// The 27 units: rows 0-8, columns 9-17, boxes 18-26.
export const UNITS: number[][] = [
  ...DIGITS.map((_, r) => CELLS.filter((c) => rowOf(c) === r)),
  ...DIGITS.map((_, c) => CELLS.filter((cell) => colOf(cell) === c)),
  ...DIGITS.map((_, b) => CELLS.filter((c) => boxOf(c) === b)),
];

// Units each cell belongs to, as [row, column, box] unit indexes.
export const UNITS_OF: number[][] = CELLS.map((c) => [
  rowOf(c),
  9 + colOf(c),
  18 + boxOf(c),
]);

// The 20 cells sharing a row, column or box with each cell.
const PEERS: number[][] = CELLS.map((cell) =>
  CELLS.filter(
    (other) =>
      other !== cell &&
      (rowOf(other) === rowOf(cell) ||
        colOf(other) === colOf(cell) ||
        boxOf(other) === boxOf(cell))
  )
);

export const peersOf = (cell: number) => PEERS[cell];

export const bit = (digit: number) => 1 << digit;

export function popcount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

export function digitsOf(mask: number): number[] {
  return DIGITS.filter((d) => mask & bit(d));
}

// Units the cell completes on this board (every cell in them filled).
export function completedUnits(board: number[], cell: number): number[][] {
  return UNITS_OF[cell]
    .map((u) => UNITS[u])
    .filter((unit) => unit.every((c) => board[c] !== 0));
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
