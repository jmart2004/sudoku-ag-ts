// The race itself: your board, the track, rivals' boards, countdown and results.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faEraser,
  faHeart,
  faPencil,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import {
  boardReducer,
  completionOf,
  initialBoardState,
  planInput,
} from "../game/boardReducer";
import { CompletionKind, soundPlayer } from "../game/sounds";
import { formatTime, recordRace, recordTimedRun } from "../utility/Stats";
import {
  geometryFor,
  isJigsawSize,
  STARTING_LIVES,
  standardGeometry,
} from "../shared/engine";
import Board from "./Board";
import NumberPad from "./NumberPad";
import RaceTrack from "./RaceTrack";
import OpponentBoard from "./OpponentBoard";
import Countdown from "./Countdown";
import Results from "./Results";
import MuteButton from "./MuteButton";
import CellInspector, { InspectTarget } from "./CellInspector";

const FEEDBACK_MS = 800;
const BOARD_DONE_MS = 1200;
const BADGE_MS = 1600;
const BADGE_TITLES = ["", "", "Double!", "Triple!", "Quad!", "Perfect!"];

interface Badge {
  id: number;
  kinds: CompletionKind[];
  digit: number | null;
}

// "Row + Column", "Row + Box + All 7s"...
function badgeText({ kinds, digit }: Badge, regionName: string) {
  const names: Record<CompletionKind, string> = {
    row: "Row",
    column: "Column",
    region: regionName,
    diagonal: "Diagonal",
    digit: `All ${digit}s`,
  };
  const title =
    kinds.length === 1 ? `Every ${digit} placed!` : BADGE_TITLES[kinds.length];
  return { title, detail: kinds.map((k) => names[k]).join(" + ") };
}
// The timed-mode clock turns urgent for the last stretch.
const FINAL_STRETCH_MS = 30 * 1000;
const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const Race: React.FC = () => {
  const { room, self, clockOffset, guess, onGuessResult, leaveLobby } =
    useGame();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(boardReducer, undefined, initialBoardState);
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [boardDone, setBoardDone] = useState<number | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const badgeId = useRef(0);
  const boardRef = useRef<number[]>([]);

  const board = self?.board ?? null;
  const size = room?.size ?? 9;
  // The current board's shape; jigsaw boards each have their own regions.
  const regions = self?.regions;
  const geometry = useMemo(
    () => (regions ? geometryFor(regions) : standardGeometry(size)),
    [regions, size]
  );
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;
  boardRef.current = board ?? [];
  const me = room?.players.find((p) => p.id === self?.playerId);
  const phase = room?.phase;
  const timed = room?.mode === "timed";
  const locked = !!self?.lockedUntil && self.lockedUntil > now;
  const canPlay =
    phase === "playing" && !!me && !me.eliminated && !!board && !locked;

  const raceId = room ? `${room.code}-${room.startAt}` : "";
  useEffect(() => {
    // The host taps Start at the bottom of the lobby; open the race at the top.
    window.scrollTo(0, 0);
  }, [raceId]);

  // Fresh notes and selection for each new board (timed mode deals several).
  const boardNumber = me?.boardsCompleted ?? 0;
  const boardKey = timed ? boardNumber : 0;
  useEffect(() => {
    dispatch({ type: "reset", geometry });
  }, [raceId, boardKey, geometry]);

  // These timers only clear what they were set for: a timer can fire just
  // after a newer badge or flash arrives, before React swaps the timer.
  useEffect(() => {
    if (!badge) return;
    const timer = window.setTimeout(
      () => setBadge((current) => (current?.id === badge.id ? null : current)),
      BADGE_MS
    );
    return () => window.clearTimeout(timer);
  }, [badge]);

  // Celebrate each finished board in timed mode.
  useEffect(() => {
    if (!boardDone) return;
    const timer = window.setTimeout(
      () => setBoardDone((current) => (current === boardDone ? null : current)),
      BOARD_DONE_MS
    );
    return () => window.clearTimeout(timer);
  }, [boardDone]);

  useEffect(() => {
    if (phase === "finished") return;
    const timer = window.setInterval(
      () => setNow(Date.now() + clockOffset),
      200
    );
    return () => window.clearInterval(timer);
  }, [phase, clockOffset]);

  useEffect(() => {
    if (!state.feedbackId) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "clearFeedback", feedbackId: state.feedbackId }),
      FEEDBACK_MS
    );
    return () => window.clearTimeout(timer);
  }, [state.feedbackId]);

  useEffect(
    () =>
      onGuessResult((result) => {
        if (!result.correct) {
          soundPlayer.cue("wrong");
        } else if (!result.completedBoard) {
          // The server's new board may not have arrived yet; apply the move.
          const filled = [...boardRef.current];
          filled[result.cell] = result.value;
          const done = completionOf(geometryRef.current, filled, result.cell);
          soundPlayer.correct(result.value);
          soundPlayer.completions(done.kinds);
          // Name it on screen when it's a combination, or a whole number.
          if (done.kinds.length > 1 || done.digit) {
            setBadge({ id: ++badgeId.current, kinds: done.kinds, digit: done.digit });
          }
        }
        if (result.completedBoard && timed) {
          // A new board is on its way; skip the animations for the old one.
          soundPlayer.cue("boardDone");
          setBoardDone((n) => (n ?? 0) + 1);
          return;
        }
        dispatch({ type: "guessResult", ...result, board: boardRef.current });
      }),
    [onGuessResult, timed]
  );

  // Save the result to this browser's stats once the race ends.
  useEffect(() => {
    if (phase !== "finished" || !room || !me) return;
    if (room.mode === "timed") {
      recordTimedRun(
        raceId,
        room.size,
        room.difficulty,
        room.durationMs,
        me.boardsCompleted,
        room.winnerId === me.id && room.players.length > 1
      );
    } else {
      recordRace(
        raceId,
        room.size,
        room.difficulty,
        room.winnerId === me.id ? me.finishedMs : null
      );
    }
  }, [phase, raceId, room, me]);

  // Game-flow sounds: 3-2-1, go, the result, and running out of lives.
  const countdownSeconds =
    phase === "countdown" && room?.startAt
      ? Math.max(1, Math.ceil((room.startAt - now) / 1000))
      : null;
  useEffect(() => {
    if (countdownSeconds !== null) soundPlayer.cue("tick");
  }, [countdownSeconds]);
  const prevPhase = useRef(phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (was === "countdown" && phase === "playing") soundPlayer.cue("go");
    if (was === "playing" && phase === "finished") {
      soundPlayer.cue(room?.winnerId === me?.id ? "win" : "finish");
    }
  }, [phase, room?.winnerId, me?.id]);
  const eliminated = !!me?.eliminated;
  useEffect(() => {
    if (eliminated) soundPlayer.cue("lose");
  }, [eliminated]);

  const [inspect, setInspect] = useState<InspectTarget | null>(null);
  const closeInspector = useCallback(() => setInspect(null), []);
  const openInspector = useCallback((cell: number, element: HTMLElement) => {
    const { top, left, bottom, right } = element.getBoundingClientRect();
    dispatch({ type: "focus", cell, board: boardRef.current });
    setInspect({ cell, rect: { top, left, bottom, right } });
  }, []);
  // A new board, or the game ending, closes the panel.
  useEffect(() => setInspect(null), [raceId, boardKey, phase]);

  const select = useCallback(
    (cell: number) => dispatch({ type: "select", cell, board: boardRef.current }),
    []
  );

  const enterDigit = useCallback(
    (digit: number) => {
      if (!board) return;
      const plan = planInput(state, board, canPlay);
      if (plan === "guess" && state.selected !== null) {
        dispatch({ type: "guessSent", cell: state.selected, value: digit });
        guess(state.selected, digit);
      } else if (plan === "note") {
        dispatch({ type: "toggleNote", digit });
      } else {
        dispatch({ type: "highlight", digit });
      }
    },
    [state, board, canPlay, guess]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "z") {
          event.preventDefault();
          dispatch({ type: "undo" });
        }
        return;
      }
      const { key } = event;
      if (key >= "1" && key <= String(geometry.size)) {
        enterDigit(Number(key));
      } else if (key === "Backspace" || key === "Delete" || key === "0") {
        dispatch({ type: "clearNotes" });
      } else if (key === "n" || key === "N" || key === " ") {
        event.preventDefault();
        dispatch({ type: "toggleNoteMode" });
      } else if (
        (key === "i" || key === "?") &&
        state.selected !== null &&
        room?.helper
      ) {
        const element = document.querySelector<HTMLElement>(
          `[data-cell="${state.selected}"]`
        );
        if (element) openInspector(state.selected, element);
      } else if (key === "Escape") {
        dispatch({ type: "deselect" });
      } else if (key in ARROWS) {
        event.preventDefault();
        const [dRow, dCol] = ARROWS[key];
        dispatch({ type: "move", dRow, dCol, board: boardRef.current });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterDigit, geometry.size, state.selected, openInspector, room?.helper]);

  if (!room || !self || !me) return null;

  const puzzle = self.puzzle;
  const winner = room.players.find((p) => p.id === room.winnerId);
  // Race mode counts up; timed mode counts down to the end.
  const clock = timed
    ? phase === "finished"
      ? 0
      : phase === "playing" && room.endsAt
      ? Math.max(0, room.endsAt - now)
      : room.durationMs
    : phase === "finished"
    ? winner?.finishedMs ?? null
    : room.startAt && phase === "playing"
    ? now - room.startAt
    : 0;
  const finalStretch =
    timed && phase === "playing" && clock !== null && clock <= FINAL_STRETCH_MS;
  const lockSeconds = locked ? Math.ceil((self.lockedUntil! - now) / 1000) : 0;
  const countdown = countdownSeconds;
  const opponents = room.players.filter((p) => p.id !== me.id);
  const maxLives = STARTING_LIVES[room.difficulty];
  const badgeLabel =
    badge && badgeText(badge, isJigsawSize(size) ? "Region" : "Box");

  return (
    <div className="race">
      <header className="race-bar">
        <button
          className="icon-btn"
          aria-label="Leave race"
          onClick={() => {
            if (phase === "finished" || window.confirm("Leave this race?")) {
              leaveLobby();
              navigate("/");
            }
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <MuteButton />
        <span className={`chip chip-${room.difficulty}`}>
          {room.difficulty}
          {size !== 9 && ` · ${size}×${size}`}
        </span>
        <span
          className={`race-timer${finalStretch ? " urgent" : ""}`}
          aria-label={timed ? "Time left" : "Time elapsed"}
        >
          {clock !== null ? formatTime(timed ? clock + 999 : clock) : "—"}
        </span>
        {timed ? (
          <span className="board-count" aria-label={`${boardNumber} boards done`}>
            <FontAwesomeIcon icon={faCheck} />
            {boardNumber}
            <span className="board-count-label">
              {boardNumber === 1 ? "board" : "boards"}
            </span>
          </span>
        ) : (
          <span className="hearts" aria-label={`${me.lives} lives left`}>
            {Array.from({ length: maxLives }, (_, i) => (
              <FontAwesomeIcon
                key={i}
                icon={faHeart}
                className={i < me.lives ? "heart" : "heart lost"}
              />
            ))}
          </span>
        )}
      </header>

      <RaceTrack
        players={room.players}
        cellCount={size * size}
        timed={timed}
        selfId={me.id}
        winnerId={room.winnerId}
      />

      <div className="race-body">
        <div className="race-main">
          <div className={`board-wrap${state.wrong ? " shake" : ""}`}>
            {board && puzzle ? (
              <Board
                board={board}
                givens={puzzle}
                state={state}
                notesVisible={state.noteMode && canPlay}
                onSelect={select}
                onInspect={room.helper ? openInspector : undefined}
              />
            ) : (
              <div className="board board-placeholder" />
            )}
            {badge && (
              <div
                key={badge.id}
                className={`combo-badge combo-${badge.kinds.length}`}
                aria-live="polite"
              >
                <strong>{badgeLabel!.title}</strong>
                <span>{badgeLabel!.detail}</span>
              </div>
            )}
            {countdown !== null && <Countdown seconds={countdown} />}
            {locked && phase === "playing" && (
              <div className="board-overlay locked">
                <strong>{lockSeconds}</strong>
                <span>Wrong number, locked for a moment</span>
              </div>
            )}
            {boardDone && (
              <div key={boardDone} className="board-overlay board-done">
                <FontAwesomeIcon icon={faCheck} className="board-done-icon" />
                <strong>Board {boardNumber} done!</strong>
                <span>Next one…</span>
              </div>
            )}
            {me.eliminated && phase === "playing" && (
              <div className="board-overlay out">
                <strong>Out of lives</strong>
                <span>Watch the others finish.</span>
              </div>
            )}
          </div>

          <div className="tools">
            <button
              className="tool"
              onClick={() => dispatch({ type: "undo" })}
              disabled={!state.history.length}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>Undo</span>
            </button>
            <button
              className="tool"
              onClick={() => dispatch({ type: "clearNotes" })}
            >
              <FontAwesomeIcon icon={faEraser} />
              <span>Erase</span>
            </button>
            <button
              className={`tool${state.noteMode ? " on" : ""}`}
              onClick={() => dispatch({ type: "toggleNoteMode" })}
              aria-pressed={state.noteMode}
            >
              <span className="tool-icon">
                <FontAwesomeIcon icon={faPencil} />
                <span className="tool-badge">{state.noteMode ? "ON" : "OFF"}</span>
              </span>
              <span>Notes</span>
            </button>
          </div>

          <NumberPad
            size={size}
            board={board ?? Array(size * size).fill(0)}
            highlight={state.highlight}
            noteMode={state.noteMode}
            onDigit={enterDigit}
          />
          <p className="hint">
            Keys: 1–{size} enter · N notes · arrows move · ⌫ erase · ⌘/Ctrl+Z undo
            {room.helper && " · right-click or I: what's missing"}
          </p>
        </div>

        {puzzle && opponents.length > 0 && (
          <aside className="rivals">
            <h3>Rivals</h3>
            {opponents.map((player) => (
              <OpponentBoard
                key={player.id}
                player={player}
                size={size}
                timed={timed}
              />
            ))}
          </aside>
        )}
      </div>

      {inspect && board && room.helper && (
        <CellInspector
          geometry={geometry}
          board={board}
          target={inspect}
          canPlay={canPlay && !(inspect.cell in state.pending)}
          onPick={(digit) => {
            if (board[inspect.cell] === 0) {
              dispatch({ type: "guessSent", cell: inspect.cell, value: digit });
              guess(inspect.cell, digit);
            }
            closeInspector();
          }}
          onPencil={(mask) => {
            dispatch({ type: "setNotes", cell: inspect.cell, mask });
            closeInspector();
          }}
          onClose={closeInspector}
        />
      )}
      {phase === "finished" && <Results />}
    </div>
  );
};

export default Race;
