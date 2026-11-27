// Routes client messages to rooms and sends state back. Transport-agnostic:
// the Node server plugs websockets in, the offline build an in-page client.

import { ClientMessage, ServerMessage } from "../protocol";
import { GameError, Room, RoomRegistry } from "./rooms";

export interface Connection {
  send: (message: ServerMessage) => void;
  room: Room | null;
  playerId: string | null;
}

export class Hub {
  readonly registry = new RoomRegistry();
  private connections = new Set<Connection>();

  connect(send: (message: ServerMessage) => void): Connection {
    const conn: Connection = { send, room: null, playerId: null };
    this.connections.add(conn);
    return conn;
  }

  disconnect(conn: Connection) {
    this.connections.delete(conn);
    this.detach(conn, false);
  }

  // Handle one message, reporting errors back to the sender.
  receive(conn: Connection, msg: ClientMessage) {
    try {
      this.handle(conn, msg);
    } catch (err) {
      if (err instanceof GameError) {
        conn.send({ type: "error", message: err.message, fatal: err.fatal });
      } else {
        console.error(err);
        conn.send({ type: "error", message: "Something went wrong." });
      }
    }
  }

  private broadcast(room: Room) {
    const view = room.view();
    this.connections.forEach((conn) => {
      if (conn.room === room && conn.playerId) {
        conn.send({
          type: "state",
          room: view,
          self: room.selfView(conn.playerId),
          serverNow: Date.now(),
        });
      }
    });
  }

  private detach(conn: Connection, leaving: boolean) {
    const { room, playerId } = conn;
    conn.room = null;
    conn.playerId = null;
    if (!room || !playerId) return;
    // Another tab may have taken over this player; only it decides now.
    const stillAttached = Array.from(this.connections).some(
      (c) => c.room === room && c.playerId === playerId
    );
    if (stillAttached) return;
    if (leaving) {
      room.removePlayer(playerId);
    } else {
      room.setConnected(playerId, false);
    }
    this.broadcast(room);
  }

  private attach(conn: Connection, room: Room, playerId: string, token: string) {
    conn.room = room;
    conn.playerId = playerId;
    conn.send({ type: "joined", playerId, token, code: room.code });
    this.broadcast(room);
  }

  private handle(conn: Connection, msg: ClientMessage) {
    switch (msg.type) {
      case "create": {
        this.detach(conn, true);
        const room = this.registry.create(msg.difficulty);
        const player = room.addPlayer(msg.name);
        this.attach(conn, room, player.id, player.token);
        return;
      }
      case "join": {
        const room = this.registry.get(msg.code);
        if (!room) throw new GameError("No lobby with that code.");
        this.detach(conn, true);
        const player = room.addPlayer(msg.name);
        this.attach(conn, room, player.id, player.token);
        return;
      }
      case "rejoin": {
        const room = this.registry.get(msg.code);
        const player = room?.getPlayer(msg.playerId);
        if (!room || !player || player.token !== msg.token) {
          throw new GameError("Your seat in that lobby is gone.", true);
        }
        if (conn.playerId !== player.id) this.detach(conn, true);
        room.setConnected(player.id, true);
        this.attach(conn, room, player.id, player.token);
        return;
      }
      case "leave":
        this.detach(conn, true);
        return;
    }

    const { room, playerId } = conn;
    if (!room || !playerId) throw new GameError("You're not in a lobby.");
    switch (msg.type) {
      case "setDifficulty":
        room.setDifficulty(playerId, msg.difficulty);
        break;
      case "setOptions":
        room.setOptions(playerId, msg.options);
        break;
      case "setSize":
        room.setSize(playerId, msg.size);
        break;
      case "setMode":
        room.setMode(playerId, msg.mode, msg.durationMs);
        break;
      case "start":
        room.start(playerId, () => this.broadcast(room));
        break;
      case "guess": {
        const { correct, completedBoard } = room.guess(
          playerId,
          msg.cell,
          msg.value
        );
        conn.send({
          type: "guessResult",
          cell: msg.cell,
          value: msg.value,
          correct,
          completedBoard,
        });
        break;
      }
      case "backToLobby":
        room.backToLobby(playerId);
        break;
      default:
        throw new GameError("Unknown message.");
    }
    this.broadcast(room);
  }
}
