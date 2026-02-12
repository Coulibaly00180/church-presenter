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
    <div className="cp-shell">
      <aside className="panel cp-shell-sidebar">
        <div className="cp-shell-brand">
          <div>
            <div className="cp-shell-title">Church Presenter</div>
            <div className="cp-shell-subtitle">Regie / Projection</div>
          </div>
          <span className={cls("badge", projOpen ? "cp-badge-open" : "cp-badge-closed")} style={{ fontSize: 11 }}>
            {projOpen ? "Projection ouverte" : "Projection fermee"}
          </span>
        </div>

        <div className="panel cp-panel cp-panel-soft cp-shell-projection-card">
          <div className="cp-page-header" style={{ alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Projection</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Ctrl+P pour basculer</div>
          </div>
          <button
            className="btn-primary"
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
            style={{ width: "100%", marginTop: 10 }}
          >
            {projOpen ? "Fermer la projection" : "Ouvrir la projection"}
          </button>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.4 }}>
            B / W / R pour noir / blanc / normal. Fleches pour naviguer en live.
          </div>
        </div>

        <nav className="cp-nav-list">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => cls("cp-nav-link", isActive && "is-active")}>
              <div className="cp-nav-label">{it.label}</div>
              <div className="cp-nav-desc">{it.desc}</div>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="cp-shell-main">
        <Outlet />
      </main>
    </div>
  );
}
