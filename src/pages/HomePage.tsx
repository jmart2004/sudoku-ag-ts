import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { MAX_NAME_LENGTH, MAX_PLAYERS } from "../shared/protocol";
import { Difficulty } from "../shared/sudoku";
import { getSavedName, saveName } from "../utility/Stats";
import DifficultyPicker from "../components/DifficultyPicker";
import ErrorBanner from "../components/ErrorBanner";

const HomePage: React.FC = () => {
  const { room, createLobby, joinLobby, status } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState(getSavedName);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [code, setCode] = useState("");

  // Head to the lobby as soon as the server seats us.
  useEffect(() => {
    if (room) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  const trimmedName = name.trim();

  return (
    <div className="page home-page">
      <h1 className="title">Sudoku Race</h1>
      <p className="subtitle">
        Up to {MAX_PLAYERS} players. One identical board. First to finish wins.
      </p>
      <ErrorBanner />

      <label className="field">
        <span>Your name</span>
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Enter a name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="home-cards">
        <section className="card">
          <h2>Create a lobby</h2>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          <button
            className="btn primary"
            disabled={!trimmedName || status !== "open"}
            onClick={() => {
              saveName(trimmedName);
              createLobby(trimmedName, difficulty);
            }}
          >
            Create lobby
          </button>
        </section>

        <section className="card">
          <h2>Join a lobby</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveName(trimmedName);
              joinLobby(code, trimmedName);
            }}
          >
            <input
              className="code-input"
              value={code}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="btn"
              disabled={!trimmedName || code.length !== 4 || status !== "open"}
            >
              Join
            </button>
          </form>
        </section>
      </div>

      {status !== "open" && (
        <p className="muted">Connecting to the game server…</p>
      )}
      <Link to="/stats" className="link">
        My stats
      </Link>
    </div>
  );
};

export default HomePage;
