import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { formatTime } from "../utility/Stats";
import Avatar from "./ui/Avatar";
import Confetti from "./Confetti";

const PLACES = ["1st", "2nd", "3rd", "4th"];

const boardsLabel = (n: number) => `${n} board${n === 1 ? "" : "s"}`;

const Results: React.FC = () => {
  const { room, self, backToLobby, leaveLobby } = useGame();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  if (!room || !self || !room.standings) return null;

  const timed = room.mode === "timed";
  const isHost = room.hostId === self.playerId;
  const youWon = room.winnerId === self.playerId;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const yourPlace = room.standings.indexOf(self.playerId);

  if (hidden) {
    return (
      <button className="btn primary floating" onClick={() => setHidden(false)}>
        <FontAwesomeIcon icon={faTrophy} /> Results
      </button>
    );
  }

  return (
    <div className="modal-backdrop">
      {youWon && <Confetti />}
      <div className="modal results">
        <div className="results-hero">
          {winner ? (
            <>
              <div className="winner-avatar">
                <FontAwesomeIcon icon={faCrown} className="crown" />
                <Avatar name={winner.name} color={winner.color} size="lg" />
              </div>
              <h2>{youWon ? "You won!" : `${winner.name} wins`}</h2>
              <p className="muted">
                {timed
                  ? `Time's up · ${boardsLabel(winner.boardsCompleted)} in ${formatTime(
                      room.durationMs
                    )}`
                  : `Solved in ${formatTime(winner.finishedMs ?? 0)}`}
                {!youWon && yourPlace >= 0 && ` · you placed ${PLACES[yourPlace]}`}
              </p>
            </>
          ) : timed ? (
            <>
              <h2>Time's up</h2>
              <p className="muted">Nobody filled in a single cell.</p>
            </>
          ) : (
            <>
              <h2>Nobody finished</h2>
              <p className="muted">Everyone ran out of lives.</p>
            </>
          )}
        </div>

        <ol className="standings">
          {room.standings.map((id, index) => {
            const player = room.players.find((p) => p.id === id);
            if (!player) return null;
            const toFill = 81 - player.givens.length;
            const percent = toFill
              ? Math.round((player.filled.length / toFill) * 100)
              : 0;
            return (
              <li
                key={id}
                className={id === self.playerId ? "you" : ""}
                style={{ "--player": player.color } as React.CSSProperties}
              >
                <span className="place">{PLACES[index]}</span>
                <Avatar name={player.name} color={player.color} size="sm" />
                <span className="standing-name">
                  {player.name}
                  {id === self.playerId && <span className="muted"> (you)</span>}
                </span>
                <span className="standing-bar">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="standing-meta">
                  {timed && (
                    <strong className="standing-boards">
                      {boardsLabel(player.boardsCompleted)}
                    </strong>
                  )}
                  {timed ? ` + ${percent}%` : player.eliminated ? "out" : `${percent}%`}
                  {" · "}
                  {player.mistakes}✗
                </span>
              </li>
            );
          })}
        </ol>

        <div className="modal-actions">
          {isHost ? (
            <button className="btn primary" onClick={backToLobby}>
              Back to lobby
            </button>
          ) : (
            <p className="muted small">Waiting for the host to start the next race…</p>
          )}
          <button className="btn" onClick={() => setHidden(true)}>
            View board
          </button>
          <button
            className="btn ghost"
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
