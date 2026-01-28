import React, { useEffect, useMemo, useState } from "react";

export function RegiePage() {
  const [title, setTitle] = useState("Bienvenue");
  const [body, setBody] = useState("Tape ton texte ici, puis clique Afficher.");
  const [state, setState] = useState<any>(null);
  const [projOpen, setProjOpen] = useState<boolean>(false);

  useEffect(() => {
    window.cp.projection.getState().then(setState);
    const offState = window.cp.projection.onState(setState);

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p) => setProjOpen(p.isOpen));

    return () => {
      offState();
      offWin();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
      if (isTyping) return;

      if (e.key === "b" || e.key === "B") window.cp.projection.setMode("BLACK");
      if (e.key === "w" || e.key === "W") window.cp.projection.setMode("WHITE");
      if (e.key === "r" || e.key === "R") window.cp.projection.setMode("NORMAL");
      if (e.key === "l" || e.key === "L") {
        window.cp.projection.setState({ lowerThirdEnabled: !(state?.lowerThirdEnabled ?? false) });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state]);

  const status = useMemo(() => {
    if (!state) return "Loading…";
    return `Mode=${state.mode} | LowerThird=${state.lowerThirdEnabled ? "ON" : "OFF"} | Projection=${
      projOpen ? "OPEN" : "CLOSED"
    }`;
  }, [state, projOpen]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Régie</h1>
      <p style={{ opacity: 0.75 }}>{status}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {!projOpen ? (
          <button
            onClick={async () => {
              try {
                console.log("[REGIE] open projection click");
                const r = await window.cp.projectionWindow.open();
                console.log("[REGIE] open result", r);
                setProjOpen(!!r?.isOpen);
              } catch (e) {
                console.error("[REGIE] open projection failed", e);
                alert("Impossible d'ouvrir la projection (voir console).");
              }
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Ouvrir Projection
          </button>
        ) : (
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.close();
              setProjOpen(!!r?.isOpen);
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Fermer Projection
          </button>
        )}

        <button
          onClick={() => window.cp.devtools.open("REGIE")}
          style={{ padding: "10px 14px", fontSize: 16 }}
        >
          DevTools Régie
        </button>

        <button
          onClick={() => window.cp.devtools.open("PROJECTION")}
          style={{ padding: "10px 14px", fontSize: 16 }}
          disabled={!projOpen}
          title={!projOpen ? "Ouvre la projection d’abord" : ""}
        >
          DevTools Projection
        </button>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <label>
          <div style={{ fontWeight: 600 }}>Titre</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Texte</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => window.cp.projection.setContentText({ title, body })}
            style={{ padding: "10px 14px", fontSize: 16 }}
            disabled={!projOpen}
          >
            Afficher
          </button>

          <button onClick={() => window.cp.projection.setMode("BLACK")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Noir (B)
          </button>
          <button onClick={() => window.cp.projection.setMode("WHITE")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Blanc (W)
          </button>
          <button onClick={() => window.cp.projection.setMode("NORMAL")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Reprendre (R)
          </button>

          <button
            onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(state?.lowerThirdEnabled ?? false) })}
            style={{ padding: "10px 14px" }}
            disabled={!projOpen}
          >
            Lower Third (L)
          </button>
        </div>

        <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Raccourcis</div>
          <div>B = Noir • W = Blanc • R = Reprendre • L = Lower third</div>
        </div>
      </div>
    </div>
  );
}
