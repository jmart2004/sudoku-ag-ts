// Multiplayer sudoku server: serves the built React app and hosts lobbies
// over a websocket at /ws.

import { createReadStream, existsSync, statSync } from "fs";
import { createServer } from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { ClientMessage, ServerMessage } from "../src/shared/protocol";
import { GameError, Room, RoomRegistry } from "./rooms";

const PORT = Number(process.env.PORT ?? 3001);
const BUILD_DIR = path.resolve(__dirname, "../build");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".map": "application/json",
};

const httpServer = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let filePath = path.join(BUILD_DIR, urlPath);
  if (!filePath.startsWith(BUILD_DIR)) {
    res.writeHead(400).end();
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // Client-side routes all render index.html.
    filePath = path.join(BUILD_DIR, "index.html");
  }
  if (!existsSync(filePath)) {
    res
      .writeHead(404, { "Content-Type": "text/plain" })
      .end("No build found. Run `npm run build`, or use `npm run dev`.");
    return;
  }
  res.writeHead(200, {
    "Content-Type":
      MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
});

const registry = new RoomRegistry();
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

interface Connection {
  socket: WebSocket;
  room: Room | null;
  playerId: string | null;
}
const connections = new Set<Connection>();

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(room: Room) {
  const view = room.view();
  connections.forEach((conn) => {
    if (conn.room === room && conn.playerId) {
      send(conn.socket, {
        type: "state",
        room: view,
        self: room.selfView(conn.playerId),
        serverNow: Date.now(),
      });
    }
  });
}

function detach(conn: Connection, leaving: boolean) {
  const { room, playerId } = conn;
  conn.room = null;
  conn.playerId = null;
  if (!room || !playerId) return;
  // Another tab may have taken over this player; only it decides now.
  const stillAttached = Array.from(connections).some(
    (c) => c.room === room && c.playerId === playerId
  );
  if (stillAttached) return;
  if (leaving) {
    room.removePlayer(playerId);
  } else {
    room.setConnected(playerId, false);
  }
  broadcast(room);
}

function attach(conn: Connection, room: Room, playerId: string, token: string) {
  conn.room = room;
  conn.playerId = playerId;
  send(conn.socket, { type: "joined", playerId, token, code: room.code });
  broadcast(room);
}

function handle(conn: Connection, msg: ClientMessage) {
  switch (msg.type) {
    case "create": {
      detach(conn, true);
      const room = registry.create(msg.difficulty);
      const player = room.addPlayer(msg.name);
      attach(conn, room, player.id, player.token);
      return;
    }
    case "join": {
      const room = registry.get(msg.code);
      if (!room) throw new GameError("No lobby with that code.");
      detach(conn, true);
      const player = room.addPlayer(msg.name);
      attach(conn, room, player.id, player.token);
      return;
    }
    case "rejoin": {
      const room = registry.get(msg.code);
      const player = room?.getPlayer(msg.playerId);
      if (!room || !player || player.token !== msg.token) {
        throw new GameError("Your seat in that lobby is gone.", true);
      }
      if (conn.playerId !== player.id) detach(conn, true);
      room.setConnected(player.id, true);
      attach(conn, room, player.id, player.token);
      return;
    }
    case "leave":
      detach(conn, true);
      return;
  }

  const { room, playerId } = conn;
  if (!room || !playerId) throw new GameError("You're not in a lobby.");
  switch (msg.type) {
    case "setDifficulty":
      room.setDifficulty(playerId, msg.difficulty);
      break;
    case "start":
      room.start(playerId, () => broadcast(room));
      break;
    case "guess": {
      const correct = room.guess(playerId, msg.cell, msg.value);
      send(conn.socket, {
        type: "guessResult",
        cell: msg.cell,
        value: msg.value,
        correct,
      });
      break;
    }
    case "backToLobby":
      room.backToLobby(playerId);
      break;
    default:
      throw new GameError("Unknown message.");
  }
  broadcast(room);
}

wss.on("connection", (socket) => {
  const conn: Connection = { socket, room: null, playerId: null };
  connections.add(conn);
  socket.on("message", (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(data));
    } catch {
      send(socket, { type: "error", message: "Malformed message." });
      return;
    }
    try {
      handle(conn, msg);
    } catch (err) {
      if (err instanceof GameError) {
        send(socket, {
          type: "error",
          message: err.message,
          fatal: err.fatal,
        });
      } else {
        console.error(err);
        send(socket, { type: "error", message: "Something went wrong." });
      }
    }
  });
  socket.on("close", () => {
    connections.delete(conn);
    detach(conn, false);
  });
});

setInterval(() => registry.sweep(), 60 * 1000).unref();

httpServer.listen(PORT, () => {
  console.log(`Sudoku server listening on http://localhost:${PORT}`);
});
