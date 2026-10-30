import React from "react";

// Big 3-2-1 over the board while the race is about to start.
const Countdown: React.FC<{ seconds: number }> = ({ seconds }) => (
  <div className="board-overlay countdown">
    <span key={seconds} className="countdown-number">
      {seconds}
    </span>
    <span className="countdown-label">Get ready</span>
  </div>
);

export default Countdown;
