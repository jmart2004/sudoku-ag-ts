import { bit, generatePuzzle } from "../shared/engine";
import { boardReducer, initialBoardState, planInput } from "./boardReducer";

const { puzzle, solution } = generatePuzzle("easy");
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
  // The row, column and box through cell 0 are all complete.
  expect(state.completed).toHaveLength(21);
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
