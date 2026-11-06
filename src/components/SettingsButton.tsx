import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useOpenSettings } from "./SettingsDialog";

const SettingsButton: React.FC<{ className?: string }> = ({ className }) => {
  const openSettings = useOpenSettings();
  return (
    <button
      className={`icon-btn${className ? ` ${className}` : ""}`}
      aria-label="Settings"
      onClick={openSettings}
    >
      <FontAwesomeIcon icon={faGear} />
    </button>
  );
};

export default SettingsButton;
