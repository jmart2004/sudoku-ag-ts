// Light/dark theme, following the system until the player picks one.

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "sudokuTheme";

const systemTheme = (): Theme =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const savedTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

// One shared value, so every component showing the theme stays in sync.
let current: Theme = savedTheme() ?? systemTheme();
if (savedTheme()) document.documentElement.dataset.theme = current;
const listeners = new Set<() => void>();

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  const [theme, setLocal] = useState(current);
  useEffect(() => {
    const listener = () => setLocal(current);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return theme;
}
