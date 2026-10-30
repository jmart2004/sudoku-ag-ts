import React from "react";
import { Link } from "react-router-dom";
import { DIFFICULTIES } from "../shared/sudoku";
import { formatTime, getStats } from "../utility/Stats";

const StatsPage: React.FC = () => {
  const stats = getStats();
  const totalWins = DIFFICULTIES.reduce((sum, d) => sum + stats.wins[d], 0);

  return (
    <div className="page home-page">
      <h1 className="title">My Stats</h1>
      <section className="card stats">
        <div className="stat-row">
          <span>Races played</span>
          <strong>{stats.races}</strong>
        </div>
        <div className="stat-row">
          <span>Races won</span>
          <strong>{totalWins}</strong>
        </div>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Difficulty</th>
              <th>Wins</th>
              <th>Fastest win</th>
            </tr>
          </thead>
          <tbody>
            {DIFFICULTIES.map((d) => (
              <tr key={d}>
                <td className="capitalize">{d}</td>
                <td>{stats.wins[d]}</td>
                <td>
                  {stats.bestTimeMs[d] !== null
                    ? formatTime(stats.bestTimeMs[d]!)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Link to="/" className="link">
        Back home
      </Link>
    </div>
  );
};

export default StatsPage;
