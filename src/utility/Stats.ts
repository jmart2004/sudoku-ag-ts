// Local, per-browser record of races played.

import { Difficulty } from "../shared/engine";

export interface RaceStats {
  races: number;
  wins: Record<Difficulty, number>;
  bestTimeMs: Record<Difficulty, number | null>;
  // Time attack: games played, wins, and most boards per "difficulty-minutes".
  timedGames: number;
  timedWins: number;
  timedBest: Record<string, number>;
}

const STATS_KEY = "sudokuRaceStats";
const NAME_KEY = "sudokuName";
const LAST_RACE_KEY = "sudokuLastRecordedRace";

const emptyStats = (): RaceStats => ({
  races: 0,
  wins: { easy: 0, medium: 0, hard: 0 },
  bestTimeMs: { easy: null, medium: null, hard: null },
  timedGames: 0,
  timedWins: 0,
  timedBest: {},
});

export const getStats = (): RaceStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...emptyStats(), ...JSON.parse(raw) } : emptyStats();
  } catch {
    return emptyStats();
  }
};

// Record a finished race once, even if the results screen re-renders or reloads.
export const recordRace = (
  raceId: string,
  difficulty: Difficulty,
  winTimeMs: number | null
) => {
  try {
    if (localStorage.getItem(LAST_RACE_KEY) === raceId) return;
    localStorage.setItem(LAST_RACE_KEY, raceId);
    const stats = getStats();
    stats.races++;
    if (winTimeMs !== null) {
      stats.wins[difficulty]++;
      const best = stats.bestTimeMs[difficulty];
      if (best === null || winTimeMs < best) {
        stats.bestTimeMs[difficulty] = winTimeMs;
      }
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Stats are a nicety; ignore storage failures.
  }
};

export const timedKey = (difficulty: Difficulty, durationMs: number) =>
  `${difficulty}-${Math.round(durationMs / 60000)}`;

export const recordTimedRun = (
  raceId: string,
  difficulty: Difficulty,
  durationMs: number,
  boards: number,
  won: boolean
) => {
  try {
    if (localStorage.getItem(LAST_RACE_KEY) === raceId) return;
    localStorage.setItem(LAST_RACE_KEY, raceId);
    const stats = getStats();
    stats.timedGames++;
    if (won) stats.timedWins++;
    const key = timedKey(difficulty, durationMs);
    stats.timedBest[key] = Math.max(stats.timedBest[key] ?? 0, boards);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Stats are a nicety; ignore storage failures.
  }
};

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
