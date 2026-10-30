// Turns successive room snapshots into short announcements for toasts.

import { RoomView } from "../shared/protocol";

export type EventTone = "info" | "good" | "bad";

export interface RaceEvent {
  text: string;
  tone: EventTone;
  color?: string;
}

const MILESTONES = [50, 90];

const percentDone = (room: RoomView, filled: number) => {
  const toFill = room.puzzle?.filter((v) => v === 0).length ?? 0;
  return toFill ? (filled / toFill) * 100 : 0;
};

export function diffRoom(
  prev: RoomView | null,
  next: RoomView,
  selfId: string
): RaceEvent[] {
  if (!prev || prev.code !== next.code) return [];
  const events: RaceEvent[] = [];
  const before = new Map(prev.players.map((p) => [p.id, p]));
  const after = new Map(next.players.map((p) => [p.id, p]));

  for (const player of next.players) {
    const old = before.get(player.id);
    const you = player.id === selfId;
    const color = player.color;
    if (!old) {
      if (!you) events.push({ text: `${player.name} joined`, tone: "info", color });
      continue;
    }
    if (old.connected && !player.connected) {
      events.push({ text: `${player.name} disconnected`, tone: "bad", color });
    } else if (!old.connected && player.connected) {
      events.push({ text: `${player.name} is back`, tone: "info", color });
    }
    if (!old.eliminated && player.eliminated) {
      events.push({
        text: you ? "You're out of lives" : `${player.name} is out of lives`,
        tone: you ? "bad" : "good",
        color,
      });
    }
    if (!you && next.phase === "playing" && prev.phase === "playing") {
      const was = percentDone(prev, old.filled.length);
      const now = percentDone(next, player.filled.length);
      const milestone = MILESTONES.filter((m) => was < m && now >= m).pop();
      if (milestone === 50) {
        events.push({ text: `${player.name} is halfway there`, tone: "info", color });
      } else if (milestone === 90) {
        events.push({ text: `${player.name} is almost done!`, tone: "bad", color });
      }
    }
  }

  for (const player of prev.players) {
    if (!after.has(player.id) && player.id !== selfId) {
      events.push({ text: `${player.name} left`, tone: "info", color: player.color });
    }
  }

  if (prev.hostId !== next.hostId && next.hostId === selfId) {
    events.push({ text: "You're the host now", tone: "info" });
  }
  return events;
}
