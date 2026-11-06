// Builds puzzles with a single solution, graded by the techniques they need.

import { Grade, gradePuzzle, Technique } from "./grader";
import {
  geometryFor,
  isJigsawSize,
  randomJigsawRegions,
  shuffle,
  standardGeometry,
} from "./grid";
import { countSolutions, randomSolvedGrid } from "./solver";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const STARTING_LIVES: Record<Difficulty, number> = {
  easy: 5,
  medium: 4,
  hard: 3,
};

interface DifficultySpec {
  // Stop removing clues once the puzzle is down to this share of its cells
  // (on 9×9: 38, 26 and 22 clues).
  minClueShare: number;
  // The hardest technique a solver must need, inclusive.
  techniques: [Technique, Technique];
}

const SPECS: Record<Difficulty, DifficultySpec> = {
  // Generous clues; singles only.
  easy: {
    minClueShare: 0.47,
    techniques: [Technique.NakedSingle, Technique.HiddenSingle],
  },
  // Sparse, and singles alone are never enough.
  medium: {
    minClueShare: 0.32,
    techniques: [Technique.LockedCandidates, Technique.LockedCandidates],
  },
  // Needs pairs, triples or an X-wing, but never guessing.
  hard: {
    minClueShare: 0.27,
    techniques: [Technique.NakedPair, Technique.XWing],
  },
};

// Small boards rarely or never need advanced techniques. After this many
// attempts the closest puzzle found is used instead; on small boards the
// difficulty then comes from the number of clues.
export const MAX_ATTEMPTS = 150;

export interface GeneratedPuzzle {
  size: number;
  // Region id of each cell (boxes, or jigsaw pieces).
  regions: number[];
  puzzle: number[];
  solution: number[];
  grade: Grade;
}

export interface Attempt {
  result: GeneratedPuzzle;
  // 0 when the grade is in the target range; larger means further off.
  distance: number;
}

// Clear clues in 180-degree-symmetric pairs, keeping the solution unique.
function carve(
  geometry: ReturnType<typeof geometryFor>,
  solution: number[],
  minClues: number
): number[] {
  const { cellCount } = geometry;
  const puzzle = [...solution];
  let clues = cellCount;
  const half = geometry.cells.slice(0, Math.ceil(cellCount / 2));
  for (const cell of shuffle(half)) {
    const mirror = cellCount - 1 - cell;
    const removing = cell === mirror ? 1 : 2;
    if (clues - removing < minClues) continue;
    puzzle[cell] = 0;
    puzzle[mirror] = 0;
    if (countSolutions(geometry, puzzle) === 1) {
      clues -= removing;
    } else {
      puzzle[cell] = solution[cell];
      puzzle[mirror] = solution[mirror];
    }
  }
  return puzzle;
}

function gradeDistance(grade: Grade, [low, high]: [Technique, Technique]) {
  // Puzzles needing guessing are never used if anything else exists.
  if (!grade.solved) return 100;
  if (grade.hardest < low) return low - grade.hardest;
  if (grade.hardest > high) return grade.hardest - high;
  return 0;
}

// One generation attempt, scored by how close it lands to the target grade.
// Null if a random jigsaw layout turned out to have no solution.
export function attemptPuzzle(
  size: number,
  difficulty: Difficulty
): Attempt | null {
  const spec = SPECS[difficulty];
  const geometry = isJigsawSize(size)
    ? geometryFor(randomJigsawRegions(size))
    : standardGeometry(size);
  const solution = randomSolvedGrid(geometry);
  if (!solution) return null;
  const puzzle = carve(
    geometry,
    solution,
    Math.ceil(spec.minClueShare * geometry.cellCount)
  );
  const grade = gradePuzzle(geometry, puzzle);
  return {
    result: { size, regions: geometry.regions, puzzle, solution, grade },
    distance: gradeDistance(grade, spec.techniques),
  };
}

// Keep trying until a puzzle fits the grade, or settle for the closest
// after MAX_ATTEMPTS. Hard 9×9 puzzles take ~30 attempts on average.
export function generatePuzzle(
  size: number,
  difficulty: Difficulty
): GeneratedPuzzle {
  let best: Attempt | null = null;
  for (let i = 0; i < MAX_ATTEMPTS || !best; i++) {
    const attempt = attemptPuzzle(size, difficulty);
    if (!attempt) continue;
    if (attempt.distance === 0) return attempt.result;
    if (!best || attempt.distance < best.distance) best = attempt;
  }
  return best.result;
}
