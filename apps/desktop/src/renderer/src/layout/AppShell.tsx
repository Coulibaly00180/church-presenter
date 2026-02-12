import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

export function AppShell() {
  useLocation(); // keep for potential future route-based effects
  const [projOpen, setProjOpen] = useState(false);

  const canUse = !!window.cp?.projectionWindow;

  useEffect(() => {
    if (!canUse) return;

    window.cp.projectionWindow.isOpen().then((r) => setProjOpen(!!r?.isOpen));
    const off = window.cp.projectionWindow.onWindowState((p) => setProjOpen(!!p?.isOpen));
    return () => off?.();
  }, [canUse]);

  // Ctrl+P toggles projection window
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if (!canUse) return;
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (projOpen) {
          const r = await window.cp.projectionWindow.close();
          setProjOpen(!!r?.isOpen);
        } else {
          const r = await window.cp.projectionWindow.open();
          setProjOpen(!!r?.isOpen);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUse, projOpen]);

  const items = useMemo(
    () => [
      { to: "/regie", label: "Regie (Live)", desc: "Controle, raccourcis, noir/blanc, projection" },
      { to: "/plan", label: "Plan", desc: "Deroule du culte, ordre, drag & drop" },
      { to: "/bible", label: "Bible", desc: "Recherche, ajout au plan, projection" },
      { to: "/songs", label: "Chants", desc: "Bibliotheque, recherche, blocs" },
      { to: "/announcements", label: "Annonces", desc: "PDF importes + annonces texte" },
      { to: "/calendar", label: "Calendrier", desc: "Plans par date, preparation" },
      { to: "/history", label: "Historique", desc: "Plans passes, duplication" },
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 18,
        padding: 18,
      }}
    >
      <aside className="panel" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Church Presenter</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>Regie • Projection</div>
          </div>
          <span
            className="badge"
            style={{
              background: projOpen ? "#e0f2fe" : "#fee2e2",
              color: projOpen ? "#075985" : "#991b1b",
              fontSize: 11,
            }}
          >
            {projOpen ? "Projection ouverte" : "Projection fermee"}
          </span>
        </div>

        <div
          className="panel"
          style={{
            padding: 12,
            boxShadow: "none",
            background: "#f8fafc",
            borderStyle: "dashed",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Projection</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Ctrl+P pour basculer</div>
          </div>
          <button
            disabled={!canUse}
            onClick={async () => {
              if (!canUse) return;
              if (projOpen) {
                const r = await window.cp.projectionWindow.close();
                setProjOpen(!!r?.isOpen);
              } else {
                const r = await window.cp.projectionWindow.open();
                setProjOpen(!!r?.isOpen);
              }
            }}
            style={{
              width: "100%",
              marginTop: 10,
              background: "var(--primary)",
              color: "white",
              border: "none",
            }}
          >
            {projOpen ? "Fermer la projection" : "Ouvrir la projection"}
          </button>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.4 }}>
            B / W / R pour noir / blanc / normal — Fleches pour naviguer en live.
          </div>
        </div>

        <nav style={{ display: "grid", gap: 10 }}>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => cls(isActive && "navActive")}
              style={({ isActive }) => ({
                display: "block",
                padding: 12,
                borderRadius: 12,
                textDecoration: "none",
                color: "#0f172a",
                border: "1px solid " + (isActive ? "var(--primary)" : "var(--border)"),
                background: isActive ? "#eef2ff" : "#fff",
                fontWeight: 700,
                boxShadow: isActive ? "0 8px 20px rgba(37,99,235,0.15)" : "var(--shadow)",
              })}
            >
              <div style={{ fontSize: 15 }}>{it.label}</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>{it.desc}</div>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main style={{ minHeight: "100vh", overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
