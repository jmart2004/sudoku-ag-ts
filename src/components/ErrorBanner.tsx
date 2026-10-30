import React, { useEffect } from "react";
import { useGame } from "../game/GameContext";

const ErrorBanner: React.FC = () => {
  const { error, clearError } = useGame();

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(clearError, 4000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);

  if (!error) return null;
  return (
    <div className="error-banner" role="alert" onClick={clearError}>
      {error}
    </div>
  );
};

export default ErrorBanner;
