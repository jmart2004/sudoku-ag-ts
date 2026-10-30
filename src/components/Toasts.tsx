// Bottom-of-screen notifications: server errors and what rivals are up to.

import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext";
import { diffRoom, EventTone } from "../game/raceEvents";
import { RoomView } from "../shared/protocol";

interface Toast {
  id: number;
  text: string;
  tone: EventTone;
  color?: string;
}

const TOAST_MS = 3500;
const MAX_TOASTS = 4;

const Toasts: React.FC = () => {
  const { room, self, error, clearError } = useGame();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const prevRoom = useRef<RoomView | null>(null);

  const push = (toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_TOASTS));
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      TOAST_MS
    );
  };

  useEffect(() => {
    if (error) {
      push({ text: error, tone: "bad" });
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (room && self) {
      diffRoom(prevRoom.current, room, self.playerId).forEach(push);
    }
    prevRoom.current = room;
  }, [room, self]);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.color && (
            <span className="toast-dot" style={{ background: toast.color }} />
          )}
          {toast.text}
        </div>
      ))}
    </div>
  );
};

export default Toasts;
