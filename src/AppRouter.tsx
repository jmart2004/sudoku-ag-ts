import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GameProvider } from "./game/GameContext";
import AppShell from "./components/AppShell";
import { SettingsProvider } from "./components/SettingsDialog";
import Toasts from "./components/Toasts";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import StatsPage from "./pages/StatsPage";

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
      </Router>
    </GameProvider>
  );
};

export default App;
