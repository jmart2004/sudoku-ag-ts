// Builds puzzles with a single solution, graded by the techniques they need.

import { Grade, gradePuzzle, Technique } from "./grader";
import { CELLS, shuffle } from "./grid";
import { countSolutions, randomSolvedGrid } from "./solver";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const STARTING_LIVES: Record<Difficulty, number> = {
  easy: 5,
  medium: 4,
  hard: 3,
};

interface DifficultySpec {
  // Stop removing clues once the puzzle is down to this many.
  minClues: number;
  // The hardest technique a solver must need, inclusive.
  techniques: [Technique, Technique];
}

const SPECS: Record<Difficulty, DifficultySpec> = {
  // Generous clues; singles only.
  easy: {
    minClues: 38,
    techniques: [Technique.NakedSingle, Technique.HiddenSingle],
  },
  // Sparse, and singles alone are never enough.
  medium: {
    minClues: 26,
    techniques: [Technique.LockedCandidates, Technique.LockedCandidates],
  },
  // Needs pairs, triples or an X-wing, but never guessing.
  hard: {
    minClues: 22,
    techniques: [Technique.NakedPair, Technique.XWing],
  },
};

export interface GeneratedPuzzle {
  puzzle: number[];
  solution: number[];
  grade: Grade;
}

// Clear clues in 180-degree-symmetric pairs, keeping the solution unique.
function carve(solution: number[], minClues: number): number[] {
  const puzzle = [...solution];
  let clues = 81;
  for (const cell of shuffle(CELLS.slice(0, 41))) {
    const mirror = 80 - cell;
    const removing = cell === mirror ? 1 : 2;
    if (clues - removing < minClues) continue;
    puzzle[cell] = 0;
    puzzle[mirror] = 0;
    if (countSolutions(puzzle) === 1) {
      clues -= removing;
    } else {
      puzzle[cell] = solution[cell];
      puzzle[mirror] = solution[mirror];
    }
  }
  return puzzle;
}

const fits = (grade: Grade, [low, high]: [Technique, Technique]) =>
  grade.solved && grade.hardest >= low && grade.hardest <= high;

// One generation attempt; null if the puzzle didn't land in the target grade.
export function tryGeneratePuzzle(
  difficulty: Difficulty
): GeneratedPuzzle | null {
  const spec = SPECS[difficulty];
  const solution = randomSolvedGrid();
  const puzzle = carve(solution, spec.minClues);
  const grade = gradePuzzle(puzzle);
  return fits(grade, spec.techniques) ? { puzzle, solution, grade } : null;
}

// Keep trying until a puzzle fits the grade. Hard puzzles take ~30 attempts
// (around 150ms) on average.
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  for (;;) {
    const result = tryGeneratePuzzle(difficulty);
    if (result) return result;
  }
}
