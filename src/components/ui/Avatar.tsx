import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ICON_ART } from "../../game/playerIcon";
import { PlayerIcon } from "../../shared/protocol";

interface AvatarProps {
  name: string;
  color: string;
  // A player icon id; without one the avatar shows the name's initial.
  icon?: string;
  size?: "sm" | "md" | "lg";
  dimmed?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  color,
  icon,
  size = "md",
  dimmed,
}) => {
  const art = icon ? ICON_ART[icon as PlayerIcon] : undefined;
  return (
    <span
      className={`avatar avatar-${size}${dimmed ? " dimmed" : ""}`}
      style={{ background: color }}
      aria-hidden
    >
      {art ? (
        <FontAwesomeIcon icon={art} className="avatar-icon" />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
};

export default Avatar;
