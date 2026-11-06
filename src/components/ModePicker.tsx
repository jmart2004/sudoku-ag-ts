import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlagCheckered, faStopwatch } from "@fortawesome/free-solid-svg-icons";
import { GameMode, TIMED_DURATIONS_MS } from "../shared/protocol";

interface ModePickerProps {
  mode: GameMode;
  durationMs: number;
  onChange: (mode: GameMode, durationMs: number) => void;
  disabled?: boolean;
}

const MODES: { mode: GameMode; name: string; desc: string; icon: typeof faStopwatch }[] = [
  {
    mode: "race",
    name: "Race",
    desc: "First to finish the board wins",
    icon: faFlagCheckered,
  },
  {
    mode: "timed",
    name: "Time attack",
    desc: "Most boards before the clock runs out",
    icon: faStopwatch,
  },
];

const ModePicker: React.FC<ModePickerProps> = ({
  mode,
  durationMs,
  onChange,
  disabled,
}) => (
  <div className="mode-picker">
    <div className="mode-options" role="radiogroup" aria-label="Game mode">
      {MODES.map((option) => (
        <button
          key={option.mode}
          role="radio"
          aria-checked={mode === option.mode}
          className={`mode-option${mode === option.mode ? " selected" : ""}`}
          disabled={disabled && mode !== option.mode}
          onClick={() => !disabled && onChange(option.mode, durationMs)}
        >
          <FontAwesomeIcon icon={option.icon} className="mode-icon" />
          <span className="mode-name">{option.name}</span>
          <span className="mode-desc">{option.desc}</span>
        </button>
      ))}
    </div>
    {mode === "timed" && (
      <div className="duration-picker" role="radiogroup" aria-label="Time limit">
        {TIMED_DURATIONS_MS.map((ms) => (
          <button
            key={ms}
            role="radio"
            aria-checked={durationMs === ms}
            className={durationMs === ms ? "selected" : ""}
            disabled={disabled && durationMs !== ms}
            onClick={() => !disabled && onChange("timed", ms)}
          >
            {ms / 60000} min
          </button>
        ))}
      </div>
    )}
    {mode === "timed" && (
      <p className="muted small">
        Everyone gets the same boards in the same order. Finish one and the
        next appears. A wrong number locks your board for 3 seconds.
      </p>
    )}
  </div>
);

export default ModePicker;
