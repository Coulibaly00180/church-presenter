import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

export function AppShell() {
  const location = useLocation();
  const [projOpen, setProjOpen] = useState(false);

  const canUse = !!window.cp?.projectionWindow;

  useEffect(() => {
    if (!canUse) return;

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const off = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p?.isOpen));
    return () => off?.();
  }, [canUse]);

  // Raccourci global : Ctrl+P => ouvrir/fermer projection
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
      { to: "/regie", label: "Régie (Live)", desc: "Contrôle, raccourcis, noir/blanc, projection" },
      { to: "/plan", label: "Plan", desc: "Déroulé du culte : items, ordre, drag&drop" },
      { to: "/bible", label: "Bible", desc: "Rechercher un passage, ajouter au plan, projeter" },
      { to: "/songs", label: "Chants", desc: "Bibliothèque (CRUD) + recherche" },
      { to: "/calendar", label: "Calendrier", desc: "Préparer en avance (plans par date)" },
      { to: "/history", label: "Historique", desc: "Plans passés, duplication ensuite" },
    ],
    []
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          borderRight: "1px solid #e6e6e6",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#fafafa",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.2 }}>Church Presenter</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>Régie + Projection</div>
        </div>

        <div
          style={{
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            padding: 12,
            background: "white",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Projection</div>
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #e6e6e6",
                background: projOpen ? "#e8fff1" : "#fff5f5",
              }}
            >
              {projOpen ? "OUVERTE" : "FERMÉE"}
            </span>
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
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {projOpen ? "Fermer projection" : "Ouvrir projection"}
          </button>

          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
            <div><b>Ctrl+P</b> : ouvrir/fermer</div>
            <div><b>B/W/R</b> : noir/blanc/normal (dans Régie/Plan)</div>
            <div><b>←/→</b> : précédent/suivant (Plan Live)</div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cls(
                  "nav",
                  isActive && "navActive"
                )
              }
              style={({ isActive }) => ({
                display: "block",
                padding: 12,
                borderRadius: 12,
                textDecoration: "none",
                color: "#111",
                border: "1px solid " + (isActive ? "#111" : "#e6e6e6"),
                background: isActive ? "white" : "transparent",
              })}
            >
              <div style={{ fontWeight: 900 }}>{it.label}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{it.desc}</div>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.65 }}>
          {location.pathname === "/plan" ? "Astuce : active “Plan Live” pour NEXT/PREV." : location.pathname === "/bible" ? "Astuce : tape une référence (ex: Jean 3:16-18) puis ajoute au plan." : " "}
        </div>
      </aside>

      {/* Main */}
      <main style={{ height: "100vh", overflow: "auto", background: "white" }}>
        <Outlet />
      </main>
    </div>
  );
}
