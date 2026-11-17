// Every racer on one track, positioned by how much of the board they've filled.

import React, { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faFlag,
  faFlagCheckered,
  faHeart,
  faSkull,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { PlayerView } from "../shared/protocol";
import Avatar from "./ui/Avatar";

interface RaceTrackProps {
  players: PlayerView[];
  // Cells on the board (size²).
  cellCount: number;
  // Timed mode: runners show progress on their current board, plus a count.
  timed: boolean;
  // Turf war: runners show their share of every point on the board.
  turfTotal?: number;
  selfId: string;
  winnerId: string | null;
}

const RaceTrack: React.FC<RaceTrackProps> = ({
  players,
  cellCount,
  timed,
  turfTotal,
  selfId,
  winnerId,
}) => (
  <div className="track">
    {players.map((player) => {
      const toFill = cellCount - player.givens.length;
      const percent = turfTotal
        ? (player.score / turfTotal) * 100
        : toFill
        ? (player.filled.length / toFill) * 100
        : 0;
      return (
        <div
          key={player.id}
          className={`lane${player.id === selfId ? " self" : ""}${
            player.eliminated ? " out" : ""
          }`}
          style={{ "--player": player.color } as React.CSSProperties}
        >
          <span className="lane-name">
            {player.id === selfId ? "You" : player.name}
          </span>
          <div className="lane-track">
            <div className="lane-fill" style={{ width: `${percent}%` }} />
            <div className="lane-runner" style={{ left: `${percent}%` }}>
              <Avatar
                name={player.name}
                color={player.color}
                icon={player.icon}
                size="sm"
                dimmed={!player.connected || player.eliminated}
              />
            </div>
            <FontAwesomeIcon icon={faFlagCheckered} className="lane-flag" />
          </div>
          <span className="lane-status">
            {turfTotal ? (
              <span className="lane-boards" title="Points">
                <FontAwesomeIcon
                  icon={player.id === winnerId ? faTrophy : faFlag}
                  className={player.id === winnerId ? "trophy" : undefined}
                />
                {player.score}
              </span>
            ) : timed ? (
              <span className="lane-boards" title="Boards completed">
                <FontAwesomeIcon icon={faCheck} />
                {player.boardsCompleted}
              </span>
            ) : player.id === winnerId ? (
              <FontAwesomeIcon icon={faTrophy} className="trophy" />
            ) : player.eliminated ? (
              <FontAwesomeIcon icon={faSkull} title="Out of lives" />
            ) : (
              <>
                <FontAwesomeIcon icon={faHeart} className="heart" />
                {player.lives}
              </>
            )}
          </span>
        </div>
      );
    })}
  </div>
);

export default memo(RaceTrack);
