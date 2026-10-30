// The race itself: your board, opponents' progress, countdown and results.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEraser,
  faHeart,
  faPencil,
} from "@fortawesome/free-solid-svg-icons";
import { useGame } from "../game/GameContext";
import { peersOf } from "../shared/sudoku";
import { formatTime, recordRace } from "../utility/Stats";
import Board, { WrongGuess } from "./Board";
import PlayerCard from "./PlayerCard";
import Results from "./Results";
import ErrorBanner from "./ErrorBanner";

const emptyNotes = () => Array<number>(81).fill(0);

const Race: React.FC = () => {
  const { room, self, clockOffset, guess, onGuessResult, leaveLobby } =
    useGame();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [notes, setNotes] = useState(emptyNotes);
  const [highlightValue, setHighlightValue] = useState<number | null>(null);
  const [wrong, setWrong] = useState<WrongGuess | null>(null);
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const pending = useRef(new Set<number>());
  const boardRef = useRef<number[] | null>(null);

  const board = self?.board ?? null;
  boardRef.current = board;
  const me = room?.players.find((p) => p.id === self?.playerId);
  const phase = room?.phase;
  const canPlay = phase === "playing" && !!me && !me.eliminated && !!board;

  // Fresh notes for each new race.
  const raceId = room ? `${room.code}-${room.startAt}` : "";
  useEffect(() => {
    setNotes(emptyNotes());
    setSelected(null);
    setHighlightValue(null);
    pending.current.clear();
  }, [raceId]);

  useEffect(() => {
    if (phase === "finished") return;
    const timer = window.setInterval(
      () => setNow(Date.now() + clockOffset),
      250
    );
    return () => window.clearInterval(timer);
  }, [phase, clockOffset]);

  useEffect(() => {
    if (!wrong) return;
    const timer = window.setTimeout(() => setWrong(null), 900);
    return () => window.clearTimeout(timer);
  }, [wrong]);

  useEffect(
    () =>
      onGuessResult(({ cell, value, correct }) => {
        pending.current.delete(cell);
        if (correct) {
          // Clear this cell's notes and the now-impossible notes around it.
          setNotes((prev) => {
            const next = [...prev];
            next[cell] = 0;
            for (const peer of peersOf(cell)) next[peer] &= ~(1 << value);
            return next;
          });
          setHighlightValue(value);
        } else {
          const current = boardRef.current ?? [];
          setWrong({
            cell,
            value,
            conflicts: peersOf(cell).filter((peer) => current[peer] === value),
          });
        }
      }),
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

  const selectCell = useCallback(
    (cell: number) => {
      if (selected === cell) {
        setSelected(null);
        setHighlightValue(null);
        return;
      }
      setSelected(cell);
      setHighlightValue(board && board[cell] !== 0 ? board[cell] : null);
    },
    [selected, board]
  );

  const enterValue = useCallback(
    (value: number) => {
      if (!board || selected === null || board[selected] !== 0 || !canPlay) {
        setHighlightValue((prev) => (prev === value ? null : value));
        return;
      }
      if (noteMode) {
        setNotes((prev) => {
          const next = [...prev];
          next[selected] ^= 1 << value;
          return next;
        });
        return;
      }
      if (pending.current.has(selected)) return;
      pending.current.add(selected);
      guess(selected, value);
    },
    [board, selected, canPlay, noteMode, guess]
  );

  const clearNotes = useCallback(() => {
    if (selected === null) return;
    setNotes((prev) => {
      const next = [...prev];
      next[selected] = 0;
      return next;
    });
  }, [selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key;
      if (key >= "1" && key <= "9") {
        enterValue(Number(key));
      } else if (key === "Backspace" || key === "Delete" || key === "0") {
        clearNotes();
      } else if (key === "n" || key === "N") {
        setNoteMode((prev) => !prev);
      } else if (key === "Escape") {
        setSelected(null);
        setHighlightValue(null);
      } else if (key.startsWith("Arrow")) {
        event.preventDefault();
        const start = selected ?? 40;
        const row = Math.floor(start / 9);
        const col = start % 9;
        const moves: Record<string, [number, number]> = {
          ArrowUp: [8, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, 8],
          ArrowRight: [0, 1],
        };
        const [dr, dc] = moves[key] ?? [0, 0];
        const cell = ((row + dr) % 9) * 9 + ((col + dc) % 9);
        setSelected(cell);
        setHighlightValue(board && board[cell] ? board[cell] : null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterValue, clearNotes, selected, board]);

  if (!room || !self || !me) return null;

  const puzzle = room.puzzle;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const elapsed =
    phase === "finished"
      ? winner?.finishedMs ?? null
      : room.startAt
      ? now - room.startAt
      : null;
  const countdown =
    phase === "countdown" && room.startAt
      ? Math.max(1, Math.ceil((room.startAt - now) / 1000))
      : null;
  const remaining = Array.from({ length: 10 }, (_, n) =>
    board ? 9 - board.filter((v) => v === n).length : 9
  );
  const opponents = room.players.filter((p) => p.id !== me.id);

  return (
    <div className="page race">
      <ErrorBanner />
      <header className="race-header">
        <button
          className="btn subtle small"
          onClick={() => {
            if (phase === "finished" || window.confirm("Leave this race?")) {
              leaveLobby();
              navigate("/");
            }
          }}
        >
          Leave
        </button>
        <span className="tag big">{room.difficulty}</span>
        <span className="timer">
          {elapsed !== null && elapsed >= 0 ? formatTime(elapsed) : "0:00"}
        </span>
        <span className="lives" title="Lives left">
          <FontAwesomeIcon icon={faHeart} className="heart-icon" />
          {me.lives}
        </span>
      </header>

      <div className="race-layout">
        <div className="race-main">
          <div className="board-wrap">
            {board && puzzle ? (
              <Board
                board={board}
                givens={puzzle}
                notes={notes}
                selected={selected}
                highlightValue={highlightValue}
                wrong={wrong}
                showNotes={noteMode && canPlay}
                onSelect={selectCell}
              />
            ) : (
              <div className="board board-placeholder" />
            )}
            {countdown !== null && (
              <div className="board-overlay countdown">{countdown}</div>
            )}
            {me.eliminated && phase === "playing" && (
              <div className="board-overlay out">
                Out of lives!
                <small>Watch the others finish.</small>
              </div>
            )}
          </div>

          <div className="controls">
            <button
              className={`btn small${noteMode ? " primary" : ""}`}
              onClick={() => setNoteMode(!noteMode)}
              aria-pressed={noteMode}
            >
              <FontAwesomeIcon icon={faPencil} /> Notes {noteMode ? "on" : "off"}
            </button>
            <button className="btn small" onClick={clearNotes}>
              <FontAwesomeIcon icon={faEraser} /> Clear notes
            </button>
          </div>

          <div className="number-pad">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`pad-key${highlightValue === n ? " highlighted" : ""}`}
                disabled={remaining[n] === 0}
                onClick={() => enterValue(n)}
              >
                <span className="pad-number">{n}</span>
                <span className="pad-count">{remaining[n]}</span>
              </button>
            ))}
          </div>
        </div>

        {puzzle && (
          <aside className="opponents">
            {opponents.length === 0 && (
              <p className="muted">Solo practice — no opponents.</p>
            )}
            {opponents.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                puzzle={puzzle}
                isSelf={false}
                isWinner={player.id === room.winnerId}
              />
            ))}
          </aside>
        )}
      </div>

      {phase === "finished" && <Results />}
    </div>
  );
};

export default Race;
