import React, { memo } from "react";
import { colOf, peersOf, rowOf } from "../shared/sudoku";

export interface WrongGuess {
  cell: number;
  value: number;
  conflicts: number[];
}

interface BoardProps {
  board: number[];
  givens: number[];
  // Pencil marks per cell, as a bitmask where bit n means note n.
  notes: number[];
  selected: number | null;
  highlightValue: number | null;
  wrong: WrongGuess | null;
  showNotes: boolean;
  onSelect: (cell: number) => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  givens,
  notes,
  selected,
  highlightValue,
  wrong,
  showNotes,
  onSelect,
}) => {
  const peers = new Set(selected === null ? [] : peersOf(selected));
  const conflicts = new Set(wrong?.conflicts ?? []);

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {board.map((value, cell) => {
        const row = rowOf(cell);
        const col = colOf(cell);
        const isWrong = wrong?.cell === cell;
        const shown = isWrong ? wrong.value : value;
        const classNames = [
          "board-cell",
          col % 3 === 2 && col !== 8 && "edge-right",
          row % 3 === 2 && row !== 8 && "edge-bottom",
          givens[cell] !== 0 ? "given" : value !== 0 && "entered",
          peers.has(cell) && "peer",
          highlightValue !== null && value === highlightValue && "same-value",
          cell === selected && "selected",
          (isWrong || conflicts.has(cell)) && "wrong",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={cell}
            role="gridcell"
            className={classNames}
            aria-label={`Row ${row + 1} column ${col + 1}${
              value ? `, ${value}` : ", empty"
            }`}
            onClick={() => onSelect(cell)}
          >
            {shown !== 0 ? (
              <span className="cell-value">{shown}</span>
            ) : (
              (showNotes || notes[cell] !== 0) && (
                <span className="cell-notes">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i}>{notes[cell] & (1 << (i + 1)) ? i + 1 : ""}</span>
                  ))}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
};

export default memo(Board);
