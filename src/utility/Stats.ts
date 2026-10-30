// Local, per-browser record of races played.

import { Difficulty } from "../shared/sudoku";

export interface RaceStats {
  races: number;
  wins: Record<Difficulty, number>;
  bestTimeMs: Record<Difficulty, number | null>;
}

const STATS_KEY = "sudokuRaceStats";
const NAME_KEY = "sudokuName";
const LAST_RACE_KEY = "sudokuLastRecordedRace";

const emptyStats = (): RaceStats => ({
  races: 0,
  wins: { easy: 0, medium: 0, hard: 0 },
  bestTimeMs: { easy: null, medium: null, hard: null },
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
