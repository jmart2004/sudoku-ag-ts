import React, { useMemo } from "react";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#d946ef", "#facc15"];

// A one-shot burst of CSS confetti.
const Confetti: React.FC<{ pieces?: number }> = ({ pieces = 90 }) => {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 240,
        spin: (Math.random() - 0.5) * 1440,
        color: COLORS[i % COLORS.length],
        wide: Math.random() > 0.5,
      })),
    [pieces]
  );
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          style={
            {
              left: `${b.left}%`,
              background: b.color,
              width: b.wide ? 10 : 6,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              "--drift": `${b.drift}px`,
              "--spin": `${b.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default Confetti;
