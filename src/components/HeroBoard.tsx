// Decorative board on the home page with four players' cells filling in.

import React, { useEffect, useState } from "react";
import { UNITS } from "../shared/engine";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#d946ef"];
const BOXES = UNITS.slice(18);
// A fixed, valid solution so the digits look real.
const DIGITS =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const HeroBoard: React.FC = () => {
  const [owners, setOwners] = useState<Record<number, number>>({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOwners((prev) => {
        if (Object.keys(prev).length > 40) return {};
        const cell = Math.floor(Math.random() * 81);
        return { ...prev, [cell]: Math.floor(Math.random() * COLORS.length) };
      });
    }, 260);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-board" aria-hidden>
      {BOXES.map((cells, b) => (
        <div key={b} className="box">
          {cells.map((cell) => {
            const owner = owners[cell];
            const given = (cell * 7) % 5 === 0;
            return (
              <span
                key={cell}
                className={`hero-cell${given ? " given" : ""}${
                  owner !== undefined ? " claimed" : ""
                }`}
                style={
                  owner !== undefined
                    ? ({ "--player": COLORS[owner] } as React.CSSProperties)
                    : undefined
                }
              >
                {given || owner !== undefined ? DIGITS[cell] : ""}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default HeroBoard;
