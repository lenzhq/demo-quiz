import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import GamePage from "./pages/GamePage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <GamePage />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
);
