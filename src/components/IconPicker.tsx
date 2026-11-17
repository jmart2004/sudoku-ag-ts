// Choose the icon on your avatar, or go back to your initial.

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ICON_ART } from "../game/playerIcon";
import { PLAYER_ICONS } from "../shared/protocol";

interface IconPickerProps {
  value: string;
  // The player's initial, shown as the no-icon choice.
  initial: string;
  onChange: (icon: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, initial, onChange }) => (
  <div className="icon-picker" role="radiogroup" aria-label="Your icon">
    <button
      type="button"
      role="radio"
      aria-checked={value === ""}
      aria-label="Your initial"
      className={`icon-choice${value === "" ? " selected" : ""}`}
      onClick={() => onChange("")}
    >
      {initial}
    </button>
    {PLAYER_ICONS.map((icon) => (
      <button
        key={icon}
        type="button"
        role="radio"
        aria-checked={value === icon}
        aria-label={icon}
        className={`icon-choice${value === icon ? " selected" : ""}`}
        onClick={() => onChange(icon)}
      >
        <FontAwesomeIcon icon={ICON_ART[icon]} />
      </button>
    ))}
  </div>
);

export default IconPicker;
