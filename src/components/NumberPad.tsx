import React, { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { DIGITS } from "../shared/engine";

interface NumberPadProps {
  board: number[];
  highlight: number | null;
  noteMode: boolean;
  onDigit: (digit: number) => void;
}

const NumberPad: React.FC<NumberPadProps> = ({
  board,
  highlight,
  noteMode,
  onDigit,
}) => (
  <div className={`number-pad${noteMode ? " notes" : ""}`}>
    {DIGITS.map((digit) => {
      const left = 9 - board.filter((v) => v === digit).length;
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
