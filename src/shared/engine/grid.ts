// Geometry of an N×N board. Boards are flat arrays of N² numbers (row-major),
// 0 meaning empty. Candidate sets are bitmasks where bit n means digit n.
//
// Every row, column and region must hold the digits 1..N once. Regions are
// rectangular boxes where N allows (9×9 uses 3×3 boxes), and irregular
// "jigsaw" pieces for prime sizes like 5 and 7.

export const SIZES = [4, 5, 6, 7, 8, 9];
export const DEFAULT_SIZE = 9;

// Box shape [rows, columns] for each size that splits into rectangles.
const BOX_SHAPES: Record<number, [number, number]> = {
  4: [2, 2],
  6: [2, 3],
  8: [2, 4],
  9: [3, 3],
};

export const isJigsawSize = (size: number) => !(size in BOX_SHAPES);

export interface Geometry {
  size: number;
  cellCount: number;
  cells: number[];
  digits: number[];
  allDigits: number;
  // Region id of each cell.
  regions: number[];
  // The 3N units: rows 0..N-1, columns N..2N-1, regions 2N..3N-1.
  units: number[][];
  // Units each cell belongs to, as [row, column, region] unit indexes.
  unitsOf: number[][];
  // Cells sharing a row, column or region with each cell.
  peers: number[][];
  rowOf: (cell: number) => number;
  colOf: (cell: number) => number;
}

export const bit = (digit: number) => 1 << digit;

export function popcount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

export function digitsOf(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; 1 << d <= mask; d++) {
    if (mask & bit(d)) digits.push(d);
  }
  return digits;
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function boxRegions(size: number): number[] {
  const [boxRows, boxCols] = BOX_SHAPES[size];
  const boxesPerRow = size / boxCols;
  return range(size * size).map((cell) => {
    const row = Math.floor(cell / size);
    const col = cell % size;
    return Math.floor(row / boxRows) * boxesPerRow + Math.floor(col / boxCols);
  });
}

const cache = new Map<string, Geometry>();

// Geometry for a region layout (size is inferred from its length).
export function geometryFor(regions: number[]): Geometry {
  const key = regions.join(",");
  const cached = cache.get(key);
  if (cached) return cached;

  const cellCount = regions.length;
  const size = Math.round(Math.sqrt(cellCount));
  const cells = range(cellCount);
  const rowOf = (cell: number) => Math.floor(cell / size);
  const colOf = (cell: number) => cell % size;
  const units = [
    ...range(size).map((r) => cells.filter((c) => rowOf(c) === r)),
    ...range(size).map((col) => cells.filter((c) => colOf(c) === col)),
    ...range(size).map((g) => cells.filter((c) => regions[c] === g)),
  ];
  const unitsOf = cells.map((c) => [rowOf(c), size + colOf(c), 2 * size + regions[c]]);
  const peers = cells.map((cell) =>
    cells.filter(
      (other) =>
        other !== cell &&
        (rowOf(other) === rowOf(cell) ||
          colOf(other) === colOf(cell) ||
          regions[other] === regions[cell])
    )
  );
  const digits = range(size).map((i) => i + 1);
  const geometry: Geometry = {
    size,
    cellCount,
    cells,
    digits,
    allDigits: digits.reduce((m, d) => m | bit(d), 0),
    regions,
    units,
    unitsOf,
    peers,
    rowOf,
    colOf,
  };
  cache.set(key, geometry);
  return geometry;
}

// Box layout for sizes that have one. Jigsaw sizes get one region per row as
// a stand-in; real jigsaw puzzles always carry their own layout.
export const standardGeometry = (size: number) =>
  geometryFor(
    isJigsawSize(size)
      ? range(size * size).map((cell) => Math.floor(cell / size))
      : boxRegions(size)
  );

// Random jigsaw layout: N connected regions of N cells each. Starts from
// one region per row, then repeatedly trades a border cell of one region for
// a border cell of a neighboring region, keeping a trade only if both regions
// stay in one piece. Layouts where a region is still a whole row or column
// are rejected.
export function randomJigsawRegions(size: number): number[] {
  const cellCount = size * size;
  const neighbors = range(cellCount).map((cell) => {
    const row = Math.floor(cell / size);
    const col = cell % size;
    return [
      row > 0 ? cell - size : -1,
      row < size - 1 ? cell + size : -1,
      col > 0 ? cell - 1 : -1,
      col < size - 1 ? cell + 1 : -1,
    ].filter((c) => c >= 0);
  });
  const connected = (regions: number[], g: number) => {
    const members = range(cellCount).filter((c) => regions[c] === g);
    const seen = new Set([members[0]]);
    const queue = [members[0]];
    while (queue.length) {
      for (const n of neighbors[queue.pop()!]) {
        if (regions[n] === g && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return seen.size === members.length;
  };
  const degenerate = (regions: number[]) =>
    range(size).some((g) => {
      const members = range(cellCount).filter((c) => regions[c] === g);
      return (
        new Set(members.map((c) => Math.floor(c / size))).size === 1 ||
        new Set(members.map((c) => c % size)).size === 1
      );
    });

  for (;;) {
    const regions = range(cellCount).map((c) => Math.floor(c / size));
    let trades = 0;
    for (let tries = 0; trades < cellCount * 2 && tries < cellCount * 200; tries++) {
      // a (region A) touches region B; b (region B) touches region A.
      const a = Math.floor(Math.random() * cellCount);
      const ga = regions[a];
      const towardB = neighbors[a].filter((n) => regions[n] !== ga);
      if (!towardB.length) continue;
      const gb = regions[towardB[Math.floor(Math.random() * towardB.length)]];
      const candidates = range(cellCount).filter(
        (c) => regions[c] === gb && neighbors[c].some((n) => regions[n] === ga)
      );
      const b = candidates[Math.floor(Math.random() * candidates.length)];
      regions[a] = gb;
      regions[b] = ga;
      if (connected(regions, ga) && connected(regions, gb)) {
        trades++;
      } else {
        regions[a] = ga;
        regions[b] = gb;
      }
    }
    if (!degenerate(regions)) return regions;
  }
}

// Units each move completes on this board (every cell in them filled).
export function completedUnits(
  geometry: Geometry,
  board: number[],
  cell: number
): number[][] {
  return geometry.unitsOf[cell]
    .map((u) => geometry.units[u])
    .filter((unit) => unit.every((c) => board[c] !== 0));
}
