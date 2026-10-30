import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { MAX_NAME_LENGTH, MAX_PLAYERS } from "../shared/protocol";
import { Difficulty } from "../shared/engine";
import { getSavedName, saveName } from "../utility/Stats";
import DifficultyPicker from "../components/DifficultyPicker";
import Avatar from "../components/ui/Avatar";
import HeroBoard from "../components/HeroBoard";

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
  const ready = !!trimmedName && status === "open";

  return (
    <main className="page home">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Same puzzle.
            <br />
            <span className="gradient-text">Fastest mind wins.</span>
          </h1>
          <p className="lead">
            Race up to {MAX_PLAYERS - 1} friends on an identical sudoku. Watch
            their progress live, avoid mistakes, and be the first to fill the
            board.
          </p>
        </div>
        <HeroBoard />
      </section>

      <section className="panel play-panel">
        <label className="field">
          <span className="field-label">Your name</span>
          <span className="name-input">
            <Avatar name={trimmedName || "?"} color="var(--accent)" />
            <input
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Enter a name"
              onChange={(e) => setName(e.target.value)}
            />
          </span>
        </label>

        <div className="play-options">
          <div className="play-option">
            <h2>Host a race</h2>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            <button
              className="btn primary block"
              disabled={!ready}
              onClick={() => {
                saveName(trimmedName);
                createLobby(trimmedName, difficulty);
              }}
            >
              <FontAwesomeIcon icon={faPlus} /> Create lobby
            </button>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <form
            className="play-option"
            onSubmit={(e) => {
              e.preventDefault();
              saveName(trimmedName);
              joinLobby(code, trimmedName);
            }}
          >
            <h2>Join a friend</h2>
            <input
              className="code-input"
              value={code}
              maxLength={4}
              placeholder="CODE"
              aria-label="Lobby code"
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
            />
            <button
              type="submit"
              className="btn block"
              disabled={!ready || code.length !== 4}
            >
              Join lobby <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
