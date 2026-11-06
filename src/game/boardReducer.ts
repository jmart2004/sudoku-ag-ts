// Client-side board interaction state: selection, pencil marks, highlights and
// the feedback around guesses. Pure, so it can be tested without React.
// The board values themselves come from the server.

import {
  bit,
  DEFAULT_SIZE,
  Geometry,
  standardGeometry,
} from "../shared/engine";
import { CompletionKind } from "./sounds";

const MAX_HISTORY = 200;

export interface BoardState {
  // Shape of the current board: size and regions.
  geometry: Geometry;
  selected: number | null;
  noteMode: boolean;
  // Pencil marks per cell as bitmasks (bit n = digit n).
  notes: number[];
  // Earlier versions of `notes`, newest last, for undo.
  history: number[][];
  // Digit whose cells are highlighted across the board.
  highlight: number | null;
  // Guesses sent to the server and not yet answered, by cell.
  pending: Record<number, number>;
  wrong: { cell: number; value: number; conflicts: number[] } | null;
  // Cell just filled correctly, and any row/column/box it completed.
  justFilled: number | null;
  completed: number[];
  // Bumped on every feedback event so animations replay.
  feedbackId: number;
}

export type BoardAction =
  | { type: "reset"; geometry: Geometry }
  | { type: "select"; cell: number; board: number[] }
  | { type: "move"; dRow: number; dCol: number; board: number[] }
  | { type: "deselect" }
  | { type: "toggleNoteMode" }
  | { type: "toggleNote"; digit: number }
  | { type: "clearNotes" }
  // Select a cell without the click-again-to-deselect toggle.
  | { type: "focus"; cell: number; board: number[] }
  // Replace a cell's notes in one undoable step.
  | { type: "setNotes"; cell: number; mask: number }
  | { type: "undo" }
  | { type: "highlight"; digit: number }
  | { type: "guessSent"; cell: number; value: number }
  | {
      type: "guessResult";
      cell: number;
      value: number;
      correct: boolean;
      board: number[];
    }
  | { type: "clearFeedback" };

export interface Completion {
  kinds: CompletionKind[];
  // Every cell in the completed lines and regions.
  cells: number[];
}

// What filling `cell` completed on `board` (which already includes the
// move): its row, column, region and, if it lies on one, a diagonal.
// Diagonals aren't a sudoku rule, but filling one is still worth a cheer.
export function completionOf(
  geometry: Geometry,
  board: number[],
  cell: number
): Completion {
  const { size, units, unitsOf, rowOf, colOf } = geometry;
  const full = (cells: number[]) => cells.every((c) => board[c] !== 0);
  const [rowUnit, colUnit, regionUnit] = unitsOf[cell];
  const found: [CompletionKind, number[]][] = [
    ["row", units[rowUnit]],
    ["column", units[colUnit]],
    ["region", units[regionUnit]],
  ];
  const diagonals = [
    geometry.cells.filter((c) => rowOf(c) === colOf(c)),
    geometry.cells.filter((c) => rowOf(c) + colOf(c) === size - 1),
  ];
  for (const diagonal of diagonals) {
    if (diagonal.includes(cell)) found.push(["diagonal", diagonal]);
  }
  const done = found.filter(([, cells]) => full(cells));
  return {
    // Both diagonals at once (the centre cell) still count as one sound.
    kinds: Array.from(new Set(done.map(([kind]) => kind))),
    cells: Array.from(new Set(done.flatMap(([, cells]) => cells))),
  };
}

export const initialBoardState = (
  geometry: Geometry = standardGeometry(DEFAULT_SIZE)
): BoardState => ({
  geometry,
  selected: null,
  noteMode: false,
  notes: Array(geometry.cellCount).fill(0),
  history: [],
  highlight: null,
  pending: {},
  wrong: null,
  justFilled: null,
  completed: [],
  feedbackId: 0,
});

// What pressing a digit should do right now.
export function planInput(
  state: BoardState,
  board: number[],
  canPlay: boolean
): "guess" | "note" | "highlight" {
  const cell = state.selected;
  if (!canPlay || cell === null || board[cell] !== 0 || cell in state.pending) {
    return "highlight";
  }
  return state.noteMode ? "note" : "guess";
}

const withNotes = (state: BoardState, notes: number[]): BoardState => ({
  ...state,
  notes,
  history: [...state.history, state.notes].slice(-MAX_HISTORY),
});

const selectCell = (
  state: BoardState,
  cell: number,
  board: number[]
): BoardState => ({
  ...state,
  selected: cell,
  highlight: board[cell] || null,
});

export function boardReducer(
  state: BoardState,
  action: BoardAction
): BoardState {
  switch (action.type) {
    case "reset":
      return initialBoardState(action.geometry);

    case "select":
      if (state.selected === action.cell) {
        return { ...state, selected: null, highlight: null };
      }
      return selectCell(state, action.cell, action.board);

    case "move": {
      const { size } = state.geometry;
      const from = state.selected ?? Math.floor(state.geometry.cellCount / 2);
      const row = (Math.floor(from / size) + action.dRow + size) % size;
      const col = ((from % size) + action.dCol + size) % size;
      return selectCell(state, row * size + col, action.board);
    }

    case "deselect":
      return { ...state, selected: null, highlight: null };

    case "toggleNoteMode":
      return { ...state, noteMode: !state.noteMode };

    case "toggleNote": {
      if (state.selected === null) return state;
      const notes = [...state.notes];
      notes[state.selected] ^= bit(action.digit);
      return withNotes(state, notes);
    }

    case "clearNotes": {
      if (state.selected === null || !state.notes[state.selected]) {
        return state;
      }
      const notes = [...state.notes];
      notes[state.selected] = 0;
      return withNotes(state, notes);
    }

    case "focus":
      return selectCell(state, action.cell, action.board);

    case "setNotes": {
      if (state.notes[action.cell] === action.mask) return state;
      const notes = [...state.notes];
      notes[action.cell] = action.mask;
      return withNotes(state, notes);
    }

    case "undo": {
      if (!state.history.length) return state;
      return {
        ...state,
        notes: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      };
    }

    case "highlight":
      return {
        ...state,
        highlight: state.highlight === action.digit ? null : action.digit,
      };

    case "guessSent":
      return {
        ...state,
        pending: { ...state.pending, [action.cell]: action.value },
      };

    case "guessResult": {
      const { cell, value, correct, board } = action;
      const { [cell]: _, ...pending } = state.pending;
      const feedbackId = state.feedbackId + 1;
      if (!correct) {
        return {
          ...state,
          pending,
          feedbackId,
          wrong: {
            cell,
            value,
            conflicts: state.geometry.peers[cell].filter(
              (peer) => board[peer] === value
            ),
          },
        };
      }
      // The server's new board may not have arrived yet; apply the move.
      const filled = [...board];
      filled[cell] = value;
      // Clear the cell's notes and the now-impossible notes around it. This
      // is automatic, so it isn't recorded for undo.
      const notes = [...state.notes];
      notes[cell] = 0;
      for (const peer of state.geometry.peers[cell]) notes[peer] &= ~bit(value);
      return {
        ...state,
        pending,
        notes,
        feedbackId,
        highlight: value,
        justFilled: cell,
        completed: completionOf(state.geometry, filled, cell).cells,
        wrong: null,
      };
    }

    case "clearFeedback":
      return { ...state, wrong: null, justFilled: null, completed: [] };
  }
}
