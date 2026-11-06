import React, { useState } from "react";
import { DEFAULT_SIZE, DIFFICULTIES, SIZES } from "../shared/engine";
import { TIMED_DURATIONS_MS } from "../shared/protocol";
import { formatTime, getStats, sizeKey, timedKey } from "../utility/Stats";

const StatsPage: React.FC = () => {
  const stats = getStats();
  const [size, setSize] = useState(DEFAULT_SIZE);
  const totalWins = Object.values(stats.raceWins).reduce((a, b) => a + b, 0);
  const winRate = stats.races ? Math.round((totalWins / stats.races) * 100) : 0;
  // Sizes with any record, so the tabs show where you've played.
  const played = new Set(
    [...Object.keys(stats.raceWins), ...Object.keys(stats.timedBest)].map((k) =>
      Number(k.split("-")[0])
    )
  );

  return (
    <main className="page stats-page">
      <h1>Your stats</h1>
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-number">{stats.races}</span>
          <span className="stat-label">Races</span>
        </div>
        <div className="stat-tile">
          <span className="stat-number">{totalWins}</span>
          <span className="stat-label">Race wins</span>
        </div>
        <div className="stat-tile">
          <span className="stat-number">{winRate}%</span>
          <span className="stat-label">Win rate</span>
        </div>
      </div>

      <div className="size-tabs" role="tablist" aria-label="Board size">
        {SIZES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={size === s}
            className={`size-tab${size === s ? " selected" : ""}${
              played.has(s) ? " played" : ""
            }`}
            onClick={() => setSize(s)}
          >
            {s}×{s}
          </button>
        ))}
      </div>

      <section className="panel">
        <h2>
          Races on {size}×{size}
        </h2>
        <div className="stat-rows">
          {DIFFICULTIES.map((d) => {
            const best = stats.bestTimes[sizeKey(size, d)];
            return (
              <div key={d} className="stat-row">
                <span className={`chip chip-${d}`}>{d}</span>
                <span>
                  <strong>{stats.raceWins[sizeKey(size, d)] ?? 0}</strong>{" "}
                  <span className="muted">wins</span>
                </span>
                <span>
                  <span className="muted">Fastest </span>
                  <strong>{best !== undefined ? formatTime(best) : "—"}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            Time attack on {size}×{size}
          </h2>
          <span className="muted">
            {stats.timedGames} played · {stats.timedWins} won (all sizes)
          </span>
        </div>
        <p className="muted small">Most boards completed in one game</p>
        <table className="timed-table">
          <thead>
            <tr>
              <th />
              {TIMED_DURATIONS_MS.map((ms) => (
                <th key={ms}>{ms / 60000} min</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIFFICULTIES.map((d) => (
              <tr key={d}>
                <td>
                  <span className={`chip chip-${d}`}>{d}</span>
                </td>
                {TIMED_DURATIONS_MS.map((ms) => (
                  <td key={ms}>
                    <strong>{stats.timedBest[timedKey(size, d, ms)] ?? "—"}</strong>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="muted small">Stats are saved in this browser.</p>
    </main>
  );
};

export default StatsPage;
