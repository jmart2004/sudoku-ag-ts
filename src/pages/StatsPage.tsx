import React from "react";
import { DIFFICULTIES } from "../shared/engine";
import { TIMED_DURATIONS_MS } from "../shared/protocol";
import { formatTime, getStats, timedKey } from "../utility/Stats";

const StatsPage: React.FC = () => {
  const stats = getStats();
  const totalWins = DIFFICULTIES.reduce((sum, d) => sum + stats.wins[d], 0);
  const winRate = stats.races ? Math.round((totalWins / stats.races) * 100) : 0;

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
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-tile">
          <span className="stat-number">{winRate}%</span>
          <span className="stat-label">Win rate</span>
        </div>
      </div>
      <section className="panel">
        <h2>By difficulty</h2>
        <div className="stat-rows">
          {DIFFICULTIES.map((d) => (
            <div key={d} className="stat-row">
              <span className={`chip chip-${d}`}>{d}</span>
              <span>
                <strong>{stats.wins[d]}</strong>{" "}
                <span className="muted">wins</span>
              </span>
              <span>
                <span className="muted">Fastest </span>
                <strong>
                  {stats.bestTimeMs[d] !== null
                    ? formatTime(stats.bestTimeMs[d]!)
                    : "—"}
                </strong>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Time attack</h2>
          <span className="muted">
            {stats.timedGames} played · {stats.timedWins} won
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
                    <strong>{stats.timedBest[timedKey(d, ms)] ?? "—"}</strong>
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
