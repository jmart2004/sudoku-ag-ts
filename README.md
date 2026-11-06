# Sudoku Race

A multiplayer sudoku race. Create a lobby, share the 4-letter code (or invite
link) with up to 3 friends, and everyone gets the **identical** board. The
first player to correctly fill every cell wins.

- **Lobbies of 1–4 players.** The host picks the mode and difficulty and starts
  the game; a lobby of one works as solo practice.
- **Two modes:**
  - **Race:** first to finish the board wins.
  - **Time attack:** whoever completes the most boards in 3, 5 or 10 minutes
    wins. Everyone gets the same boards in the same order, and finishing one
    deals the next. Instead of costing a life, a wrong number locks your board
    for 3 seconds.
- **Board sizes from 4×4 to 9×9.** 4×4, 6×6 and 8×8 use rectangular boxes
  (2×2, 2×3, 2×4) and 9×9 is classic. 5×5 and 7×7 can't be split into
  rectangles, so they're **jigsaw** boards: irregular regions that each hold
  every digit once, with a new layout for every puzzle.
- **Fair, properly graded boards.** Every puzzle has exactly one solution, so
  no valid answer is ever marked wrong. Difficulty comes from the techniques
  the puzzle needs, not just how many clues it has: easy needs only singles,
  medium needs locked candidates, and hard needs pairs, triples or an X-wing.
  No puzzle ever needs guessing. Small boards rarely need advanced
  techniques, so their difficulty mostly comes from how many clues they have.
- **Server-judged moves.** The solution never leaves the server. Each guess is
  checked there. In a race, a wrong number costs a life, and a player who runs
  out of lives is out.
- **Live race view.** A race track shows every player's progress and lives.
  Each rival also gets a mini-board showing which cells they've filled, but
  never their numbers. Announcements pop up when someone reaches halfway, is
  almost done, or runs out of lives.
- **Notes with undo, highlighting and a number pad** with remaining counts.
  Notes that a correct answer rules out are cleared automatically. Keyboard:
  `1`–`9` to enter a number, arrow keys to move, `N` or `Space` to toggle notes,
  `Backspace` to erase notes, `Ctrl/⌘+Z` to undo, `Esc` to deselect.
- **Sound.** Every correct number plays its own note (1–9 climb a pentatonic
  scale), and a wrong one a soft buzz. Completing a row, column, box or
  diagonal each has its own sound (a rising arpeggio, a falling cascade, a bell
  chord, a high sparkle), and several at once end on a bonus chime. There are
  also countdown, board-done, win and out-of-lives cues. Everything is
  synthesized with Web Audio, so there are no sound files, and there's a mute
  button in the race bar.
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
websockets. A static host like GitHub Pages won't work. To point the client at
a game server somewhere else, set `REACT_APP_WS_URL` (for example
`wss://example.com/ws`) at build time.

### Free hosting on Render

The repo includes a `render.yaml` blueprint. In Render, choose **New →
Blueprint**, pick this repository, and confirm. You get an
`https://sudoku-race-….onrender.com` link to share. On the free plan the
service sleeps after 15 minutes without visitors, and the first visit after
that takes about a minute to wake it. Lobbies are kept in memory, so a sleep or
restart ends any game in progress.

## Project layout

| Path | What's there |
| --- | --- |
| `src/shared/engine/` | Sudoku engine shared by client and server: board geometry for every size (boxes and jigsaw regions), solver, technique-based grader and generator |
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
