// Keeps a few puzzles of each difficulty ready so starting a race is instant.
// Hard puzzles can take a few hundred milliseconds to find, so the pool is
// refilled one attempt per event-loop turn instead of blocking the server.

import {
  Difficulty,
  DIFFICULTIES,
  generatePuzzle,
  GeneratedPuzzle,
  tryGeneratePuzzle,
} from "../src/shared/engine";

const POOL_SIZE = 3;

export class PuzzlePool {
  private pools = new Map<Difficulty, GeneratedPuzzle[]>(
    DIFFICULTIES.map((d) => [d, []])
  );
  private refilling = false;

  constructor() {
    this.refill();
  }

  take(difficulty: Difficulty): GeneratedPuzzle {
    const puzzle = this.pools.get(difficulty)!.shift();
    this.refill();
    return puzzle ?? generatePuzzle(difficulty);
  }

  private refill() {
    if (this.refilling) return;
    const needed = DIFFICULTIES.find(
      (d) => this.pools.get(d)!.length < POOL_SIZE
    );
    if (!needed) return;
    this.refilling = true;
    setImmediate(() => {
      const puzzle = tryGeneratePuzzle(needed);
      if (puzzle) this.pools.get(needed)!.push(puzzle);
      this.refilling = false;
      this.refill();
    });
  }
}
