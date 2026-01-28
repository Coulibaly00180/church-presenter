import React, { useEffect, useState } from "react";

export function ProjectionPage() {
  const [state, setState] = useState<any>(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (!window.cp?.projection) {
      console.error("window.cp.projection not available (preload not loaded?)");
      return;
    }
    window.cp.projection.getState().then(setState);
    const off = window.cp.projection.onState(setState);
    return () => off();
  }, []);

  // Déclenche une transition douce à chaque changement de "current"
  useEffect(() => {
    // incrémente dès que le contenu change
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current = state?.current ?? { kind: "EMPTY" };

  const bg = mode === "BLACK" ? "#000" : mode === "WHITE" ? "#fff" : "#000";
  const fg = mode === "WHITE" ? "#000" : "#fff";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        cursor: "none",
        fontFamily: "system-ui",
        padding: 64,
        boxSizing: "border-box",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {mode !== "NORMAL" ? null : (
        <div
          key={animKey}
          style={{
            width: "100%",
            textAlign: "center",
            animation: "cpFadeIn 120ms ease",
          }}
        >
          {current.kind === "TEXT" ? (
            <>
              {current.title ? (
                <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 28 }}>{current.title}</div>
              ) : null}
              <div style={{ fontSize: 48, lineHeight: 1.25, whiteSpace: "pre-wrap" }}>
                {current.body}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 56, opacity: 0.75 }}>Prêt</div>
          )}
        </div>
      )}

      {mode === "NORMAL" && state?.lowerThirdEnabled ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "24px 48px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 42,
            lineHeight: 1.2,
            whiteSpace: "pre-wrap",
          }}
        >
          {current.kind === "TEXT" ? current.body : ""}
        </div>
      ) : null}

      <style>
        {`
          @keyframes cpFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0px); }
          }
        `}
      </style>
    </div>
  );
}
