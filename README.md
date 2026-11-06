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
- **What's missing, at a glance.** Right-click a cell (long-press on a phone,
  or press `I`) to see which digits fit there, and what its row, column and
  box still need. Tap a digit to enter it, or add them all as notes. The host
  can switch this helper off in the settings so everyone races without it.
- **Settings** (gear icon): lobby rules the host sets for everyone, and your
  own preferences (sound effects, dark mode). New lobby options are added in
  `RoomOptions` (`src/shared/protocol.ts`) and listed in
  `src/components/SettingsDialog.tsx`.
- **Sound.** Every correct number plays its own note (1–9 climb a pentatonic
  scale), and a wrong one a soft buzz. Completing a row, column, box,
  diagonal or number (all of its copies placed) each has its own sound: a
  rising arpeggio, a falling cascade, a bell chord, a high sparkle, a coin-like
  "collect". All 26 combinations of two or more have their own sound too,
  with the parts layered in a key of their own and a finale that grows with
  the size of the combo. A completed number's cells shine gold. There are
  also countdown, board-done, win and out-of-lives cues. Everything is
  synthesized with Web Audio, so there are no sound files, and sound can be
  turned off in the settings.
- **Light and dark themes,** following your system until you choose one in the
  settings.
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

## Android app

The Android app is the same React app packaged with
[Capacitor](https://capacitorjs.com). It connects to the website's game
server, so app and browser players join the same lobbies with the same codes.
Everything the site does works in the app. On top of that, the invite button
opens Android's share sheet, the back button navigates (and exits from the
home screen), the status bar follows the theme, and tapping an invite link
can open the app.

```bash
SITE_URL=https://your-site.onrender.com npm run android:apk
```

This builds the app against that site and writes `dist/sudoku-race.apk`, a
debug build you can copy to a phone and install (allow installs from unknown
sources when asked). `SITE_URL` defaults to
`https://sudoku-race.onrender.com`. It needs JDK 21 and the Android SDK; the
script finds both where Android Studio installs them, or uses `JAVA_HOME` and
`ANDROID_HOME`. `npm run android:open` opens the project in Android Studio
instead, for running on an emulator or making a signed release build.

- **Invite links open the app** once the site vouches for it. Set
  `ANDROID_CERT_SHA256` on the server to the app's signing certificate
  fingerprint (shown by `cd android && ./gradlew signingReport`); the server
  then publishes `/.well-known/assetlinks.json`. Without it, Android asks
  which app to open links with, or opens them in the browser.
- **Testing against a local server:** `SITE_URL=http://192.168.1.20:3000`
  (your computer's address, with `npm run serve` running) works from a phone
  on the same Wi-Fi.
- **Icons:** `node scripts/make-icons.mjs` draws the logo into `assets/` and
  `public/`, and `npm run android:icons` turns those into launcher icons and
  splash screens.

## Project layout

| Path | What's there |
| --- | --- |
| `src/shared/engine/` | Sudoku engine shared by client and server: board geometry for every size (boxes and jigsaw regions), solver, technique-based grader and generator |
| `src/shared/protocol.ts` | Client/server message types |
| `server/` | Websocket server (`index.ts`), lobby/race rules (`rooms.ts`) and a background puzzle pool (`puzzlePool.ts`) |
| `src/game/GameContext.tsx` | Client connection, reconnect and rejoin logic |
| `src/game/boardReducer.ts` | Board interaction state: selection, notes, undo, guess feedback |
| `src/pages/`, `src/components/` | Home, lobby, race and results UI |
| `src/platform.ts`, `src/components/NativeBridge.tsx` | Website/app differences: server address, invite links, Android back button and status bar |
| `android/`, `capacitor.config.ts`, `scripts/android.mjs` | Android project and its build script |

## Scripts

- `npm run dev`: game server and React dev server with reload
- `npm run serve`: production build served by the game server
- `npm test`: unit tests
- `npm run typecheck`: type-check the client and the server
- `npm run android:apk`: build the Android APK into `dist/`
- `npm run android:open`: open the Android project in Android Studio
