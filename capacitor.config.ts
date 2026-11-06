import type { CapacitorConfig } from "@capacitor/cli";

// The Android app bundles the React build and talks to the same game server
// as the website (REACT_APP_SITE_URL at build time), so app and browser
// players share lobbies.
const config: CapacitorConfig = {
  appId: "com.sudokurace.app",
  appName: "Sudoku Race",
  webDir: "build",
  android: {
    // Lets a debug build reach a game server on the local network over ws://.
    allowMixedContent: process.env.REACT_APP_SITE_URL?.startsWith("http:"),
    // Android 15 draws apps edge to edge; keep the page clear of the bars.
    adjustMarginsForEdgeToEdge: "auto",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
