import React, { memo } from "react";
import { bit, colOf, peersOf, rowOf, UNITS } from "../shared/engine";
import { BoardState } from "../game/boardReducer";

interface BoardProps {
  board: number[];
  givens: number[];
  state: BoardState;
  // Show empty note grids so players can see where marks will go.
  notesVisible: boolean;
  onSelect: (cell: number) => void;
}

const BOXES = UNITS.slice(18);

const Board: React.FC<BoardProps> = ({
  board,
  givens,
  state,
  notesVisible,
  onSelect,
}) => {
  const { selected, highlight, wrong, pending, notes, justFilled, completed } =
    state;
  const peers = new Set(selected === null ? [] : peersOf(selected));
  const conflicts = new Set(wrong?.conflicts ?? []);
  const wave = new Set(completed);
  const origin = justFilled ?? 0;

  const renderCell = (cell: number) => {
    const isWrong = wrong?.cell === cell;
    const pendingValue = pending[cell];
    const value = board[cell] || pendingValue || (isWrong ? wrong.value : 0);
    const classNames = [
      "cell",
      givens[cell] ? "given" : board[cell] ? "entered" : "",
      pendingValue && !board[cell] ? "pending" : "",
      peers.has(cell) ? "peer" : "",
      highlight && board[cell] === highlight ? "same" : "",
      cell === selected ? "selected" : "",
      isWrong ? "wrong" : "",
      conflicts.has(cell) ? "conflict" : "",
      cell === justFilled ? "pop" : "",
      wave.has(cell) ? "wave" : "",
    ]
      .filter(Boolean)
      .join(" ");
    // Ripple outward from the move that completed the unit.
    const distance =
      Math.abs(rowOf(cell) - rowOf(origin)) + Math.abs(colOf(cell) - colOf(origin));

    return (
      <button
        key={cell}
        className={classNames}
        style={
          wave.has(cell)
            ? ({ "--wave-delay": `${distance * 35}ms` } as React.CSSProperties)
            : undefined
        }
        aria-label={`Row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}: ${
          board[cell] || "empty"
        }`}
        onClick={() => onSelect(cell)}
      >
        {value ? (
          <span className="cell-value">{value}</span>
        ) : notes[cell] || (notesVisible && cell === selected) ? (
          <span className="cell-notes">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <span
                key={d}
                className={
                  notes[cell] & bit(d) && d === highlight ? "note-hit" : ""
                }
              >
                {notes[cell] & bit(d) ? d : ""}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="board" role="group" aria-label="Sudoku board">
      {BOXES.map((cells, b) => (
        <div key={b} className="box">
          {cells.map(renderCell)}
        </div>
      ))}
    </div>
  );
};

export default memo(Board);
