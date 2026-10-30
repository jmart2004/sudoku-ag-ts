import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { useTheme } from "../game/theme";
import Logo from "./ui/Logo";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, toggleTheme] = useTheme();
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
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
};

export default AppShell;
