import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { RegiePage } from "./pages/RegiePage";
import { PlanPage } from "./pages/PlanPage";
import { SongsPage } from "./pages/SongsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BiblePage } from "./pages/BiblePage";
import { ProjectionPage } from "./pages/ProjectionPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";

function App() {
  return (
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
  );
}

// logs + fallback global (très utile en Electron)
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("window error", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
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
