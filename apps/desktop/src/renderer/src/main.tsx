import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";

// ─── Placeholder pages ───────────────────────────────────────────────────────
// Ces pages seront remplacées lors de la refonte.
// Référence : docs/ux/ pour les wireframes, composants et design tokens.

function MainPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-base">
      <div className="text-center space-y-3">
        <div className="text-4xl">⛪</div>
        <h1 className="text-xl font-semibold text-text-primary">Church Presenter</h1>
        <p className="text-text-secondary text-sm">Refonte UI en cours — Mode Préparation</p>
        <p className="text-text-muted text-xs font-mono">feat/frontend-rewrite</p>
      </div>
    </div>
  );
}

function ProjectionPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="text-center space-y-2">
        <p className="text-white text-lg">Écran de projection</p>
        <p className="text-zinc-500 text-sm">En cours de refonte</p>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Full-screen projection window, no shell */}
        <Route path="/projection" element={<ProjectionPage />} />

        {/* Main app */}
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
