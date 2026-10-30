import React from "react";

interface AvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  dimmed?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ name, color, size = "md", dimmed }) => (
  <span
    className={`avatar avatar-${size}${dimmed ? " dimmed" : ""}`}
    style={{ background: color }}
    aria-hidden
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);

export default Avatar;
