import {
  boxRegions,
  completedUnits,
  countSolutions,
  generatePuzzle,
  geometryFor,
  gradePuzzle,
  isJigsawSize,
  randomJigsawRegions,
  SIZES,
  standardGeometry,
  Technique,
} from ".";

const isValidSolution = (regions: number[], board: number[]) => {
  const geometry = geometryFor(regions);
  return board.every(
    (value, cell) =>
      value >= 1 &&
      value <= geometry.size &&
      geometry.peers[cell].every((peer) => board[peer] !== value)
  );
};

// A well-known 9×9 puzzle that needs only singles.
const SINGLES_PUZZLE =
  "003020600900305001001806400008102900700000008006708200002609500800203009005010300"
    .split("")
    .map(Number);

test("9×9 geometry", () => {
  const g = standardGeometry(9);
  expect(g.units).toHaveLength(27);
  expect(g.peers[0]).toHaveLength(20);
  expect(g.peers[40]).toHaveLength(20);
});

test.each([
  [4, 2, 2],
  [6, 2, 3],
  [8, 2, 4],
])("%i×%i boards use %i×%i boxes", (size, boxRows, boxCols) => {
  const regions = boxRegions(size);
  // The first box holds exactly the top-left boxRows × boxCols cells.
  const firstBox = regions.flatMap((g, cell) => (g === 0 ? [cell] : []));
  expect(firstBox).toEqual(
    Array.from({ length: boxRows * boxCols }, (_, i) =>
      Math.floor(i / boxCols) * size + (i % boxCols)
    )
  );
});

test.each([5, 7])("%i×%i jigsaw layouts have N connected regions of N cells", (size) => {
  for (let i = 0; i < 5; i++) {
    const regions = randomJigsawRegions(size);
    for (let g = 0; g < size; g++) {
      const members = regions.flatMap((r, c) => (r === g ? [c] : []));
      expect(members).toHaveLength(size);
      // Connected: flood fill from one member reaches them all.
      const seen = new Set([members[0]]);
      const queue = [members[0]];
      while (queue.length) {
        const c = queue.pop()!;
        const row = Math.floor(c / size);
        const col = c % size;
        for (const n of [
          row > 0 ? c - size : -1,
          row < size - 1 ? c + size : -1,
          col > 0 ? c - 1 : -1,
          col < size - 1 ? c + 1 : -1,
        ]) {
          if (n >= 0 && regions[n] === g && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      expect(seen.size).toBe(size);
    }
  }
});

const cases = SIZES.flatMap((size) =>
  (["easy", "medium", "hard"] as const).map((d) => [size, d] as const)
);

test.each(cases)(
  "%i×%i %s puzzles are unique, logically solvable and match their solution",
  (size, difficulty) => {
    const { puzzle, solution, regions, grade } = generatePuzzle(size, difficulty);
    expect(puzzle).toHaveLength(size * size);
    if (!isJigsawSize(size)) expect(regions).toEqual(boxRegions(size));
    expect(isValidSolution(regions, solution)).toBe(true);
    puzzle.forEach((value, cell) => {
      if (value !== 0) expect(value).toBe(solution[cell]);
    });
    expect(countSolutions(geometryFor(regions), puzzle)).toBe(1);
    expect(grade.solved).toBe(true);
  }
);

test.each(["easy", "medium", "hard"] as const)(
  "9×9 %s puzzles land in their technique grade",
  (difficulty) => {
    const { grade } = generatePuzzle(9, difficulty);
    const [low, high] = {
      easy: [Technique.NakedSingle, Technique.HiddenSingle],
      medium: [Technique.LockedCandidates, Technique.LockedCandidates],
      hard: [Technique.NakedPair, Technique.XWing],
    }[difficulty];
    expect(grade.hardest).toBeGreaterThanOrEqual(low);
    expect(grade.hardest).toBeLessThanOrEqual(high);
  }
);

test("grader solves a singles-only puzzle without advanced techniques", () => {
  const grade = gradePuzzle(standardGeometry(9), SINGLES_PUZZLE);
  expect(grade.solved).toBe(true);
  expect(grade.hardest).toBeLessThanOrEqual(Technique.HiddenSingle);
});

test("countSolutions detects ambiguous and broken puzzles", () => {
  const g = standardGeometry(9);
  expect(countSolutions(g, Array(81).fill(0))).toBe(2);
  const broken = [...SINGLES_PUZZLE];
  broken[0] = 2; // clashes with the 2 in row 1
  expect(countSolutions(g, broken)).toBe(0);
});

test("completedUnits finds the row, column and region a move completes", () => {
  const { solution, regions } = generatePuzzle(6, "easy");
  const g = geometryFor(regions);
  const board = [...solution];
  board[0] = 0;
  expect(completedUnits(g, board, 0)).toHaveLength(0);
  board[0] = solution[0];
  expect(completedUnits(g, board, 0)).toHaveLength(3);
});

test("every size has a default geometry, including jigsaw sizes", () => {
  for (const size of SIZES) {
    const g = standardGeometry(size);
    expect(g.cellCount).toBe(size * size);
    expect(g.units).toHaveLength(3 * size);
  }
});
