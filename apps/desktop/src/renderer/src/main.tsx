import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";

import { MainPage } from "./pages/MainPage";
import { ProjectionPage } from "./pages/ProjectionPage";

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Full-screen projection window, no shell */}
        <Route path="/projection" element={<ProjectionPage />} />

        {/* Main app — Mode Préparation */}
        <Route path="/" element={<MainPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

// ─── Global error handlers ───────────────────────────────────────────────────

window.addEventListener("error", (e) => {
  console.error("window error", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("unhandledrejection", e.reason);
});

// ─── Mount ───────────────────────────────────────────────────────────────────

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
