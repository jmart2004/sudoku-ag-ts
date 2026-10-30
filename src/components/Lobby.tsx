import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCrown,
  faLink,
  faPlay,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { MAX_PLAYERS } from "../shared/protocol";
import DifficultyPicker from "./DifficultyPicker";
import Avatar from "./ui/Avatar";

const Lobby: React.FC = () => {
  const { room, self, setDifficulty, startRace, leaveLobby } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  if (!room || !self) return null;

  const isHost = room.hostId === self.playerId;
  const inviteLink = `${window.location.origin}/room/${room.code}`;
  const host = room.players.find((p) => p.id === room.hostId);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this invite link:", inviteLink);
    }
  };

  return (
    <main className="page lobby">
      <section className="panel lobby-code-panel">
        <span className="eyebrow">Lobby code</span>
        <div className="lobby-code" aria-label={`Lobby code ${room.code}`}>
          {room.code.split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <button className="btn" onClick={copyInvite}>
          <FontAwesomeIcon icon={copied ? faCheck : faLink} />
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Racers</h2>
          <span className="muted">
            {room.players.length} / {MAX_PLAYERS}
          </span>
        </div>
        <div className="seats">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => {
            const player = room.players[i];
            if (!player) {
              return (
                <div key={`empty-${i}`} className="seat empty">
                  <span className="seat-avatar">
                    <FontAwesomeIcon icon={faUserPlus} />
                  </span>
                  <span className="seat-name">Open seat</span>
                </div>
              );
            }
            return (
              <div
                key={player.id}
                className="seat"
                style={{ "--player": player.color } as React.CSSProperties}
              >
                {player.id === room.hostId && (
                  <FontAwesomeIcon icon={faCrown} className="seat-crown" />
                )}
                <Avatar name={player.name} color={player.color} size="lg" />
                <span className="seat-name">{player.name}</span>
                {player.id === self.playerId && <span className="seat-you">You</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Difficulty</h2>
          {!isHost && <span className="muted">Chosen by {host?.name}</span>}
        </div>
        <DifficultyPicker
          value={room.difficulty}
          onChange={setDifficulty}
          disabled={!isHost}
        />
      </section>

      <div className="lobby-actions">
        {isHost ? (
          <button className="btn primary big block" onClick={startRace}>
            <FontAwesomeIcon icon={faPlay} />
            {room.players.length === 1 ? "Start solo practice" : "Start race"}
          </button>
        ) : (
          <div className="waiting">
            <span className="pulse-dot" /> Waiting for {host?.name ?? "the host"}{" "}
            to start…
          </div>
        )}
        <button
          className="btn ghost"
          onClick={() => {
            leaveLobby();
            navigate("/");
          }}
        >
          Leave lobby
        </button>
      </div>
    </main>
  );
};

export default Lobby;
