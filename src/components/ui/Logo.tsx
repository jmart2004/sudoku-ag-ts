import React from "react";

// A 3x3 box in the four player colours.
const CELLS = [
  "#f97316", "", "#3b82f6",
  "", "var(--accent)", "",
  "#22c55e", "", "#d946ef",
];

const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <span className="logo" style={{ width: size, height: size }} aria-hidden>
    {CELLS.map((color, i) => (
      <span key={i} style={color ? { background: color } : undefined} />
    ))}
  </span>
);

export default Logo;
