import React, { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

interface NumberPadProps {
  // Digits 1..size; each appears size times on a solved board.
  size: number;
  board: number[];
  highlight: number | null;
  noteMode: boolean;
  onDigit: (digit: number) => void;
}

const NumberPad: React.FC<NumberPadProps> = ({
  size,
  board,
  highlight,
  noteMode,
  onDigit,
}) => (
  <div
    className={`number-pad${noteMode ? " notes" : ""}`}
    style={{ "--n": size } as React.CSSProperties}
  >
    {Array.from({ length: size }, (_, i) => i + 1).map((digit) => {
      const left = size - board.filter((v) => v === digit).length;
      return (
        <button
          key={digit}
          className={`pad-key${highlight === digit ? " active" : ""}${
            left === 0 ? " done" : ""
          }`}
          onClick={() => onDigit(digit)}
          aria-label={`${digit}, ${left} left`}
        >
          <span className="pad-digit">{digit}</span>
          <span className="pad-left">
            {left === 0 ? <FontAwesomeIcon icon={faCheck} /> : left}
          </span>
        </button>
      );
    })}
  </div>
);

export default memo(NumberPad);
