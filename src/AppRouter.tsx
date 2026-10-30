import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GameProvider } from "./game/GameContext";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import StatsPage from "./pages/StatsPage";

const App: React.FC = () => {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </Router>
    </GameProvider>
  );
};

export default App;
