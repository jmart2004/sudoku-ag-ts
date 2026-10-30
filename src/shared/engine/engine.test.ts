import {
  completedUnits,
  countSolutions,
  generatePuzzle,
  gradePuzzle,
  peersOf,
  Technique,
  UNITS,
} from ".";

const isValidSolution = (board: number[]) =>
  board.every(
    (value, cell) =>
      value >= 1 &&
      value <= 9 &&
      peersOf(cell).every((peer) => board[peer] !== value)
  );

// A well-known puzzle that needs only singles.
const SINGLES_PUZZLE =
  "003020600900305001001806400008102900700000008006708200002609500800203009005010300"
    .split("")
    .map(Number);

test("grid geometry", () => {
  expect(UNITS).toHaveLength(27);
  expect(peersOf(0)).toHaveLength(20);
  expect(peersOf(40)).toHaveLength(20);
});

test.each(["easy", "medium", "hard"] as const)(
  "%s puzzles are unique, match their solution and land in their grade",
  (difficulty) => {
    const { puzzle, solution, grade } = generatePuzzle(difficulty);
    expect(isValidSolution(solution)).toBe(true);
    puzzle.forEach((value, cell) => {
      if (value !== 0) expect(value).toBe(solution[cell]);
    });
    expect(countSolutions(puzzle)).toBe(1);
    expect(grade.solved).toBe(true);
    const expected = {
      easy: [Technique.NakedSingle, Technique.HiddenSingle],
      medium: [Technique.LockedCandidates, Technique.LockedCandidates],
      hard: [Technique.NakedPair, Technique.XWing],
    }[difficulty];
    expect(grade.hardest).toBeGreaterThanOrEqual(expected[0]);
    expect(grade.hardest).toBeLessThanOrEqual(expected[1]);
  }
);

test("grader solves a singles-only puzzle without advanced techniques", () => {
  const grade = gradePuzzle(SINGLES_PUZZLE);
  expect(grade.solved).toBe(true);
  expect(grade.hardest).toBeLessThanOrEqual(Technique.HiddenSingle);
});

test("countSolutions detects ambiguous and broken puzzles", () => {
  expect(countSolutions(Array(81).fill(0))).toBe(2);
  const broken = [...SINGLES_PUZZLE];
  broken[0] = 2; // clashes with the 2 in row 1
  expect(countSolutions(broken)).toBe(0);
});

test("completedUnits finds the row, column and box a move completes", () => {
  const { solution } = generatePuzzle("easy");
  const board = [...solution];
  board[0] = 0;
  expect(completedUnits(board, 0)).toHaveLength(0);
  board[0] = solution[0];
  expect(completedUnits(board, 0)).toHaveLength(3);
});
