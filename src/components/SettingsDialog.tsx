// The settings panel behind the gear icon: lobby rules the host sets for
// everyone, and your own preferences.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleHalfStroke,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { soundPlayer } from "../game/sounds";
import { setTheme, THEMES, useTheme } from "../game/theme";
import { useSavedIcon } from "../game/playerIcon";
import IconPicker from "./IconPicker";
import { RoomOptions } from "../shared/protocol";

// Lobby options, in the order they're listed. Each needs an entry in
// RoomOptions and DEFAULT_ROOM_OPTIONS (src/shared/protocol.ts).
const ROOM_OPTION_INFO: {
  key: keyof RoomOptions;
  title: string;
  description: string;
}[] = [
  {
    key: "helper",
    title: "What's-missing helper",
    description:
      "Right-click or long-press a cell to see which numbers fit there and what its row, column and box still need.",
  },
];

const SettingsContext = createContext<() => void>(() => {});

// Opens the settings panel.
export const useOpenSettings = () => useContext(SettingsContext);

interface SettingRowProps {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <label className={`option-row${disabled ? " readonly" : ""}`}>
    <span className="option-text">
      <strong>{title}</strong>
      {description && <span className="muted small">{description}</span>}
    </span>
    <input
      type="checkbox"
      role="switch"
      className="switch"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { room, self, setOptions, setIcon } = useGame();
  const { choice } = useTheme();
  const icon = useSavedIcon();
  const me = room?.players.find((p) => p.id === self?.playerId);
  const [muted, setMuted] = useState(soundPlayer.muted);
  useEffect(() => soundPlayer.subscribe(() => setMuted(soundPlayer.muted)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const host = room?.players.find((p) => p.id === room.hostId);
  const isHost = !!room && room.hostId === self?.playerId;
  const canEditRoom = isHost && room?.phase === "lobby";
  const roomNote = !room
    ? null
    : canEditRoom
      ? "You're the host: these apply to everyone."
      : room.phase !== "lobby"
        ? "These can be changed in the lobby between games."
        : `Set by ${host?.name ?? "the host"}.`;

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal settings" role="dialog" aria-label="Settings">
        <div className="settings-head">
          <h2>Settings</h2>
          <button
            className="icon-btn"
            aria-label="Close settings"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {room && (
          <section className="settings-section">
            <div className="settings-section-head">
              <span className="eyebrow">This lobby</span>
              <span className="muted small">{roomNote}</span>
            </div>
            {ROOM_OPTION_INFO.map((option) => (
              <SettingRow
                key={option.key}
                title={option.title}
                description={option.description}
                checked={room.options[option.key]}
                disabled={!canEditRoom}
                onChange={(value) => setOptions({ [option.key]: value })}
              />
            ))}
          </section>
        )}

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="eyebrow">You</span>
            <span className="muted small">Saved in this browser.</span>
          </div>
          <SettingRow
            title="Sound effects"
            description="Notes for each number, plus completions and game events."
            checked={!muted}
            onChange={(on) => {
              soundPlayer.setMuted(!on);
              // A little blip confirms sound is back on.
              if (on) soundPlayer.correct(5);
            }}
          />
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="eyebrow">Theme</span>
          </div>
          <div className="theme-grid" role="radiogroup" aria-label="Theme">
            <button
              role="radio"
              aria-checked={choice === "system"}
              className={`theme-card${choice === "system" ? " selected" : ""}`}
              onClick={() => setTheme("system")}
            >
              <span className="theme-swatch theme-swatch-system">
                <FontAwesomeIcon icon={faCircleHalfStroke} />
              </span>
              <span className="theme-name">Auto</span>
              <span className="theme-blurb">Match this device</span>
            </button>
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={choice === t.id}
                className={`theme-card${choice === t.id ? " selected" : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <span
                  className="theme-swatch"
                  style={
                    {
                      "--sw-bg": t.bg,
                      "--sw-surface": t.preview[0],
                      "--sw-a": t.preview[1],
                      "--sw-b": t.preview[2],
                    } as React.CSSProperties
                  }
                >
                  <FontAwesomeIcon icon={t.icon} />
                  <i />
                  <i />
                </span>
                <span className="theme-name">{t.name}</span>
                <span className="theme-blurb">{t.blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="eyebrow">Your icon</span>
            <span className="muted small">
              {room && room.phase !== "lobby"
                ? "Shows from the next lobby."
                : "Shown on your avatar."}
            </span>
          </div>
          <IconPicker
            value={icon}
            initial={me?.name.charAt(0).toUpperCase() || "A"}
            onChange={setIcon}
          />
        </section>
      </div>
    </div>
  );
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <SettingsContext.Provider value={useCallback(() => setOpen(true), [])}>
      {children}
      {open && <SettingsDialog onClose={close} />}
    </SettingsContext.Provider>
  );
};
