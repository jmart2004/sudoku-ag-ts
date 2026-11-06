// Differences between the website and the Android app. The app's page is
// served from the device, so anything that points at the game server or at a
// shareable link uses the site's address instead of window.location.

import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();

// Where the website (and its game server) lives, with no trailing slash.
export const siteOrigin = (): string =>
  isNativeApp && process.env.REACT_APP_SITE_URL
    ? process.env.REACT_APP_SITE_URL.replace(/\/+$/, "")
    : window.location.origin;

export const inviteLinkFor = (code: string) => `${siteOrigin()}/room/${code}`;
