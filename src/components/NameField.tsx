// The name box on the home and invite pages. Tapping the avatar next to it
// opens the icon picker.

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { useSavedIcon } from "../game/playerIcon";
import { MAX_NAME_LENGTH } from "../shared/protocol";
import Avatar from "./ui/Avatar";
import IconPicker from "./IconPicker";

interface NameFieldProps {
  name: string;
  onChange: (name: string) => void;
  autoFocus?: boolean;
}

const NameField: React.FC<NameFieldProps> = ({ name, onChange, autoFocus }) => {
  const { setIcon } = useGame();
  const icon = useSavedIcon();
  const [picking, setPicking] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="field">
      <label className="field-label" htmlFor="player-name">
        Your name
      </label>
      <span className="name-input">
        <button
          type="button"
          className="avatar-btn"
          aria-label="Choose your icon"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          <Avatar name={initial} color="var(--accent)" icon={icon} />
          <span className="avatar-edit">
            <FontAwesomeIcon icon={faPen} />
          </span>
        </button>
        <input
          id="player-name"
          autoFocus={autoFocus}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Enter a name"
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {picking && (
        <IconPicker value={icon} initial={initial} onChange={setIcon} />
      )}
    </div>
  );
};

export default NameField;
