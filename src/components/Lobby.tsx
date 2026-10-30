import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { MAX_PLAYERS } from "../shared/protocol";
import { STARTING_LIVES } from "../shared/sudoku";
import DifficultyPicker from "./DifficultyPicker";
import ErrorBanner from "./ErrorBanner";

const Lobby: React.FC = () => {
  const { room, self, setDifficulty, startRace, leaveLobby } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  if (!room || !self) return null;

  const isHost = room.hostId === self.playerId;
  const inviteLink = `${window.location.origin}/room/${room.code}`;
  const emptySlots = MAX_PLAYERS - room.players.length;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this invite link:", inviteLink);
    }
  };

  return (
    <div className="page lobby">
      <ErrorBanner />
      <p className="muted">Lobby code</p>
      <div className="lobby-code">{room.code}</div>
      <button className="btn" onClick={copyInvite}>
        {copied ? "Link copied!" : "Copy invite link"}
      </button>

      <section className="card lobby-players">
        <h2>
          Players {room.players.length}/{MAX_PLAYERS}
        </h2>
        <ul>
          {room.players.map((player) => (
            <li key={player.id}>
              <span className="dot" style={{ background: player.color }} />
              <span className="player-name">{player.name}</span>
              {player.id === self.playerId && <span className="tag">you</span>}
              {player.id === room.hostId && <span className="tag">host</span>}
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`empty-${i}`} className="empty-slot">
              <span className="dot" />
              Waiting for player…
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Difficulty</h2>
        <DifficultyPicker
          value={room.difficulty}
          onChange={setDifficulty}
          disabled={!isHost}
        />
        <p className="muted">
          {STARTING_LIVES[room.difficulty]} lives each. A wrong number costs a
          life; run out and you're out of the race.
        </p>
      </section>

      {isHost ? (
        <button className="btn primary big" onClick={startRace}>
          {room.players.length === 1 ? "Start solo practice" : "Start race"}
        </button>
      ) : (
        <p className="muted">Waiting for the host to start the race…</p>
      )}
      <button
        className="btn subtle"
        onClick={() => {
          leaveLobby();
          navigate("/");
        }}
      >
        Leave lobby
      </button>
    </div>
  );
};

export default Lobby;
