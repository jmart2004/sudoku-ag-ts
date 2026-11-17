// Messages exchanged over the websocket between the client and the server.

import { Difficulty } from "./engine";

export const MAX_PLAYERS = 4;
export const COUNTDOWN_MS = 3000;
export const MAX_NAME_LENGTH = 16;

// Rules the host sets for everyone in the lobby. To add one, add it here
// with its default and describe it in ROOM_OPTION_INFO in SettingsDialog.
export interface RoomOptions {
  // The what's-missing helper (right-click / long-press a cell).
  helper: boolean;
}

export const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  helper: true,
};

export type RoomPhase = "lobby" | "countdown" | "playing" | "finished";

// Race: first to finish one board wins. Timed: most boards in the time limit.
// Turf: everyone fills one shared board for points.
export type GameMode = "race" | "timed" | "turf";
export const GAME_MODES: GameMode[] = ["race", "timed", "turf"];

export const TIMED_DURATIONS_MS = [3, 5, 10].map((m) => m * 60 * 1000);
// In timed mode a wrong number locks your board briefly instead of costing
// a life, so guessing every digit doesn't pay.
export const TIMED_PENALTY_MS = 3000;

// Turf war: a claimed cell is worth a point, and placing the last number of
// a row, column or box captures it for a bonus. One number can capture up
// to three at once. A wrong number locks you out while rivals keep claiming.
export const TURF_CELL_POINTS = 1;
export const TURF_CAPTURE_POINTS = 3;
export const TURF_PENALTY_MS = 4000;

export interface PlayerView {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  lives: number;
  mistakes: number;
  // Cells this player has correctly filled on their current board (values
  // hidden from opponents), and that board's given cells.
  filled: number[];
  givens: number[];
  // Boards finished so far; in timed mode, the index of their current board.
  boardsCompleted: number;
  eliminated: boolean;
  finishedMs: number | null;
  // Turf war: points so far, and rows, columns and boxes captured.
  score: number;
  captures: number;
}

export interface RoomView {
  code: string;
  hostId: string;
  phase: RoomPhase;
  difficulty: Difficulty;
  // Board is size × size, using the digits 1..size.
  size: number;
  options: RoomOptions;
  mode: GameMode;
  durationMs: number;
  players: PlayerView[];
  startAt: number | null;
  // When a timed game ends.
  endsAt: number | null;
  winnerId: string | null;
  // Player ids ordered best to worst once the game is finished.
  standings: string[] | null;
  // Turf war: the id of the player who claimed each cell of the shared
  // board (null for givens and empty cells).
  owners: (string | null)[] | null;
}

export interface SelfView {
  playerId: string;
  // The recipient's own current puzzle, and their board: givens plus their
  // correct entries. Null until the countdown ends.
  puzzle: number[] | null;
  board: number[] | null;
  // Region id of each cell of the current puzzle (boxes, or jigsaw pieces).
  regions: number[] | null;
  // Timed and turf modes: input is locked until this server time after a
  // mistake.
  lockedUntil: number | null;
}

export type ClientMessage =
  | { type: "create"; name: string; difficulty: Difficulty }
  | { type: "join"; code: string; name: string }
  | { type: "rejoin"; code: string; playerId: string; token: string }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "setSize"; size: number }
  | { type: "setOptions"; options: Partial<RoomOptions> }
  | { type: "setMode"; mode: GameMode; durationMs: number }
  | { type: "start" }
  | { type: "guess"; cell: number; value: number }
  | { type: "backToLobby" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "joined"; playerId: string; token: string; code: string }
  | { type: "state"; room: RoomView; self: SelfView; serverNow: number }
  | {
      type: "guessResult";
      cell: number;
      value: number;
      correct: boolean;
      // Timed mode: this guess finished the board and a new one was dealt.
      completedBoard?: boolean;
      // Turf war: a rival claimed the cell first, so this guess didn't count.
      taken?: boolean;
      // Turf war: points this guess earned, and how many rows, columns and
      // boxes it captured.
      points?: number;
      captured?: number;
    }
  | { type: "error"; message: string; fatal?: boolean };
