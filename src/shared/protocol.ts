// Messages exchanged over the websocket between the client and the server.

import { Difficulty } from "./engine";

export const MAX_PLAYERS = 4;
export const COUNTDOWN_MS = 3000;
export const MAX_NAME_LENGTH = 16;

export type RoomPhase = "lobby" | "countdown" | "playing" | "finished";

export interface PlayerView {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  lives: number;
  mistakes: number;
  // Cells this player has correctly filled (values hidden from opponents).
  filled: number[];
  eliminated: boolean;
  finishedMs: number | null;
}

export interface RoomView {
  code: string;
  hostId: string;
  phase: RoomPhase;
  difficulty: Difficulty;
  players: PlayerView[];
  // Present once the game has started.
  puzzle: number[] | null;
  startAt: number | null;
  winnerId: string | null;
  // Player ids ordered best to worst once the game is finished.
  standings: string[] | null;
}

export interface SelfView {
  playerId: string;
  // The recipient's own board: givens plus their correct entries.
  board: number[] | null;
}

export type ClientMessage =
  | { type: "create"; name: string; difficulty: Difficulty }
  | { type: "join"; code: string; name: string }
  | { type: "rejoin"; code: string; playerId: string; token: string }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "start" }
  | { type: "guess"; cell: number; value: number }
  | { type: "backToLobby" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "joined"; playerId: string; token: string; code: string }
  | { type: "state"; room: RoomView; self: SelfView; serverNow: number }
  | { type: "guessResult"; cell: number; value: number; correct: boolean }
  | { type: "error"; message: string; fatal?: boolean };
