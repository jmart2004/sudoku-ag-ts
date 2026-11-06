// Solves a puzzle the way a person would, using only logical techniques, and
// reports the hardest technique it needed. That is how puzzles are graded.

import { bit, digitsOf, Geometry, popcount } from "./grid";

export enum Technique {
  NakedSingle = 1,
  HiddenSingle = 2,
  LockedCandidates = 3,
  NakedPair = 4,
  HiddenPair = 5,
  NakedTriple = 6,
  HiddenTriple = 7,
  XWing = 8,
}

export interface Grade {
  // Whether the techniques above were enough to solve it.
  solved: boolean;
  hardest: Technique;
  // How many times each technique was used.
  uses: Partial<Record<Technique, number>>;
}

class LogicBoard {
  values: number[];
  cands: number[];

  constructor(readonly geo: Geometry, puzzle: number[]) {
    this.values = Array(geo.cellCount).fill(0);
    this.cands = Array(geo.cellCount).fill(geo.allDigits);
    puzzle.forEach((v, cell) => v && this.place(cell, v));
  }

  place(cell: number, digit: number) {
    this.values[cell] = digit;
    this.cands[cell] = 0;
    for (const peer of this.geo.peers[cell]) this.cands[peer] &= ~bit(digit);
  }

  // Remove candidates `mask` from `cells`; true if anything changed.
  eliminate(cells: number[], mask: number): boolean {
    let changed = false;
    for (const cell of cells) {
      if (this.cands[cell] & mask) {
        this.cands[cell] &= ~mask;
        changed = true;
      }
    }
    return changed;
  }

  get solved() {
    return !this.values.includes(0);
  }

  nakedSingle(): boolean {
    for (let cell = 0; cell < this.geo.cellCount; cell++) {
      const mask = this.cands[cell];
      if (!this.values[cell] && popcount(mask) === 1) {
        this.place(cell, digitsOf(mask)[0]);
        return true;
      }
    }
    return false;
  }

  hiddenSingle(): boolean {
    for (const unit of this.geo.units) {
      for (const d of this.geo.digits) {
        const spots = unit.filter((c) => this.cands[c] & bit(d));
        if (spots.length === 1) {
          this.place(spots[0], d);
          return true;
        }
      }
    }
    return false;
  }

  // A digit whose spots in one unit all lie in a second unit (a box and a
  // line, either way round) can be cleared from the rest of the second unit.
  // Covers both pointing and claiming, and works for jigsaw regions too.
  lockedCandidates(): boolean {
    const { units, unitsOf, digits } = this.geo;
    for (let u = 0; u < units.length; u++) {
      const unit = units[u];
      for (const d of digits) {
        const spots = unit.filter((c) => this.cands[c] & bit(d));
        if (spots.length < 2) continue;
        const shared = unitsOf[spots[0]].filter(
          (other) => other !== u && spots.every((c) => unitsOf[c].includes(other))
        );
        for (const other of shared) {
          const rest = units[other].filter((c) => !unit.includes(c));
          if (this.eliminate(rest, bit(d))) return true;
        }
      }
    }
    return false;
  }

  // N cells in a unit sharing only N candidates own those digits.
  nakedSubset(size: number): boolean {
    for (const unit of this.geo.units) {
      const open = unit.filter((c) => {
        const n = popcount(this.cands[c]);
        return n >= 2 && n <= size;
      });
      for (const combo of combinations(open, size)) {
        const mask = combo.reduce((m, c) => m | this.cands[c], 0);
        if (popcount(mask) !== size) continue;
        const others = unit.filter((c) => !combo.includes(c));
        if (this.eliminate(others, mask)) return true;
      }
    }
    return false;
  }

  // N digits confined to the same N cells of a unit own those cells.
  hiddenSubset(size: number): boolean {
    for (const unit of this.geo.units) {
      const placed = unit.reduce((m, c) => m | bit(this.values[c]), 0);
      const open = this.geo.digits.filter((d) => !(placed & bit(d)));
      for (const combo of combinations(open, size)) {
        const mask = combo.reduce((m, d) => m | bit(d), 0);
        const cells = unit.filter((c) => this.cands[c] & mask);
        if (cells.length !== size) continue;
        // Every digit must actually appear, or the board is contradictory.
        if (combo.some((d) => !cells.some((c) => this.cands[c] & bit(d))))
          continue;
        if (this.eliminate(cells, this.geo.allDigits & ~mask)) return true;
      }
    }
    return false;
  }

  xWing(): boolean {
    const { size, units, rowOf, colOf, digits } = this.geo;
    const rows = units.slice(0, size);
    const cols = units.slice(size, 2 * size);
    for (const d of digits) {
      for (const [lines, crossOf, crossUnits] of [
        [rows, colOf, cols],
        [cols, rowOf, rows],
      ] as const) {
        const pairs = lines
          .map((line) => line.filter((c) => this.cands[c] & bit(d)))
          .filter((spots) => spots.length === 2);
        for (const [a, b] of combinations(pairs, 2)) {
          const x1 = crossOf(a[0]);
          const x2 = crossOf(a[1]);
          if (crossOf(b[0]) !== x1 || crossOf(b[1]) !== x2) continue;
          const corners = [...a, ...b];
          const others = [...crossUnits[x1], ...crossUnits[x2]].filter(
            (c) => !corners.includes(c)
          );
          if (this.eliminate(others, bit(d))) return true;
        }
      }
    }
    return false;
  }
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  const result: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), size - 1)) {
      result.push([item, ...rest]);
    }
  });
  return result;
}

export function gradePuzzle(geometry: Geometry, puzzle: number[]): Grade {
  const board = new LogicBoard(geometry, puzzle);
  const uses: Grade["uses"] = {};
  let hardest = Technique.NakedSingle;
  // Cheapest techniques first; restart from the top after any progress.
  const steps: [Technique, () => boolean][] = [
    [Technique.NakedSingle, () => board.nakedSingle()],
    [Technique.HiddenSingle, () => board.hiddenSingle()],
    [Technique.LockedCandidates, () => board.lockedCandidates()],
    [Technique.NakedPair, () => board.nakedSubset(2)],
    [Technique.HiddenPair, () => board.hiddenSubset(2)],
    [Technique.NakedTriple, () => board.nakedSubset(3)],
    [Technique.HiddenTriple, () => board.hiddenSubset(3)],
    [Technique.XWing, () => board.xWing()],
  ];
  while (!board.solved) {
    const step = steps.find(([, run]) => run());
    if (!step) break;
    const [technique] = step;
    uses[technique] = (uses[technique] ?? 0) + 1;
    hardest = Math.max(hardest, technique);
  }
  return { solved: board.solved, hardest, uses };
}
