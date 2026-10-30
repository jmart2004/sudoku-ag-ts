// Pure sudoku logic shared by the browser client and the multiplayer server.
// Boards are flat arrays of 81 numbers (row-major), 0 meaning empty.

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Number of given clues to aim for when carving a puzzle.
const TARGET_CLUES: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 26,
};

export const STARTING_LIVES: Record<Difficulty, number> = {
  easy: 5,
  medium: 4,
  hard: 3,
};

export const rowOf = (cell: number) => Math.floor(cell / 9);
export const colOf = (cell: number) => cell % 9;
export const boxOf = (cell: number) =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3);

// Cells sharing a row, column or 3x3 box with the given cell (excluding itself).
export function peersOf(cell: number): number[] {
  const peers: number[] = [];
  for (let other = 0; other < 81; other++) {
    if (
      other !== cell &&
      (rowOf(other) === rowOf(cell) ||
        colOf(other) === colOf(cell) ||
        boxOf(other) === boxOf(cell))
    ) {
      peers.push(other);
    }
  }
  return peers;
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function canPlace(board: number[], cell: number, num: number): boolean {
  const row = rowOf(cell);
  const col = colOf(cell);
  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === num || board[i * 9 + col] === num) {
      return false;
    }
  }
  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r * 9 + c] === num) {
        return false;
      }
    }
  }
  return true;
}

// Fill the board in place with a random valid solution.
function fillRandom(board: number[]): boolean {
  const cell = board.indexOf(0);
  if (cell === -1) {
    return true;
  }
  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(board, cell, num)) {
      board[cell] = num;
      if (fillRandom(board)) {
        return true;
      }
    }
  }
  board[cell] = 0;
  return false;
}

// Count solutions, stopping once `limit` is reached.
export function countSolutions(puzzle: number[], limit = 2): number {
  const board = [...puzzle];
  let count = 0;
  const solve = (): boolean => {
    // Pick the empty cell with the fewest candidates to keep the search small.
    let bestCell = -1;
    let bestCandidates: number[] = [];
    for (let cell = 0; cell < 81; cell++) {
      if (board[cell] !== 0) continue;
      const candidates: number[] = [];
      for (let num = 1; num <= 9; num++) {
        if (canPlace(board, cell, num)) candidates.push(num);
      }
      if (bestCell === -1 || candidates.length < bestCandidates.length) {
        bestCell = cell;
        bestCandidates = candidates;
        if (candidates.length === 0) return false;
      }
    }
    if (bestCell === -1) {
      count++;
      return count >= limit;
    }
    for (const num of bestCandidates) {
      board[bestCell] = num;
      if (solve()) return true;
    }
    board[bestCell] = 0;
    return false;
  };
  solve();
  return count;
}

export interface GeneratedPuzzle {
  puzzle: number[];
  solution: number[];
}

// Generate a puzzle with exactly one solution, so every player in a race is
// judged against the same answer.
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const solution = Array(81).fill(0);
  fillRandom(solution);
  const puzzle = [...solution];
  let clues = 81;
  for (const cell of shuffle(Array.from({ length: 81 }, (_, i) => i))) {
    if (clues <= TARGET_CLUES[difficulty]) break;
    const value = puzzle[cell];
    puzzle[cell] = 0;
    if (countSolutions(puzzle) === 1) {
      clues--;
    } else {
      puzzle[cell] = value;
    }
  }
  return { puzzle, solution };
}
