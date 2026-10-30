// Turns successive room snapshots into short announcements for toasts.

import { PlayerView, RoomView } from "../shared/protocol";

export type EventTone = "info" | "good" | "bad";

export interface RaceEvent {
  text: string;
  tone: EventTone;
  color?: string;
}

const MILESTONES = [50, 90];

const percentDone = (player: PlayerView) => {
  const toFill = 81 - player.givens.length;
  return toFill ? (player.filled.length / toFill) * 100 : 0;
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
    const bothPlaying = next.phase === "playing" && prev.phase === "playing";
    if (!you && bothPlaying && next.mode === "timed") {
      if (player.boardsCompleted > old.boardsCompleted) {
        events.push({
          text: `${player.name} finished board ${player.boardsCompleted}`,
          tone: "info",
          color,
        });
      }
    } else if (!you && bothPlaying) {
      const was = percentDone(old);
      const now = percentDone(player);
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
