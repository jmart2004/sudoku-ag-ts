// The icon a player shows on their avatar instead of their initial. The
// choice is saved in this browser and sent to the server with each lobby.

import { useEffect, useState } from "react";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faCat,
  faChessKnight,
  faCrow,
  faDog,
  faDragon,
  faFire,
  faFish,
  faFrog,
  faGem,
  faGhost,
  faHippo,
  faLeaf,
  faMoon,
  faOtter,
  faRobot,
  faRocket,
  faSnowflake,
  faSpider,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { PlayerIcon } from "../shared/protocol";

export const ICON_ART: Record<PlayerIcon, IconDefinition> = {
  cat: faCat,
  dog: faDog,
  dragon: faDragon,
  ghost: faGhost,
  rocket: faRocket,
  robot: faRobot,
  crow: faCrow,
  fish: faFish,
  frog: faFrog,
  hippo: faHippo,
  otter: faOtter,
  spider: faSpider,
  bolt: faBolt,
  fire: faFire,
  star: faStar,
  leaf: faLeaf,
  moon: faMoon,
  snowflake: faSnowflake,
  knight: faChessKnight,
  gem: faGem,
};

const ICON_KEY = "sudokuIcon";

const load = (): string => {
  try {
    const value = localStorage.getItem(ICON_KEY) ?? "";
    return value in ICON_ART ? value : "";
  } catch {
    return "";
  }
};

let current = load();
const listeners = new Set<() => void>();

// "" means no icon: the avatar shows the player's initial.
export const getSavedIcon = () => current;

export function saveIcon(icon: string) {
  current = icon in ICON_ART ? icon : "";
  try {
    localStorage.setItem(ICON_KEY, current);
  } catch {}
  listeners.forEach((l) => l());
}

export function useSavedIcon(): string {
  const [icon, setIcon] = useState(current);
  useEffect(() => {
    const listener = () => setIcon(current);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return icon;
}
