import React from "react";
import { Link } from "react-router-dom";
import { useGame } from "../game/GameContext";
import Logo from "./ui/Logo";
import SettingsButton from "./SettingsButton";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useGame();

  return (
    <div className="shell">
      <nav className="topbar">
        <Link to="/" className="brand">
          <Logo />
          <span>Sudoku Race</span>
        </Link>
        <div className="topbar-actions">
          {status !== "open" && (
            <span className="connection" title="Reconnecting to the server">
              <span className="pulse-dot" /> Reconnecting
            </span>
          )}
          <Link to="/stats" className="topbar-link">
            Stats
          </Link>
          <SettingsButton />
        </div>
      </nav>
      {children}
    </div>
  );
};

export default AppShell;
