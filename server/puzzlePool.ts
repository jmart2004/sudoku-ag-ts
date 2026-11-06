// Keeps a few puzzles of each size and difficulty ready so starting a game is
// instant. Finding a well-graded puzzle can take dozens of attempts, so the
// pool runs one attempt per event-loop turn instead of blocking the server.
// 9×9 is kept warm from the start; other sizes once a lobby picks them.

import {
  attemptPuzzle,
  Attempt,
  DEFAULT_SIZE,
  Difficulty,
  DIFFICULTIES,
  generatePuzzle,
  GeneratedPuzzle,
  MAX_ATTEMPTS,
} from "../src/shared/engine";

const POOL_SIZE = 3;

interface Search {
  ready: GeneratedPuzzle[];
  // Closest puzzle so far in the current search, used if none fits.
  best: Attempt | null;
  attempts: number;
}

const key = (size: number, difficulty: Difficulty) => `${size}-${difficulty}`;

export class PuzzlePool {
  private searches = new Map<string, Search>();
  private refilling = false;

  constructor() {
    this.warm(DEFAULT_SIZE);
  }

  // Start keeping puzzles of this size ready.
  warm(size: number) {
    for (const difficulty of DIFFICULTIES) {
      if (!this.searches.has(key(size, difficulty))) {
        this.searches.set(key(size, difficulty), {
          ready: [],
          best: null,
          attempts: 0,
        });
      }
    }
    this.refill();
  }

  take(size: number, difficulty: Difficulty): GeneratedPuzzle {
    this.warm(size);
    const puzzle = this.searches.get(key(size, difficulty))!.ready.shift();
    this.refill();
    return puzzle ?? generatePuzzle(size, difficulty);
  }

  private refill() {
    if (this.refilling) return;
    const needed = Array.from(this.searches.entries()).find(
      ([, search]) => search.ready.length < POOL_SIZE
    );
    if (!needed) return;
    this.refilling = true;
    setImmediate(() => {
      const [k, search] = needed;
      const [size, difficulty] = k.split("-");
      const attempt = attemptPuzzle(Number(size), difficulty as Difficulty);
      if (attempt) {
        search.attempts++;
        if (!search.best || attempt.distance < search.best.distance) {
          search.best = attempt;
        }
        if (attempt.distance === 0 || search.attempts >= MAX_ATTEMPTS) {
          search.ready.push(search.best.result);
          search.best = null;
          search.attempts = 0;
        }
      }
      this.refilling = false;
      this.refill();
    });
  }
}
