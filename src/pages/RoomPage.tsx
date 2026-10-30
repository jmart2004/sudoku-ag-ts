// Everything that happens inside a lobby: waiting room, the race, results.

import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { MAX_NAME_LENGTH } from "../shared/protocol";
import { getSavedName, saveName } from "../utility/Stats";
import Lobby from "../components/Lobby";
import Race from "../components/Race";
import Avatar from "../components/ui/Avatar";

const RoomPage: React.FC = () => {
  const { code = "" } = useParams<{ code: string }>();
  const { room, self, rejoining, lostSeatCode, joinLobby, status } = useGame();
  const [name, setName] = useState(getSavedName);
  const upperCode = code.toUpperCase();

  if (room && self && room.code === upperCode) {
    return room.phase === "lobby" ? <Lobby /> : <Race />;
  }

  if (rejoining) {
    return (
      <main className="page center">
        <div className="spinner" />
        <p className="muted">Reconnecting to lobby {upperCode}…</p>
      </main>
    );
  }

  // Arrived from an invite link, or lost our seat: ask for a name and join.
  const trimmedName = name.trim();
  return (
    <main className="page center">
      <form
        className="panel join-panel"
        onSubmit={(e) => {
          e.preventDefault();
          saveName(trimmedName);
          joinLobby(upperCode, trimmedName);
        }}
      >
        <span className="eyebrow">You're invited to race</span>
        <div className="lobby-code small">
          {upperCode.split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        {lostSeatCode === upperCode && (
          <p className="muted">
            Your seat in this lobby was lost. If the race is over you can join
            again for the next one.
          </p>
        )}
        <label className="field">
          <span className="field-label">Your name</span>
          <span className="name-input">
            <Avatar name={trimmedName || "?"} color="var(--accent)" />
            <input
              autoFocus
              value={name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Enter a name"
              onChange={(e) => setName(e.target.value)}
            />
          </span>
        </label>
        <button
          type="submit"
          className="btn primary block"
          disabled={!trimmedName || status !== "open"}
        >
          Join lobby
        </button>
        <Link to="/" className="muted small center-text">
          Back home
        </Link>
      </form>
    </main>
  );
};

export default RoomPage;
