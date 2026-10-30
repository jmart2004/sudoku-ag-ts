import React from "react";
import { DIFFICULTIES, Difficulty, STARTING_LIVES } from "../shared/engine";

const DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Singles only",
  medium: "Locked candidates",
  hard: "Pairs, triples & X-wings",
};

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
  <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
    {DIFFICULTIES.map((difficulty) => (
      <button
        key={difficulty}
        role="radio"
        aria-checked={value === difficulty}
        className={`difficulty-option chip-${difficulty}${
          value === difficulty ? " selected" : ""
        }`}
        disabled={disabled && value !== difficulty}
        onClick={() => !disabled && onChange(difficulty)}
      >
        <span className="difficulty-name">{difficulty}</span>
        <span className="difficulty-desc">{DESCRIPTIONS[difficulty]}</span>
        <span className="difficulty-lives">
          {"♥".repeat(STARTING_LIVES[difficulty])}
        </span>
      </button>
    ))}
  </div>
);

export default DifficultyPicker;
