// A rival's board: which cells they've filled, never the numbers.

import React, { memo } from "react";
import { PlayerView } from "../shared/protocol";
import { UNITS } from "../shared/engine";
import Avatar from "./ui/Avatar";

interface OpponentBoardProps {
  player: PlayerView;
  timed: boolean;
}

const BOXES = UNITS.slice(18);

const OpponentBoard: React.FC<OpponentBoardProps> = ({ player, timed }) => {
  const filled = new Set(player.filled);
  const givens = new Set(player.givens);
  const toFill = 81 - givens.size;
  const percent = toFill ? Math.round((player.filled.length / toFill) * 100) : 0;

  return (
    <div
      className={`opponent${player.eliminated ? " out" : ""}`}
      style={{ "--player": player.color } as React.CSSProperties}
    >
      <div className="opponent-head">
        <Avatar name={player.name} color={player.color} size="sm" />
        <span className="opponent-name">{player.name}</span>
        <span className="opponent-percent">
          {player.eliminated ? "Out" : `${percent}%`}
        </span>
        {timed && (
          <span className="opponent-boards" title="Boards completed">
            {player.boardsCompleted}✓
          </span>
        )}
      </div>
      <div className="mini-board" aria-hidden>
        {BOXES.map((cells, b) => (
          <div key={b} className="mini-box">
            {cells.map((cell) => (
              <span
                key={cell}
                className={
                  givens.has(cell) ? "given" : filled.has(cell) ? "filled" : ""
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(OpponentBoard);
