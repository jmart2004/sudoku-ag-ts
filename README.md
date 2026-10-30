# Sudoku Race

A multiplayer sudoku race. Create a lobby, share the 4-letter code (or invite
link) with up to 3 friends, and everyone gets the **identical** board. The
first player to correctly fill every cell wins.

- **Lobbies of 1–4 players.** The host picks the difficulty and starts the race; a
  lobby of one works as solo practice.
- **Fair boards.** Every puzzle is generated with exactly one solution, so no
  valid answer is ever marked wrong.
- **Server-judged moves.** The solution never leaves the server. Each guess is
  checked there. A wrong number costs a life, and a player who runs out of
  lives is out of the race.
- **Live opponents.** Each opponent shows as a mini-board: you see which cells
  they've filled and how many lives they have left, but never their numbers.
- **Notes, highlighting and a number pad** with remaining counts. Keyboard:
  `1`–`9` to enter a number, arrow keys to move, `N` to toggle notes,
  `Backspace` to clear notes, `Esc` to deselect.
- **Refresh-safe.** Reloading the tab mid-race puts you back in your seat with
  your progress intact.
- **Rematches.** After the results, the host can take everyone back to the lobby.

## Running it

```bash
npm install
npm run dev
```

This starts the game server on port 3001 and the React dev server on
[http://localhost:3000](http://localhost:3000). To try it with several
players locally, open the lobby in more than one browser window (use a private
window or a different browser, because seats are stored per tab).

### Production

```bash
npm run serve
```

This builds the app and serves both the site and the websocket from one Node
process on `$PORT` (default 3000). It needs a host that runs Node and supports
websockets, such as Render, Fly.io or Railway. A static host like GitHub Pages
won't work. To point the client at a game server somewhere else, set
`REACT_APP_WS_URL` (for example `wss://example.com/ws`) at build time.

## Project layout

| Path | What's there |
| --- | --- |
| `src/shared/` | Puzzle generation and the client/server message types, used by both sides |
| `server/` | Websocket server (`index.ts`) and lobby/race rules (`rooms.ts`) |
| `src/game/GameContext.tsx` | Client connection, reconnect and rejoin logic |
| `src/pages/`, `src/components/` | Home, lobby, race and results UI |

## Scripts

- `npm run dev`: game server and React dev server with reload
- `npm run serve`: production build served by the game server
- `npm test`: unit tests
- `npm run typecheck`: type-check the client and the server
