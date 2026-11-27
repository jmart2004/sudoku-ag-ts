// Multiplayer sudoku server: serves the built React app and hosts lobbies
// over a websocket at /ws.

import { createReadStream, existsSync, statSync } from "fs";
import { createServer } from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { ClientMessage, ServerMessage } from "../src/shared/protocol";
import { Hub } from "../src/shared/server/hub";

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

// Lets Android open invite links straight in the app. Set
// ANDROID_CERT_SHA256 to the app's signing certificate fingerprint (comma
// separated for several, e.g. debug and release).
const ANDROID_APP_ID = "com.sudokurace.app";
const assetLinks = (process.env.ANDROID_CERT_SHA256 ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (urlPath === "/.well-known/assetlinks.json" && assetLinks.length) {
    res.writeHead(200, { "Content-Type": "application/json" }).end(
      JSON.stringify([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: ANDROID_APP_ID,
            sha256_cert_fingerprints: assetLinks,
          },
        },
      ])
    );
    return;
  }
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

const hub = new Hub();
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (socket) => {
  const conn = hub.connect((message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
  socket.on("message", (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(data));
    } catch {
      conn.send({ type: "error", message: "Malformed message." });
      return;
    }
    hub.receive(conn, msg);
  });
  socket.on("close", () => hub.disconnect(conn));
});

setInterval(() => hub.registry.sweep(), 60 * 1000).unref();

httpServer.listen(PORT, () => {
  console.log(`Sudoku server listening on http://localhost:${PORT}`);
});
