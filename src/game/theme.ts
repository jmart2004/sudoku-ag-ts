// The site's colour themes. The choice is saved in this browser; "system"
// follows the device between Daylight and Midnight.

import { useEffect, useState } from "react";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGamepad,
  faMoon,
  faMountainSun,
  faNewspaper,
  faSpa,
  faSun,
  faTree,
  faWater,
} from "@fortawesome/free-solid-svg-icons";

export interface ThemeInfo {
  // Also the value of <html data-theme>, which index.css keys its tokens on.
  id: string;
  name: string;
  blurb: string;
  icon: IconDefinition;
  dark: boolean;
  // Page background, for the phone's status bar and browser chrome.
  bg: string;
  // Surface, accent and a second accent, for the preview in the picker.
  preview: [string, string, string];
}

// To add a theme: list it here and give it a `:root[data-theme="<id>"]`
// block in index.css that sets every colour token.
export const THEMES: ThemeInfo[] = [
  {
    id: "light",
    name: "Daylight",
    blurb: "Clean and bright",
    icon: faSun,
    dark: false,
    bg: "#f5f6fb",
    preview: ["#ffffff", "#6366f1", "#d946ef"],
  },
  {
    id: "dark",
    name: "Midnight",
    blurb: "Easy on the eyes",
    icon: faMoon,
    dark: true,
    bg: "#0b0f1a",
    preview: ["#121829", "#818cf8", "#e879f9"],
  },
  {
    id: "paper",
    name: "Newsprint",
    blurb: "The back page puzzle",
    icon: faNewspaper,
    dark: false,
    bg: "#f3ead7",
    preview: ["#fbf6ea", "#1f1a14", "#b3261e"],
  },
  {
    id: "neon",
    name: "Arcade",
    blurb: "Insert coin",
    icon: faGamepad,
    dark: true,
    bg: "#0a0418",
    preview: ["#150a2e", "#ff3df2", "#22e4ff"],
  },
  {
    id: "sakura",
    name: "Sakura",
    blurb: "Soft spring pastels",
    icon: faSpa,
    dark: false,
    bg: "#fff3f6",
    preview: ["#ffffff", "#e8548c", "#a78bfa"],
  },
  {
    id: "forest",
    name: "Forest",
    blurb: "Moss, pine and amber",
    icon: faTree,
    dark: true,
    bg: "#0c1712",
    preview: ["#13231b", "#f2b544", "#6fcf97"],
  },
  {
    id: "lagoon",
    name: "Lagoon",
    blurb: "Cool tropical water",
    icon: faWater,
    dark: false,
    bg: "#ecf8f7",
    preview: ["#ffffff", "#0d9488", "#0ea5e9"],
  },
  {
    id: "sunset",
    name: "Sunset",
    blurb: "Dusk over the dunes",
    icon: faMountainSun,
    dark: true,
    bg: "#1a0f24",
    preview: ["#27162f", "#ff8a4c", "#ff4d8d"],
  },
];

export type ThemeChoice = "system" | string;

const THEME_KEY = "sudokuTheme";
const byId = (id: string | null) => THEMES.find((t) => t.id === id);

const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)");

const savedChoice = (): ThemeChoice => {
  try {
    return byId(localStorage.getItem(THEME_KEY))?.id ?? "system";
  } catch {
    return "system";
  }
};

const resolve = (choice: ThemeChoice): ThemeInfo =>
  byId(choice) ?? byId(systemDark?.matches ? "dark" : "light")!;

// One shared value, so every component showing the theme stays in sync.
let choice = savedChoice();
let current = resolve(choice);
const listeners = new Set<() => void>();

const apply = () => {
  current = resolve(choice);
  document.documentElement.dataset.theme = current.id;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", current.bg);
  listeners.forEach((l) => l());
};
apply();
systemDark?.addEventListener?.("change", () => choice === "system" && apply());

export function setTheme(next: ThemeChoice) {
  choice = byId(next)?.id ?? "system";
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  apply();
}

// The theme in use, and what the player picked ("system" or a theme id).
export function useTheme(): { theme: ThemeInfo; choice: ThemeChoice } {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { theme: current, choice };
}
