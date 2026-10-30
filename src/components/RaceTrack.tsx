// Every racer on one track, positioned by how much of the board they've filled.

import React, { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlagCheckered,
  faHeart,
  faSkull,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { PlayerView } from "../shared/protocol";
import Avatar from "./ui/Avatar";

interface RaceTrackProps {
  players: PlayerView[];
  toFill: number;
  selfId: string;
  winnerId: string | null;
}

const RaceTrack: React.FC<RaceTrackProps> = ({
  players,
  toFill,
  selfId,
  winnerId,
}) => (
  <div className="track">
    {players.map((player) => {
      const percent = toFill ? (player.filled.length / toFill) * 100 : 0;
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
                size="sm"
                dimmed={!player.connected || player.eliminated}
              />
            </div>
            <FontAwesomeIcon icon={faFlagCheckered} className="lane-flag" />
          </div>
          <span className="lane-status">
            {player.id === winnerId ? (
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
