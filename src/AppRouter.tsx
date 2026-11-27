import React from "react";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { GameProvider } from "./game/GameContext";
import AppShell from "./components/AppShell";
import { SettingsProvider } from "./components/SettingsDialog";
import Toasts from "./components/Toasts";
import NativeBridge from "./components/NativeBridge";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import StatsPage from "./pages/StatsPage";
import { isOffline } from "./platform";

// The offline build may be opened straight from a file, where only the hash
// part of the address can change.
const Router = isOffline ? HashRouter : BrowserRouter;

const App: React.FC = () => {
  return (
    <GameProvider>
      <Router>
        <SettingsProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:code" element={<RoomPage />} />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </AppShell>
        </SettingsProvider>
        <Toasts />
        <NativeBridge />
      </Router>
    </GameProvider>
  );
};

export default App;
