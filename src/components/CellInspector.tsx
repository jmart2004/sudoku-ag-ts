// Pops up beside a cell (right-click or long-press) to show at a glance which
// digits can still go there, and what its row, column and box are missing.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faXmark } from "@fortawesome/free-solid-svg-icons";
import { bit, Geometry } from "../shared/engine";

export interface InspectTarget {
  cell: number;
  // The cell's on-screen box, to place the panel beside it.
  rect: { top: number; left: number; bottom: number; right: number };
}

interface CellInspectorProps {
  geometry: Geometry;
  board: number[];
  target: InspectTarget;
  canPlay: boolean;
  onPick: (digit: number) => void;
  onPencil: (mask: number) => void;
  onClose: () => void;
}

const GAP = 8;
const MARGIN = 8;

export function missingDigits(geometry: Geometry, board: number[], cell: number) {
  const { units, unitsOf, digits } = geometry;
  const missingFrom = (unit: number) => {
    const used = new Set(units[unit].map((c) => board[c]));
    return digits.filter((d) => !used.has(d));
  };
  const [row, column, region] = unitsOf[cell].map(missingFrom);
  // Candidates: missing from all three at once.
  const fits = board[cell]
    ? []
    : digits.filter(
        (d) => row.includes(d) && column.includes(d) && region.includes(d)
      );
  return { fits, row, column, region };
}

const Digits: React.FC<{ digits: number[]; all: number[] }> = ({ digits, all }) =>
  digits.length === 0 ? (
    <span className="inspect-complete">Complete ✓</span>
  ) : (
    <span className="inspect-digits">
      {all.map((d) => (
        <span key={d} className={digits.includes(d) ? "missing" : "present"}>
          {d}
        </span>
      ))}
    </span>
  );

const CellInspector: React.FC<CellInspectorProps> = ({
  geometry,
  board,
  target,
  canPlay,
  onPick,
  onPencil,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { cell, rect } = target;
  const { fits, row, column, region } = missingDigits(geometry, board, cell);
  const filled = board[cell] !== 0;

  // Below the cell if it fits, otherwise above; always inside the viewport.
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = rect.bottom + GAP + height <= vh - MARGIN;
    const top = below ? rect.bottom + GAP : Math.max(MARGIN, rect.top - GAP - height);
    const centre = (rect.left + rect.right) / 2;
    const left = Math.min(Math.max(MARGIN, centre - width / 2), vw - width - MARGIN);
    setPos({ top, left });
  }, [rect]);

  // Close on Escape, scrolling, resizing or a press anywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const regionName = geometry.size === 5 || geometry.size === 7 ? "Region" : "Box";

  return (
    <div
      ref={ref}
      className="inspector"
      role="dialog"
      aria-label={`What's missing around row ${geometry.rowOf(cell) + 1}, column ${
        geometry.colOf(cell) + 1
      }`}
      style={pos ?? { top: rect.bottom + GAP, left: rect.left, visibility: "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="inspector-head">
        <span className="eyebrow">
          {filled ? "This cell is done" : "Fits here"}
        </span>
        <button className="inspector-close" aria-label="Close" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {!filled &&
        (fits.length ? (
          <div className="inspector-fits">
            {fits.map((d) => (
              <button
                key={d}
                className="fit-digit"
                disabled={!canPlay}
                onClick={() => onPick(d)}
                title={canPlay ? `Enter ${d}` : undefined}
              >
                {d}
              </button>
            ))}
          </div>
        ) : (
          <p className="inspector-none">Nothing fits: check your numbers nearby.</p>
        ))}

      <span className="eyebrow">Still needed</span>
      <dl className="inspector-lines">
        <dt>Row</dt>
        <dd>
          <Digits digits={row} all={geometry.digits} />
        </dd>
        <dt>Column</dt>
        <dd>
          <Digits digits={column} all={geometry.digits} />
        </dd>
        <dt>{regionName}</dt>
        <dd>
          <Digits digits={region} all={geometry.digits} />
        </dd>
      </dl>

      {!filled && fits.length > 0 && (
        <button
          className="btn small block"
          disabled={!canPlay}
          onClick={() => onPencil(fits.reduce((m, d) => m | bit(d), 0))}
        >
          <FontAwesomeIcon icon={faPencil} /> Add as notes
        </button>
      )}
    </div>
  );
};

export default CellInspector;
