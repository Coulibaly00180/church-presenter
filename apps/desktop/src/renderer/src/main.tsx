import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { RegiePage } from "./pages/RegiePage";
import { ProjectionPage } from "./pages/ProjectionPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/regie" element={<RegiePage />} />
        <Route path="/projection" element={<ProjectionPage />} />
        <Route path="*" element={<Navigate to="/regie" replace />} />
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
