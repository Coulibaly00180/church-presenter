import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import { AppShell } from "./layout/AppShell";
import { RegiePage } from "./pages/RegiePage";
import { PlanPage } from "./pages/PlanPage";
import { SongsPage } from "./pages/SongsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BiblePage } from "./pages/BiblePage";
import { ProjectionPage } from "./pages/ProjectionPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { ErrorBoundary } from "./ui/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          {/* Full-screen window, no shell */}
          <Route path="/projection" element={<ProjectionPage />} />

          {/* Main app */}
          <Route element={<AppShell />}>
            <Route path="/regie" element={<RegiePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/bible" element={<BiblePage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/" element={<Navigate to="/regie" replace />} />
            <Route path="*" element={<Navigate to="/regie" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

// logs + fallback global (trÃ¨s utile en Electron)
window.addEventListener("error", (e) => {
  console.error("window error", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("unhandledrejection", e.reason);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<pre>Root element #root not found.</pre>";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
