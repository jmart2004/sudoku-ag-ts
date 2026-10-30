// Owns the websocket to the game server and exposes the current room to the app.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClientMessage,
  RoomView,
  SelfView,
  ServerMessage,
} from "../shared/protocol";
import { Difficulty } from "../shared/engine";

interface Session {
  code: string;
  playerId: string;
  token: string;
}

export interface GuessResult {
  cell: number;
  value: number;
  correct: boolean;
}

type Status = "connecting" | "open" | "closed";

interface GameContextProps {
  status: Status;
  room: RoomView | null;
  self: SelfView | null;
  // Server clock minus local clock, for timing the race.
  clockOffset: number;
  error: string | null;
  // Code of a lobby we were in but lost our seat for.
  lostSeatCode: string | null;
  // True while we're trying to get back into a lobby after a refresh.
  rejoining: boolean;
  clearError: () => void;
  createLobby: (name: string, difficulty: Difficulty) => void;
  joinLobby: (code: string, name: string) => void;
  leaveLobby: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  startRace: () => void;
  guess: (cell: number, value: number) => void;
  backToLobby: () => void;
  onGuessResult: (listener: (result: GuessResult) => void) => () => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

const SESSION_KEY = "sudokuSession";

const loadSession = (): Session | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (session: Session | null) => {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage unavailable; refreshing will just lose the seat.
  }
};

const socketUrl = () => {
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // In development the React dev server and the game server run separately.
  const host =
    process.env.NODE_ENV === "development"
      ? `${window.location.hostname}:3001`
      : window.location.host;
  return `${protocol}//${host}/ws`;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<Status>("connecting");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [self, setSelf] = useState<SelfView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lostSeatCode, setLostSeatCode] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(() => loadSession() !== null);

  const socketRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const sessionRef = useRef<Session | null>(loadSession());
  const guessListeners = useRef(new Set<(result: GuessResult) => void>());

  useEffect(() => {
    let disposed = false;
    let retryTimer: number | undefined;
    let attempts = 0;

    const handleMessage = (msg: ServerMessage) => {
      switch (msg.type) {
        case "joined":
          sessionRef.current = {
            code: msg.code,
            playerId: msg.playerId,
            token: msg.token,
          };
          saveSession(sessionRef.current);
          setLostSeatCode(null);
          setRejoining(false);
          break;
        case "state":
          setRoom(msg.room);
          setSelf(msg.self);
          setClockOffset(msg.serverNow - Date.now());
          break;
        case "guessResult":
          guessListeners.current.forEach((listener) => listener(msg));
          break;
        case "error":
          if (msg.fatal) {
            setLostSeatCode(sessionRef.current?.code ?? null);
            sessionRef.current = null;
            saveSession(null);
            setRoom(null);
            setSelf(null);
            setRejoining(false);
          } else {
            setError(msg.message);
          }
          break;
      }
    };

    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(socketUrl());
      socketRef.current = socket;
      socket.onopen = () => {
        attempts = 0;
        setStatus("open");
        const session = sessionRef.current;
        if (session) {
          socket.send(JSON.stringify({ type: "rejoin", ...session }));
        }
        queueRef.current
          .splice(0)
          .forEach((msg) => socket.send(JSON.stringify(msg)));
      };
      socket.onmessage = (event) => handleMessage(JSON.parse(event.data));
      socket.onclose = () => {
        if (disposed) return;
        setStatus("closed");
        attempts++;
        retryTimer = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** attempts, 10000)
        );
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const leaveLobby = useCallback(() => {
    send({ type: "leave" });
    sessionRef.current = null;
    saveSession(null);
    setRoom(null);
    setSelf(null);
  }, [send]);

  const onGuessResult = useCallback(
    (listener: (result: GuessResult) => void) => {
      guessListeners.current.add(listener);
      return () => {
        guessListeners.current.delete(listener);
      };
    },
    []
  );

  const value = useMemo<GameContextProps>(
    () => ({
      status,
      room,
      self,
      clockOffset,
      error,
      lostSeatCode,
      rejoining,
      clearError: () => setError(null),
      createLobby: (name, difficulty) =>
        send({ type: "create", name, difficulty }),
      joinLobby: (code, name) =>
        send({ type: "join", code: code.trim().toUpperCase(), name }),
      leaveLobby,
      setDifficulty: (difficulty) => send({ type: "setDifficulty", difficulty }),
      startRace: () => send({ type: "start" }),
      guess: (cell, value) => send({ type: "guess", cell, value }),
      backToLobby: () => send({ type: "backToLobby" }),
      onGuessResult,
    }),
    [
      status,
      room,
      self,
      clockOffset,
      error,
      lostSeatCode,
      rejoining,
      send,
      leaveLobby,
      onGuessResult,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextProps => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
