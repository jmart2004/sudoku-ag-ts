// Lobby and race state. The server owns the solution and judges every guess,
// so clients never see answers they haven't earned.

import { randomBytes, randomUUID } from "crypto";
import {
  COUNTDOWN_MS,
  GameMode,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  PlayerView,
  RoomPhase,
  RoomView,
  SelfView,
  TIMED_DURATIONS_MS,
  TIMED_PENALTY_MS,
} from "../src/shared/protocol";
import {
  Difficulty,
  DIFFICULTIES,
  GeneratedPuzzle,
  STARTING_LIVES,
} from "../src/shared/engine";
import { PuzzlePool } from "./puzzlePool";

const puzzles = new PuzzlePool();

const PLAYER_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#d946ef"];
// No 0/O/1/I so codes are easy to read aloud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;

export class GameError extends Error {
  // Fatal errors mean the client should give up on its current lobby.
  constructor(message: string, readonly fatal = false) {
    super(message);
  }
}

export interface GuessOutcome {
  correct: boolean;
  completedBoard: boolean;
}

interface Player {
  id: string;
  token: string;
  name: string;
  color: string;
  connected: boolean;
  // Index into the room's deck; in timed mode, also the boards completed.
  boardIndex: number;
  puzzle: number[];
  board: number[];
  lives: number;
  mistakes: number;
  eliminated: boolean;
  finishedMs: number | null;
  lockedUntil: number | null;
}

export class Room {
  readonly code: string;
  hostId = "";
  phase: RoomPhase = "lobby";
  difficulty: Difficulty;
  mode: GameMode = "race";
  durationMs = TIMED_DURATIONS_MS[1];
  players: Player[] = [];
  // Puzzles in the order players meet them, so board N is the same for all.
  deck: GeneratedPuzzle[] = [];
  startAt: number | null = null;
  endsAt: number | null = null;
  winnerId: string | null = null;
  standings: string[] | null = null;
  private timers: NodeJS.Timeout[] = [];
  emptySince: number | null = null;

  constructor(code: string, difficulty: Difficulty) {
    this.code = code;
    this.difficulty = difficulty;
  }

  addPlayer(rawName: string): Player {
    if (this.phase !== "lobby") {
      throw new GameError("That game has already started.");
    }
    if (this.players.length >= MAX_PLAYERS) {
      throw new GameError(`That lobby is full (${MAX_PLAYERS} players max).`);
    }
    const name = cleanName(rawName);
    const usedColors = new Set(this.players.map((p) => p.color));
    const player: Player = {
      id: randomUUID(),
      token: randomBytes(16).toString("hex"),
      name: this.uniqueName(name),
      color: PLAYER_COLORS.find((c) => !usedColors.has(c))!,
      connected: true,
      boardIndex: 0,
      puzzle: [],
      board: [],
      lives: 0,
      mistakes: 0,
      eliminated: false,
      finishedMs: null,
      lockedUntil: null,
    };
    this.players.push(player);
    if (!this.hostId) {
      this.hostId = player.id;
    }
    this.emptySince = null;
    return player;
  }

  removePlayer(playerId: string) {
    this.players = this.players.filter((p) => p.id !== playerId);
    this.ensureHost();
    if (this.phase === "playing") {
      this.checkForEnd();
    }
  }

  setConnected(playerId: string, connected: boolean) {
    const player = this.getPlayer(playerId);
    if (!player) return;
    player.connected = connected;
    if (!connected && this.phase === "lobby") {
      // Nobody is waiting on a lobby slot held by a closed tab.
      this.removePlayer(playerId);
    }
    this.ensureHost();
    if (this.phase === "playing") {
      // A racer leaving may mean nobody is left to finish.
      this.checkForEnd();
    }
    if (!this.players.some((p) => p.connected)) {
      this.emptySince = Date.now();
    }
  }

  getPlayer(playerId: string) {
    return this.players.find((p) => p.id === playerId);
  }

  setDifficulty(playerId: string, difficulty: Difficulty) {
    this.requireLobbyHost(playerId);
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new GameError("Unknown difficulty.");
    }
    this.difficulty = difficulty;
  }

  setMode(playerId: string, mode: GameMode, durationMs: number) {
    this.requireLobbyHost(playerId);
    if (mode !== "race" && mode !== "timed") {
      throw new GameError("Unknown game mode.");
    }
    if (mode === "timed" && !TIMED_DURATIONS_MS.includes(durationMs)) {
      throw new GameError("Unsupported time limit.");
    }
    this.mode = mode;
    if (mode === "timed") this.durationMs = durationMs;
  }

  // Broadcasts go through `onChange` when timers move the game along.
  start(playerId: string, onChange: () => void) {
    this.requireLobbyHost(playerId);
    this.deck = [];
    this.winnerId = null;
    this.standings = null;
    for (const player of this.players) {
      this.dealBoard(player, 0);
      player.lives = this.mode === "race" ? STARTING_LIVES[this.difficulty] : 0;
      player.mistakes = 0;
      player.eliminated = false;
      player.finishedMs = null;
      player.lockedUntil = null;
    }
    this.phase = "countdown";
    this.startAt = Date.now() + COUNTDOWN_MS;
    this.endsAt = this.mode === "timed" ? this.startAt + this.durationMs : null;
    this.timers.push(
      setTimeout(() => {
        if (this.phase !== "countdown") return;
        this.phase = "playing";
        this.checkForEnd();
        onChange();
      }, COUNTDOWN_MS)
    );
    if (this.endsAt) {
      this.timers.push(
        setTimeout(() => {
          if (this.phase !== "playing") return;
          this.finish();
          onChange();
        }, this.endsAt - Date.now())
      );
    }
  }

  // Give the player board `index` of the deck, drawing new puzzles as needed.
  private dealBoard(player: Player, index: number) {
    // In timed mode draw one ahead so the next board is ready instantly.
    const needed = this.mode === "timed" ? index + 2 : index + 1;
    while (this.deck.length < needed) {
      this.deck.push(puzzles.take(this.difficulty));
    }
    player.boardIndex = index;
    player.puzzle = this.deck[index].puzzle;
    player.board = [...player.puzzle];
  }

  guess(playerId: string, cell: number, value: number): GuessOutcome {
    if (this.phase !== "playing") {
      throw new GameError("The race isn't running.");
    }
    const player = this.getPlayer(playerId);
    if (!player || player.eliminated) {
      throw new GameError("You're out of this round.");
    }
    if (
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell > 80 ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 9
    ) {
      throw new GameError("Invalid move.");
    }
    if (player.lockedUntil && Date.now() < player.lockedUntil) {
      throw new GameError("Hold on, you're locked after that mistake.");
    }
    if (player.board[cell] !== 0) {
      // Already filled; ignore duplicates from double taps.
      return { correct: player.board[cell] === value, completedBoard: false };
    }
    const correct = this.deck[player.boardIndex].solution[cell] === value;
    let completedBoard = false;
    if (correct) {
      player.board[cell] = value;
      if (!player.board.includes(0)) {
        completedBoard = true;
        if (this.mode === "race") {
          player.finishedMs = Date.now() - this.startAt!;
          this.winnerId = player.id;
        } else {
          this.dealBoard(player, player.boardIndex + 1);
        }
      }
    } else {
      player.mistakes++;
      if (this.mode === "race") {
        player.lives--;
        if (player.lives <= 0) {
          player.eliminated = true;
        }
      } else {
        player.lockedUntil = Date.now() + TIMED_PENALTY_MS;
      }
    }
    this.checkForEnd();
    return { correct, completedBoard };
  }

  backToLobby(playerId: string) {
    this.requireHost(playerId);
    if (this.phase !== "finished") {
      throw new GameError("The race is still running.");
    }
    this.resetToLobby();
  }

  // Remove players who left mid-game and return everyone to the lobby.
  private resetToLobby() {
    this.players = this.players.filter((p) => p.connected);
    this.ensureHost();
    this.phase = "lobby";
    this.deck = [];
    this.startAt = null;
    this.endsAt = null;
    this.winnerId = null;
    this.standings = null;
  }

  private checkForEnd() {
    const stillRacing = this.players.filter(
      (p) => !p.eliminated && p.connected
    );
    // Timed games otherwise run until the clock does.
    if (this.winnerId || stillRacing.length === 0) {
      this.finish();
    }
  }

  private filledCount(player: Player) {
    return player.board.filter((v, i) => v !== 0 && player.puzzle[i] === 0)
      .length;
  }

  private finish() {
    this.phase = "finished";
    this.clearTimers();
    // Race: winner first. Timed: most boards. Then progress on the current
    // board, then fewest mistakes.
    const ranked = [...this.players].sort((a, b) => {
      if (a.id === this.winnerId) return -1;
      if (b.id === this.winnerId) return 1;
      return (
        (this.mode === "timed" ? b.boardIndex - a.boardIndex : 0) ||
        this.filledCount(b) - this.filledCount(a) ||
        a.mistakes - b.mistakes
      );
    });
    this.standings = ranked.map((p) => p.id);
    if (this.mode === "timed") {
      const top = ranked[0];
      this.winnerId =
        top && (top.boardIndex > 0 || this.filledCount(top) > 0) ? top.id : null;
    }
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  dispose() {
    this.clearTimers();
  }

  view(): RoomView {
    const started = this.phase === "playing" || this.phase === "finished";
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      difficulty: this.difficulty,
      mode: this.mode,
      durationMs: this.durationMs,
      players: this.players.map(
        (p): PlayerView => ({
          id: p.id,
          name: p.name,
          color: p.color,
          connected: p.connected,
          lives: p.lives,
          mistakes: p.mistakes,
          filled: started
            ? p.board.flatMap((v, i) => (v !== 0 && p.puzzle[i] === 0 ? [i] : []))
            : [],
          givens: started ? p.puzzle.flatMap((v, i) => (v ? [i] : [])) : [],
          boardsCompleted:
            this.mode === "timed" ? p.boardIndex : p.finishedMs !== null ? 1 : 0,
          eliminated: p.eliminated,
          finishedMs: p.finishedMs,
        })
      ),
      startAt: this.startAt,
      endsAt: this.endsAt,
      winnerId: this.winnerId,
      standings: this.standings,
    };
  }

  selfView(playerId: string): SelfView {
    const player = this.getPlayer(playerId);
    const show =
      player && player.puzzle.length && (this.phase === "playing" || this.phase === "finished");
    return {
      playerId,
      puzzle: show ? player.puzzle : null,
      board: show ? player.board : null,
      lockedUntil: player?.lockedUntil ?? null,
    };
  }

  private requireHost(playerId: string) {
    if (playerId !== this.hostId) {
      throw new GameError("Only the host can do that.");
    }
  }

  private requireLobbyHost(playerId: string) {
    this.requireHost(playerId);
    if (this.phase !== "lobby") {
      throw new GameError("That can only be changed in the lobby.");
    }
  }

  private ensureHost() {
    const host = this.getPlayer(this.hostId);
    if (!host || !host.connected) {
      this.hostId =
        this.players.find((p) => p.connected)?.id ?? this.players[0]?.id ?? "";
    }
  }

  private uniqueName(name: string) {
    const taken = new Set(this.players.map((p) => p.name));
    let candidate = name;
    for (let n = 2; taken.has(candidate); n++) {
      candidate = `${name.slice(0, MAX_NAME_LENGTH - 2)} ${n}`;
    }
    return candidate;
  }
}

function cleanName(raw: unknown) {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  return name.slice(0, MAX_NAME_LENGTH) || "Player";
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();

  create(difficulty: Difficulty): Room {
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new GameError("Unknown difficulty.");
    }
    let code: string;
    do {
      code = Array.from(
        randomBytes(4),
        (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]
      ).join("");
    } while (this.rooms.has(code));
    const room = new Room(code, difficulty);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(String(code).toUpperCase().trim());
  }

  // Drop rooms nobody has been connected to for a while.
  sweep(now = Date.now()) {
    this.rooms.forEach((room, code) => {
      const empty = !room.players.some((p) => p.connected);
      if (empty && (room.emptySince ?? 0) + EMPTY_ROOM_TTL_MS < now) {
        room.dispose();
        this.rooms.delete(code);
      }
    });
  }
}
