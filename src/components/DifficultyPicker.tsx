import React from "react";
import { DIFFICULTIES, Difficulty, STARTING_LIVES } from "../shared/sudoku";

interface DifficultyPickerProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  disabled?: boolean;
}

const DifficultyPicker: React.FC<DifficultyPickerProps> = ({
  value,
  onChange,
  disabled,
}) => (
  <div className="segmented" role="radiogroup" aria-label="Difficulty">
    {DIFFICULTIES.map((difficulty) => (
      <button
        key={difficulty}
        role="radio"
        aria-checked={value === difficulty}
        className={value === difficulty ? "selected" : ""}
        disabled={disabled}
        onClick={() => onChange(difficulty)}
        title={`${STARTING_LIVES[difficulty]} lives`}
      >
        {difficulty}
      </button>
    ))}
  </div>
);

export default DifficultyPicker;
