import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { formatTime } from "../utility/Stats";

const PLACES = ["1st", "2nd", "3rd", "4th"];

const Results: React.FC = () => {
  const { room, self, backToLobby, leaveLobby } = useGame();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  if (!room || !self || !room.standings || !room.puzzle) return null;

  const toFill = room.puzzle.filter((v) => v === 0).length;
  const isHost = room.hostId === self.playerId;
  const youWon = room.winnerId === self.playerId;
  const winner = room.players.find((p) => p.id === room.winnerId);

  if (hidden) {
    return (
      <button className="btn primary show-results" onClick={() => setHidden(false)}>
        Show results
      </button>
    );
  }

  return (
    <div className="overlay">
      <div className="overlay-content results">
        <h1>
          {youWon
            ? "You won!"
            : winner
            ? `${winner.name} won!`
            : "Nobody finished"}
        </h1>
        {winner?.finishedMs != null && (
          <p className="muted">Solved in {formatTime(winner.finishedMs)}</p>
        )}
        <ol className="standings">
          {room.standings.map((id, index) => {
            const player = room.players.find((p) => p.id === id);
            if (!player) return null;
            return (
              <li key={id} className={id === self.playerId ? "me" : ""}>
                <span className="place">{PLACES[index]}</span>
                <span className="dot" style={{ background: player.color }} />
                <span className="player-name">{player.name}</span>
                <span className="muted">
                  {Math.round((player.filled.length / toFill) * 100)}% ·{" "}
                  {player.mistakes} mistake{player.mistakes === 1 ? "" : "s"}
                  {player.eliminated && " · out"}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="results-actions">
          {isHost ? (
            <button className="btn primary" onClick={backToLobby}>
              Back to lobby
            </button>
          ) : (
            <p className="muted">Waiting for the host to start a rematch…</p>
          )}
          <button className="btn" onClick={() => setHidden(true)}>
            View board
          </button>
          <button
            className="btn subtle"
            onClick={() => {
              leaveLobby();
              navigate("/");
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;
