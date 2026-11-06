// Local, per-browser record of races played.

import { Difficulty } from "../shared/engine";

// Per-size records are keyed "size-difficulty" (e.g. "9-hard"), and time
// attack bests "size-difficulty-minutes" (e.g. "9-hard-5").
export interface RaceStats {
  races: number;
  raceWins: Record<string, number>;
  bestTimes: Record<string, number>;
  timedGames: number;
  timedWins: number;
  timedBest: Record<string, number>;
}

const STATS_KEY = "sudokuRaceStats";
const NAME_KEY = "sudokuName";
const LAST_RACE_KEY = "sudokuLastRecordedRace";

export const sizeKey = (size: number, difficulty: Difficulty) =>
  `${size}-${difficulty}`;

export const timedKey = (
  size: number,
  difficulty: Difficulty,
  durationMs: number
) => `${size}-${difficulty}-${Math.round(durationMs / 60000)}`;

const emptyStats = (): RaceStats => ({
  races: 0,
  raceWins: {},
  bestTimes: {},
  timedGames: 0,
  timedWins: 0,
  timedBest: {},
});

// Stats saved before board sizes existed were all 9×9.
function migrate(saved: any): RaceStats {
  const stats = { ...emptyStats(), ...saved };
  if (saved.wins || saved.bestTimeMs) {
    for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
      if (saved.wins?.[d]) stats.raceWins[sizeKey(9, d)] = saved.wins[d];
      if (saved.bestTimeMs?.[d] != null) {
        stats.bestTimes[sizeKey(9, d)] = saved.bestTimeMs[d];
      }
    }
    delete (stats as any).wins;
    delete (stats as any).bestTimeMs;
  }
  stats.timedBest = Object.fromEntries(
    Object.entries(stats.timedBest).map(([k, v]) => [
      k.split("-").length === 2 ? `9-${k}` : k,
      v as number,
    ])
  );
  return stats;
}

export const getStats = (): RaceStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyStats();
  } catch {
    return emptyStats();
  }
};

// Record a finished game once, even if the results screen re-renders or the
// page reloads.
const update = (raceId: string, apply: (stats: RaceStats) => void) => {
  try {
    if (localStorage.getItem(LAST_RACE_KEY) === raceId) return;
    localStorage.setItem(LAST_RACE_KEY, raceId);
    const stats = getStats();
    apply(stats);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Stats are a nicety; ignore storage failures.
  }
};

export const recordRace = (
  raceId: string,
  size: number,
  difficulty: Difficulty,
  winTimeMs: number | null
) =>
  update(raceId, (stats) => {
    stats.races++;
    if (winTimeMs !== null) {
      const key = sizeKey(size, difficulty);
      stats.raceWins[key] = (stats.raceWins[key] ?? 0) + 1;
      if (!(key in stats.bestTimes) || winTimeMs < stats.bestTimes[key]) {
        stats.bestTimes[key] = winTimeMs;
      }
    }
  });

export const recordTimedRun = (
  raceId: string,
  size: number,
  difficulty: Difficulty,
  durationMs: number,
  boards: number,
  won: boolean
) =>
  update(raceId, (stats) => {
    stats.timedGames++;
    if (won) stats.timedWins++;
    const key = timedKey(size, difficulty, durationMs);
    stats.timedBest[key] = Math.max(stats.timedBest[key] ?? 0, boards);
  });

export const getSavedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

export const saveName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
};

export const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};
