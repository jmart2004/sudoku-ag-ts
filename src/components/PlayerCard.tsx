// An opponent's progress: which cells they've filled (never the values).

import React, { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { PlayerView } from "../shared/protocol";

interface PlayerCardProps {
  player: PlayerView;
  puzzle: number[];
  isSelf: boolean;
  isWinner: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  puzzle,
  isSelf,
  isWinner,
}) => {
  const filled = new Set(player.filled);
  const toFill = puzzle.filter((v) => v === 0).length;
  const percent = toFill ? Math.round((player.filled.length / toFill) * 100) : 0;

  return (
    <div
      className={`player-card${player.eliminated ? " eliminated" : ""}`}
      style={{ "--player-color": player.color } as React.CSSProperties}
    >
      <div className="player-card-header">
        <span className="dot" style={{ background: player.color }} />
        <span className="player-name">
          {player.name}
          {isSelf && " (you)"}
        </span>
        {isWinner && <FontAwesomeIcon icon={faTrophy} className="trophy" />}
      </div>
      <div className="mini-board" aria-hidden>
        {puzzle.map((given, cell) => (
          <span
            key={cell}
            className={given ? "given" : filled.has(cell) ? "filled" : ""}
          />
        ))}
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <div className="player-card-footer">
        <span>{percent}%</span>
        <span className="lives">
          {player.eliminated ? (
            "Out"
          ) : (
            <>
              <FontAwesomeIcon icon={faHeart} className="heart-icon" />
              {player.lives}
            </>
          )}
        </span>
        {!player.connected && <span className="muted">offline</span>}
      </div>
    </div>
  );
};

export default memo(PlayerCard);
