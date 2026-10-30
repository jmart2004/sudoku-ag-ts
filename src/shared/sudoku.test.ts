import { countSolutions, generatePuzzle, peersOf } from "./sudoku";

const isValidSolution = (board: number[]) =>
  board.every(
    (value, cell) =>
      value >= 1 &&
      value <= 9 &&
      peersOf(cell).every((peer) => board[peer] !== value)
  );

test("each cell has 20 peers", () => {
  expect(peersOf(0)).toHaveLength(20);
  expect(peersOf(40)).toHaveLength(20);
});

test.each(["easy", "medium", "hard"] as const)(
  "%s puzzles have a single solution that matches the givens",
  (difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    expect(isValidSolution(solution)).toBe(true);
    puzzle.forEach((value, cell) => {
      if (value !== 0) expect(value).toBe(solution[cell]);
    });
    expect(countSolutions(puzzle)).toBe(1);
  }
);

test("countSolutions detects ambiguous puzzles", () => {
  expect(countSolutions(Array(81).fill(0))).toBe(2);
});
