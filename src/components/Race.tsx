// The race itself: your board, the track, rivals' boards, countdown and results.

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEraser,
  faHeart,
  faPencil,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import {
  boardReducer,
  initialBoardState,
  planInput,
} from "../game/boardReducer";
import { formatTime, recordRace } from "../utility/Stats";
import { STARTING_LIVES } from "../shared/engine";
import Board from "./Board";
import NumberPad from "./NumberPad";
import RaceTrack from "./RaceTrack";
import OpponentBoard from "./OpponentBoard";
import Countdown from "./Countdown";
import Results from "./Results";

const FEEDBACK_MS = 800;
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
  const boardRef = useRef<number[]>([]);

  const board = self?.board ?? null;
  boardRef.current = board ?? [];
  const me = room?.players.find((p) => p.id === self?.playerId);
  const phase = room?.phase;
  const canPlay = phase === "playing" && !!me && !me.eliminated && !!board;

  // Fresh notes and selection for each new race.
  const raceId = room ? `${room.code}-${room.startAt}` : "";
  useEffect(() => dispatch({ type: "reset" }), [raceId]);

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
      () => dispatch({ type: "clearFeedback" }),
      FEEDBACK_MS
    );
    return () => window.clearTimeout(timer);
  }, [state.feedbackId]);

  useEffect(
    () =>
      onGuessResult((result) =>
        dispatch({ type: "guessResult", ...result, board: boardRef.current })
      ),
    [onGuessResult]
  );

  // Save the result to this browser's stats once the race ends.
  useEffect(() => {
    if (phase !== "finished" || !room || !me) return;
    recordRace(
      raceId,
      room.difficulty,
      room.winnerId === me.id ? me.finishedMs : null
    );
  }, [phase, raceId, room, me]);

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
      if (key >= "1" && key <= "9") {
        enterDigit(Number(key));
      } else if (key === "Backspace" || key === "Delete" || key === "0") {
        dispatch({ type: "clearNotes" });
      } else if (key === "n" || key === "N" || key === " ") {
        event.preventDefault();
        dispatch({ type: "toggleNoteMode" });
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
  }, [enterDigit]);

  if (!room || !self || !me) return null;

  const puzzle = room.puzzle;
  const toFill = puzzle ? puzzle.filter((v) => v === 0).length : 0;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const elapsed =
    phase === "finished"
      ? winner?.finishedMs ?? null
      : room.startAt && phase === "playing"
      ? now - room.startAt
      : 0;
  const countdown =
    phase === "countdown" && room.startAt
      ? Math.max(1, Math.ceil((room.startAt - now) / 1000))
      : null;
  const opponents = room.players.filter((p) => p.id !== me.id);
  const maxLives = STARTING_LIVES[room.difficulty];

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
        <span className={`chip chip-${room.difficulty}`}>{room.difficulty}</span>
        <span className="race-timer">
          {elapsed !== null ? formatTime(elapsed) : "—"}
        </span>
        <span className="hearts" aria-label={`${me.lives} lives left`}>
          {Array.from({ length: maxLives }, (_, i) => (
            <FontAwesomeIcon
              key={i}
              icon={faHeart}
              className={i < me.lives ? "heart" : "heart lost"}
            />
          ))}
        </span>
      </header>

      <RaceTrack
        players={room.players}
        toFill={toFill}
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
              />
            ) : (
              <div className="board board-placeholder" />
            )}
            {countdown !== null && <Countdown seconds={countdown} />}
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
            board={board ?? Array(81).fill(0)}
            highlight={state.highlight}
            noteMode={state.noteMode}
            onDigit={enterDigit}
          />
          <p className="hint">
            Keys: 1–9 enter · N notes · arrows move · ⌫ erase · ⌘/Ctrl+Z undo
          </p>
        </div>

        {puzzle && opponents.length > 0 && (
          <aside className="rivals">
            <h3>Rivals</h3>
            {opponents.map((player) => (
              <OpponentBoard key={player.id} player={player} puzzle={puzzle} />
            ))}
          </aside>
        )}
      </div>

      {phase === "finished" && <Results />}
    </div>
  );
};

export default Race;
