// Client-side board interaction state: selection, pencil marks, highlights and
// the feedback around guesses. Pure, so it can be tested without React.
// The board values themselves come from the server.

import { bit, completedUnits, peersOf } from "../shared/engine";

const MAX_HISTORY = 200;

export interface BoardState {
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
  | { type: "reset" }
  | { type: "select"; cell: number; board: number[] }
  | { type: "move"; dRow: number; dCol: number; board: number[] }
  | { type: "deselect" }
  | { type: "toggleNoteMode" }
  | { type: "toggleNote"; digit: number }
  | { type: "clearNotes" }
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

export const initialBoardState = (): BoardState => ({
  selected: null,
  noteMode: false,
  notes: Array(81).fill(0),
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
      return initialBoardState();

    case "select":
      if (state.selected === action.cell) {
        return { ...state, selected: null, highlight: null };
      }
      return selectCell(state, action.cell, action.board);

    case "move": {
      const from = state.selected ?? 40;
      const row = (Math.floor(from / 9) + action.dRow + 9) % 9;
      const col = ((from % 9) + action.dCol + 9) % 9;
      return selectCell(state, row * 9 + col, action.board);
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
            conflicts: peersOf(cell).filter((peer) => board[peer] === value),
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
      for (const peer of peersOf(cell)) notes[peer] &= ~bit(value);
      return {
        ...state,
        pending,
        notes,
        feedbackId,
        highlight: value,
        justFilled: cell,
        completed: Array.from(new Set(completedUnits(filled, cell).flat())),
        wrong: null,
      };
    }

    case "clearFeedback":
      return { ...state, wrong: null, justFilled: null, completed: [] };
  }
}
