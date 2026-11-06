import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";
import { soundPlayer } from "../game/sounds";

const MuteButton: React.FC = () => {
  const [muted, setMuted] = useState(soundPlayer.muted);
  useEffect(() => soundPlayer.subscribe(() => setMuted(soundPlayer.muted)), []);

  return (
    <button
      className="icon-btn"
      aria-label={muted ? "Turn sound on" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        soundPlayer.setMuted(!muted);
        // A little blip confirms sound is back on.
        if (muted) soundPlayer.correct(5);
      }}
    >
      <FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} />
    </button>
  );
};

export default MuteButton;
