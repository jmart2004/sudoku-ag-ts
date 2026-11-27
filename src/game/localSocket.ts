// A stand-in for the game server's websocket that runs the server's own room
// logic in the page, for the offline build. Messages are delivered
// asynchronously, just as over the network.

import { ClientMessage, ServerMessage } from "../shared/protocol";
import { Hub } from "../shared/server/hub";

let hub: Hub | null = null;

export class LocalSocket {
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  private conn;

  constructor() {
    hub ??= new Hub();
    this.conn = hub.connect((message: ServerMessage) => {
      const data = JSON.stringify(message);
      setTimeout(() => {
        if (this.readyState === WebSocket.OPEN) this.onmessage?.({ data });
      }, 0);
    });
    setTimeout(() => {
      if (this.readyState !== WebSocket.CONNECTING) return;
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(data: string) {
    const msg: ClientMessage = JSON.parse(data);
    setTimeout(() => hub?.receive(this.conn, msg), 0);
  }

  close() {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    hub?.disconnect(this.conn);
  }
}
