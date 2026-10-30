// Lobby and race state. The server owns the solution and judges every guess,
// so clients never see answers they haven't earned.

import { randomBytes, randomUUID } from "crypto";
import {
  COUNTDOWN_MS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  PlayerView,
  RoomPhase,
  RoomView,
  SelfView,
} from "../src/shared/protocol";
import {
  Difficulty,
  DIFFICULTIES,
  generatePuzzle,
  STARTING_LIVES,
} from "../src/shared/sudoku";

const PLAYER_COLORS = ["#e4572e", "#2e86ab", "#17a35a", "#a23b72"];
// No 0/O/1/I so codes are easy to read aloud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;

export class GameError extends Error {
  // Fatal errors mean the client should give up on its current lobby.
  constructor(message: string, readonly fatal = false) {
    super(message);
  }
}

interface Player {
  id: string;
  token: string;
  name: string;
  color: string;
  connected: boolean;
  board: number[];
  lives: number;
  mistakes: number;
  eliminated: boolean;
  finishedMs: number | null;
}

export class Room {
  readonly code: string;
  hostId = "";
  phase: RoomPhase = "lobby";
  difficulty: Difficulty;
  players: Player[] = [];
  puzzle: number[] | null = null;
  solution: number[] | null = null;
  startAt: number | null = null;
  winnerId: string | null = null;
  standings: string[] | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
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
      board: [],
      lives: 0,
      mistakes: 0,
      eliminated: false,
      finishedMs: null,
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
    this.requireHost(playerId);
    if (this.phase !== "lobby") {
      throw new GameError("Difficulty can only be changed in the lobby.");
    }
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new GameError("Unknown difficulty.");
    }
    this.difficulty = difficulty;
  }

  start(playerId: string, onPhaseChange: () => void) {
    this.requireHost(playerId);
    if (this.phase !== "lobby") {
      throw new GameError("The game has already started.");
    }
    const { puzzle, solution } = generatePuzzle(this.difficulty);
    this.puzzle = puzzle;
    this.solution = solution;
    this.winnerId = null;
    this.standings = null;
    for (const player of this.players) {
      player.board = [...puzzle];
      player.lives = STARTING_LIVES[this.difficulty];
      player.mistakes = 0;
      player.eliminated = false;
      player.finishedMs = null;
    }
    this.phase = "countdown";
    this.startAt = Date.now() + COUNTDOWN_MS;
    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null;
      if (this.phase === "countdown") {
        this.phase = "playing";
        this.checkForEnd();
        onPhaseChange();
      }
    }, COUNTDOWN_MS);
  }

  guess(playerId: string, cell: number, value: number): boolean {
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
    if (player.board[cell] !== 0) {
      // Already filled; ignore duplicates from double taps.
      return player.board[cell] === value;
    }
    const correct = this.solution![cell] === value;
    if (correct) {
      player.board[cell] = value;
      if (!player.board.includes(0)) {
        player.finishedMs = Date.now() - this.startAt!;
        this.winnerId = player.id;
      }
    } else {
      player.mistakes++;
      player.lives--;
      if (player.lives <= 0) {
        player.eliminated = true;
      }
    }
    this.checkForEnd();
    return correct;
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
    this.puzzle = null;
    this.solution = null;
    this.startAt = null;
    this.winnerId = null;
    this.standings = null;
  }

  private checkForEnd() {
    const stillRacing = this.players.filter(
      (p) => !p.eliminated && p.connected
    );
    if (this.winnerId || stillRacing.length === 0) {
      this.finish();
    }
  }

  private finish() {
    this.phase = "finished";
    const filledCount = (p: Player) =>
      p.board.filter((v, i) => v !== 0 && this.puzzle![i] === 0).length;
    // Winner first, then by progress, then fewest mistakes.
    this.standings = [...this.players]
      .sort((a, b) => {
        if (a.id === this.winnerId) return -1;
        if (b.id === this.winnerId) return 1;
        return filledCount(b) - filledCount(a) || a.mistakes - b.mistakes;
      })
      .map((p) => p.id);
  }

  dispose() {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
  }

  view(): RoomView {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      difficulty: this.difficulty,
      players: this.players.map(
        (p): PlayerView => ({
          id: p.id,
          name: p.name,
          color: p.color,
          connected: p.connected,
          lives: p.lives,
          mistakes: p.mistakes,
          filled: this.puzzle
            ? p.board.flatMap((v, i) =>
                v !== 0 && this.puzzle![i] === 0 ? [i] : []
              )
            : [],
          eliminated: p.eliminated,
          finishedMs: p.finishedMs,
        })
      ),
      puzzle: this.phase === "countdown" ? null : this.puzzle,
      startAt: this.startAt,
      winnerId: this.winnerId,
      standings: this.standings,
    };
  }

  selfView(playerId: string): SelfView {
    const player = this.getPlayer(playerId);
    const showBoard = player && this.puzzle && this.phase !== "countdown";
    return { playerId, board: showBoard ? player.board : null };
  }

  private requireHost(playerId: string) {
    if (playerId !== this.hostId) {
      throw new GameError("Only the host can do that.");
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
