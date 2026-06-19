import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";
import { useGame } from "./state/store";
import "./styles/global.css";

// Dev-хук для отладки/тестов из консоли: window.__game.getState()
if (import.meta.env.DEV) {
  (window as unknown as { __game: typeof useGame }).__game = useGame;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
