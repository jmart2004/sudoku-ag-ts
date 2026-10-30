# Sudoku Race

A multiplayer sudoku race. Create a lobby, share the 4-letter code (or invite
link) with up to 3 friends, and everyone gets the **identical** board. The
first player to correctly fill every cell wins.

- **Lobbies of 1–4 players.** The host picks the difficulty and starts the race; a
  lobby of one works as solo practice.
- **Fair, properly graded boards.** Every puzzle has exactly one solution, so
  no valid answer is ever marked wrong. Difficulty comes from the techniques
  the puzzle needs, not just how many clues it has: easy needs only singles,
  medium needs locked candidates, and hard needs pairs, triples or an X-wing.
  No puzzle ever needs guessing.
- **Server-judged moves.** The solution never leaves the server. Each guess is
  checked there. A wrong number costs a life, and a player who runs out of
  lives is out of the race.
- **Live race view.** A race track shows every player's progress and lives.
  Each rival also gets a mini-board showing which cells they've filled, but
  never their numbers. Announcements pop up when someone reaches halfway, is
  almost done, or runs out of lives.
- **Notes with undo, highlighting and a number pad** with remaining counts.
  Notes that a correct answer rules out are cleared automatically. Keyboard:
  `1`–`9` to enter a number, arrow keys to move, `N` or `Space` to toggle notes,
  `Backspace` to erase notes, `Ctrl/⌘+Z` to undo, `Esc` to deselect.
- **Light and dark themes,** following your system until you choose one.
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
| `src/shared/engine/` | Sudoku engine shared by client and server: grid geometry, solver, technique-based grader and generator |
| `src/shared/protocol.ts` | Client/server message types |
| `server/` | Websocket server (`index.ts`), lobby/race rules (`rooms.ts`) and a background puzzle pool (`puzzlePool.ts`) |
| `src/game/GameContext.tsx` | Client connection, reconnect and rejoin logic |
| `src/game/boardReducer.ts` | Board interaction state: selection, notes, undo, guess feedback |
| `src/pages/`, `src/components/` | Home, lobby, race and results UI |

## Scripts

- `npm run dev`: game server and React dev server with reload
- `npm run serve`: production build served by the game server
- `npm test`: unit tests
- `npm run typecheck`: type-check the client and the server
