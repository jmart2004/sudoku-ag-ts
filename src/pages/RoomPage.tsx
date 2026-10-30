// Everything that happens inside a lobby: waiting room, the race, results.

import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { MAX_NAME_LENGTH } from "../shared/protocol";
import { getSavedName, saveName } from "../utility/Stats";
import Lobby from "../components/Lobby";
import Race from "../components/Race";
import ErrorBanner from "../components/ErrorBanner";

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
      <div className="page center">
        <p className="muted">Reconnecting to lobby {upperCode}…</p>
      </div>
    );
  }

  // Arrived from an invite link, or lost our seat: ask for a name and join.
  const trimmedName = name.trim();
  return (
    <div className="page home-page">
      <h1 className="title">Join lobby {upperCode}</h1>
      <ErrorBanner />
      {lostSeatCode === upperCode && (
        <p className="muted">
          Your seat in this lobby was lost. If the race is over you can join
          again for the next one.
        </p>
      )}
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          saveName(trimmedName);
          joinLobby(upperCode, trimmedName);
        }}
      >
        <label className="field">
          <span>Your name</span>
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Enter a name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn primary"
          disabled={!trimmedName || status !== "open"}
        >
          Join lobby
        </button>
      </form>
      <Link to="/" className="link">
        Back home
      </Link>
    </div>
  );
};

export default RoomPage;
