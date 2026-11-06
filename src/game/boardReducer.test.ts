import { bit, generatePuzzle, geometryFor } from "../shared/engine";
import {
  boardReducer,
  completionOf,
  initialBoardState,
  planInput,
} from "./boardReducer";
import { missingDigits } from "../components/CellInspector";

const { puzzle, solution } = generatePuzzle(9, "easy");
const emptyCell = puzzle.indexOf(0);
const givenCell = puzzle.findIndex((v) => v !== 0);

test("selecting a filled cell highlights its digit; selecting again clears", () => {
  let state = boardReducer(initialBoardState(), {
    type: "select",
    cell: givenCell,
    board: puzzle,
  });
  expect(state.selected).toBe(givenCell);
  expect(state.highlight).toBe(puzzle[givenCell]);
  state = boardReducer(state, { type: "select", cell: givenCell, board: puzzle });
  expect(state.selected).toBeNull();
  expect(state.highlight).toBeNull();
});

test("arrow movement wraps around the board", () => {
  let state = boardReducer(initialBoardState(), {
    type: "select",
    cell: 0,
    board: puzzle,
  });
  state = boardReducer(state, { type: "move", dRow: -1, dCol: -1, board: puzzle });
  expect(state.selected).toBe(80);
});

test("other sizes: movement wraps within the board and reset sizes the notes", () => {
  const small = generatePuzzle(6, "easy");
  const geometry = geometryFor(small.regions);
  let state = boardReducer(initialBoardState(), { type: "reset", geometry });
  expect(state.notes).toHaveLength(36);
  state = boardReducer(state, { type: "select", cell: 0, board: small.puzzle });
  state = boardReducer(state, {
    type: "move",
    dRow: -1,
    dCol: -1,
    board: small.puzzle,
  });
  expect(state.selected).toBe(35);
});

test("jigsaw boards: a wrong guess points at clashes in its region", () => {
  const jig = generatePuzzle(5, "easy");
  const geometry = geometryFor(jig.regions);
  const cell = jig.puzzle.indexOf(0);
  // A digit already given somewhere in the cell's region.
  const regionPeer = geometry.peers[cell].find(
    (p) => jig.regions[p] === jig.regions[cell] && jig.puzzle[p] !== 0
  );
  if (regionPeer === undefined) return;
  let state = boardReducer(initialBoardState(), { type: "reset", geometry });
  state = boardReducer(state, {
    type: "guessResult",
    cell,
    value: jig.puzzle[regionPeer],
    correct: false,
    board: jig.puzzle,
  });
  expect(state.wrong?.conflicts).toContain(regionPeer);
});

test("planInput routes digits to guesses, notes or highlights", () => {
  let state = boardReducer(initialBoardState(), {
    type: "select",
    cell: emptyCell,
    board: puzzle,
  });
  expect(planInput(state, puzzle, true)).toBe("guess");
  expect(planInput(state, puzzle, false)).toBe("highlight");
  state = boardReducer(state, { type: "toggleNoteMode" });
  expect(planInput(state, puzzle, true)).toBe("note");
  state = boardReducer(state, { type: "guessSent", cell: emptyCell, value: 1 });
  expect(planInput(state, puzzle, true)).toBe("highlight");
  state = boardReducer(state, { type: "select", cell: givenCell, board: puzzle });
  expect(planInput(state, puzzle, true)).toBe("highlight");
});

test("notes toggle and undo", () => {
  let state = boardReducer(initialBoardState(), {
    type: "select",
    cell: emptyCell,
    board: puzzle,
  });
  state = boardReducer(state, { type: "toggleNote", digit: 3 });
  state = boardReducer(state, { type: "toggleNote", digit: 5 });
  expect(state.notes[emptyCell]).toBe(bit(3) | bit(5));
  state = boardReducer(state, { type: "undo" });
  expect(state.notes[emptyCell]).toBe(bit(3));
  state = boardReducer(state, { type: "clearNotes" });
  expect(state.notes[emptyCell]).toBe(0);
  state = boardReducer(state, { type: "undo" });
  expect(state.notes[emptyCell]).toBe(bit(3));
});

test("a correct guess clears notes the answer rules out", () => {
  const value = solution[emptyCell];
  const peer = puzzle.findIndex(
    (v, c) =>
      v === 0 && c !== emptyCell && Math.floor(c / 9) === Math.floor(emptyCell / 9)
  );
  let state = initialBoardState();
  state.notes[emptyCell] = bit(value) | bit((value % 9) + 1);
  if (peer !== -1) state.notes[peer] = bit(value);
  state = boardReducer(state, { type: "guessSent", cell: emptyCell, value });
  state = boardReducer(state, {
    type: "guessResult",
    cell: emptyCell,
    value,
    correct: true,
    board: puzzle,
  });
  expect(state.pending).toEqual({});
  expect(state.notes[emptyCell]).toBe(0);
  if (peer !== -1) expect(state.notes[peer]).toBe(0);
  expect(state.justFilled).toBe(emptyCell);
  expect(state.highlight).toBe(value);
});

test("completing a row reports its cells", () => {
  const board = [...solution];
  board[0] = 0;
  const state = boardReducer(initialBoardState(), {
    type: "guessResult",
    cell: 0,
    value: solution[0],
    correct: true,
    board,
  });
  // The row, column and box through cell 0 (21 cells), plus the six main
  // diagonal cells outside them.
  expect(state.completed).toHaveLength(27);
});

test("a wrong guess points at the clashing cells", () => {
  const value = puzzle[givenCell];
  const sameRowEmpty = puzzle.findIndex(
    (v, c) => v === 0 && Math.floor(c / 9) === Math.floor(givenCell / 9)
  );
  if (sameRowEmpty === -1) return;
  const state = boardReducer(initialBoardState(), {
    type: "guessResult",
    cell: sameRowEmpty,
    value,
    correct: false,
    board: puzzle,
  });
  expect(state.wrong?.conflicts).toContain(givenCell);
});

test("completionOf names everything a move completes, diagonals included", () => {
  const geometry = geometryFor(generatePuzzle(9, "easy").regions);
  const board = [...solution];
  // The centre cell lies on its row, column, box and both diagonals, and on
  // a full board its number is complete too.
  expect(completionOf(geometry, board, 40).kinds.sort()).toEqual(
    ["column", "diagonal", "digit", "region", "row"]
  );
  // An edge cell that's on no diagonal.
  expect(completionOf(geometry, board, 1).kinds).not.toContain("diagonal");
  // Nothing is complete while its lines have a gap.
  const gappy = [...solution];
  gappy[0] = 0;
  gappy[80] = 0;
  gappy[8] = 0;
  gappy[72] = 0;
  gappy[40] = 0;
  expect(completionOf(geometry, gappy, 40).kinds).toEqual([]);
});

test("missingDigits lists what fits a cell and what its lines and box need", () => {
  // Row 0 of this 4×4 is 1 _ _ 4; column 1 holds 2 and 3; box 0 holds 1 and 2.
  const geometry = geometryFor([0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3]);
  const board = [1, 0, 0, 4, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0];
  const result = missingDigits(geometry, board, 1);
  expect(result.row).toEqual([2, 3]);
  expect(result.column).toEqual([1, 4]);
  expect(result.region).toEqual([3, 4]);
  // Nothing is missing from all three at once: the row needs 2 and 3, and the
  // column already has both.
  expect(result.fits).toEqual([]);
  expect(missingDigits(geometry, board, 2).fits).toEqual([2, 3]);
  // A filled cell has nothing that fits, but still shows its lines.
  expect(missingDigits(geometry, board, 0).fits).toEqual([]);
});

test("setNotes replaces a cell's notes in one undoable step; focus never deselects", () => {
  let state = boardReducer(initialBoardState(), {
    type: "focus",
    cell: emptyCell,
    board: puzzle,
  });
  state = boardReducer(state, { type: "focus", cell: emptyCell, board: puzzle });
  expect(state.selected).toBe(emptyCell);
  state = boardReducer(state, { type: "setNotes", cell: emptyCell, mask: bit(2) | bit(7) });
  expect(state.notes[emptyCell]).toBe(bit(2) | bit(7));
  state = boardReducer(state, { type: "undo" });
  expect(state.notes[emptyCell]).toBe(0);
});

test("completionOf reports a number once every copy of it is placed", () => {
  const geometry = geometryFor(generatePuzzle(9, "easy").regions);
  const board = [...solution];
  const sevens = board.flatMap((v, c) => (v === 7 ? [c] : []));
  // With one 7 missing, placing it completes the number.
  const last = sevens[4];
  expect(completionOf(geometry, board, last).digit).toBe(7);
  expect(completionOf(geometry, board, last).kinds).toContain("digit");
  // With two missing, placing one of them doesn't.
  board[sevens[0]] = 0;
  expect(completionOf(geometry, board, last).digit).toBeNull();
  expect(completionOf(geometry, board, last).kinds).not.toContain("digit");
});

test("a stale clearFeedback leaves newer feedback alone", () => {
  let state = boardReducer(initialBoardState(), {
    type: "guessResult",
    cell: emptyCell,
    value: solution[emptyCell],
    correct: true,
    board: puzzle,
  });
  const first = state.feedbackId;
  state = boardReducer(state, {
    type: "guessResult",
    cell: emptyCell,
    value: 9,
    correct: false,
    board: puzzle,
  });
  // The first move's timer fires late: the wrong-guess shake must survive.
  state = boardReducer(state, { type: "clearFeedback", feedbackId: first });
  expect(state.wrong).not.toBeNull();
  state = boardReducer(state, { type: "clearFeedback", feedbackId: state.feedbackId });
  expect(state.wrong).toBeNull();
});
