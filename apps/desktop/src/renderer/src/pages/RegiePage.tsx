import React, { useEffect, useMemo, useState } from "react";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

function splitBlocks(text: string) {
  // Un "bloc" = paragraphes séparés par 1+ lignes vides
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RegiePage() {
  const [title, setTitle] = useState("Bienvenue");
  const [body, setBody] = useState("Tape ton texte ici, puis clique Afficher.");
  const [state, setState] = useState<any>(null);
  const [projOpen, setProjOpen] = useState<boolean>(false);
  const [blockCursor, setBlockCursor] = useState<number>(-1);

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
      if (isTypingTarget(e.target)) return;

      if (e.key === "b" || e.key === "B") window.cp.projection.setMode("BLACK");
      if (e.key === "w" || e.key === "W") window.cp.projection.setMode("WHITE");
      if (e.key === "r" || e.key === "R") window.cp.projection.setMode("NORMAL");
      if (e.key === "l" || e.key === "L") {
        window.cp.projection.setState({ lowerThirdEnabled: !(state?.lowerThirdEnabled ?? false) });
      }

      // Navigation blocs (↑ ↓) + Enter
      if (!projOpen) return;

      const blocks = splitBlocks(body);
      if (blocks.length === 0) return;

      const projectByIndex = async (i: number) => {
        const idx = Math.max(0, Math.min(i, blocks.length - 1));
        setBlockCursor(idx);
        await window.cp.projection.setContentText({
          title,
          body: blocks[idx],
        });
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min((blockCursor < 0 ? -1 : blockCursor) + 1, blocks.length - 1);
        void projectByIndex(next);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max((blockCursor < 0 ? 0 : blockCursor) - 1, 0);
        void projectByIndex(prev);
      }

      if (e.key === "Enter") {
        // Enter projette le bloc courant (ou le 1er)
        if (blocks.length > 0) {
          e.preventDefault();
          const idx = blockCursor >= 0 ? blockCursor : 0;
          void projectByIndex(idx);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, projOpen, body, title, blockCursor]);

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
            onClick={async () => {
              const blocks = splitBlocks(body);
              if (blocks.length === 0) {
                await window.cp.projection.setContentText({ title, body: "" });
                setBlockCursor(-1);
                return;
              }
              setBlockCursor(0);
              await window.cp.projection.setContentText({ title, body: blocks[0] });
            }}
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

        <div style={{ marginTop: 6, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Blocs (clic ou ↑/↓)</div>
          {splitBlocks(body).length === 0 ? (
            <div style={{ opacity: 0.7 }}>Aucun bloc (sépare par des lignes vides).</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {splitBlocks(body).map((b, idx) => {
                const active = idx === blockCursor;
                return (
                  <button
                    key={idx}
                    onClick={async () => {
                      if (!projOpen) return;
                      setBlockCursor(idx);
                      await window.cp.projection.setContentText({ title, body: b });
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: active ? "2px solid #111" : "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                    title="Cliquer pour projeter"
                    disabled={!projOpen}
                  >
                    <div style={{ fontWeight: 800 }}>#{idx + 1}</div>
                    <div style={{ opacity: 0.8, whiteSpace: "pre-wrap" }}>
                      {b.length > 120 ? `${b.slice(0, 120)}…` : b}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Raccourcis</div>
          <div>B = Noir • W = Blanc • R = Reprendre • L = Lower third • ↑/↓ = bloc • Enter = projeter</div>
        </div>
      </div>
    </div>
  );
}
