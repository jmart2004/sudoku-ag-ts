import React, { memo } from "react";
import { bit } from "../shared/engine";
import { BoardState } from "../game/boardReducer";

interface BoardProps {
  board: number[];
  givens: number[];
  state: BoardState;
  // Show empty note grids so players can see where marks will go.
  notesVisible: boolean;
  onSelect: (cell: number) => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  givens,
  state,
  notesVisible,
  onSelect,
}) => {
  const {
    geometry,
    selected,
    highlight,
    wrong,
    pending,
    notes,
    justFilled,
    completed,
  } = state;
  const { size, regions, rowOf, colOf, digits } = geometry;
  const peers = new Set(selected === null ? [] : geometry.peers[selected]);
  const conflicts = new Set(wrong?.conflicts ?? []);
  const wave = new Set(completed);
  const origin = justFilled ?? 0;
  const noteColumns = size <= 4 ? 2 : 3;

  const renderCell = (cell: number) => {
    const row = rowOf(cell);
    const col = colOf(cell);
    const isWrong = wrong?.cell === cell;
    const pendingValue = pending[cell];
    const value = board[cell] || pendingValue || (isWrong ? wrong.value : 0);
    const classNames = [
      "cell",
      // Thick lines where the next cell over is in a different region.
      col < size - 1 && regions[cell + 1] !== regions[cell] ? "edge-right" : "",
      row < size - 1 && regions[cell + size] !== regions[cell]
        ? "edge-bottom"
        : "",
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
      Math.abs(row - rowOf(origin)) + Math.abs(col - colOf(origin));

    return (
      <button
        key={cell}
        className={classNames}
        style={
          wave.has(cell)
            ? ({ "--wave-delay": `${distance * 35}ms` } as React.CSSProperties)
            : undefined
        }
        aria-label={`Row ${row + 1}, column ${col + 1}: ${
          board[cell] || "empty"
        }`}
        onClick={() => onSelect(cell)}
      >
        {value ? (
          <span className="cell-value">{value}</span>
        ) : notes[cell] || (notesVisible && cell === selected) ? (
          <span
            className="cell-notes"
            style={{ "--note-cols": noteColumns } as React.CSSProperties}
          >
            {digits.map((d) => (
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
    <div
      className="board"
      role="group"
      aria-label={`${size} by ${size} sudoku board`}
      style={{ "--n": size } as React.CSSProperties}
    >
      {geometry.cells.map(renderCell)}
    </div>
  );
};

export default memo(Board);
