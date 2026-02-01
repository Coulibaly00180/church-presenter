import React, { useEffect, useMemo, useState } from "react";

function getScreenKey(): "A" | "B" | "C" {
  // HashRouter: "#/projection?screen=B"
  const hash = window.location.hash || "";
  const q = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(q);
  const key = (params.get("screen") || "A").toUpperCase();
  if (key === "B" || key === "C") return key;
  return "A";
}

export function ProjectionPage() {
  const screenKey = useMemo(() => getScreenKey(), []);
  const [state, setState] = useState<any>(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const hasScreens = !!window.cp?.screens?.getState && !!window.cp?.screens?.onState;

    if (hasScreens) {
      window.cp.screens.getState(screenKey).then(setState);
      const off = window.cp.screens.onState(screenKey, setState);
      return () => off();
    }

    // fallback legacy
    if (!window.cp?.projection) {
      console.error("window.cp.projection not available (preload not loaded?)");
      return;
    }
    window.cp.projection.getState().then(setState);
    const off = window.cp.projection.onState(setState);
    return () => off();
  }, [screenKey]);

  // Déclenche une transition douce à chaque changement de "current"
  useEffect(() => {
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current = state?.current ?? { kind: "EMPTY" };

  const bg =
    mode === "BLACK" ? "black" : mode === "WHITE" ? "white" : "#050505";
  const fg =
    mode === "BLACK" ? "white" : mode === "WHITE" ? "black" : "white";

  const containerStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: bg,
    color: fg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const cardStyle: React.CSSProperties = {
    width: "92%",
    maxWidth: 1600,
    textAlign: "center",
    fontFamily: "system-ui",
    padding: 24,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 46,
    fontWeight: 900,
    marginBottom: 18,
    letterSpacing: -0.5,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: 56,
    fontWeight: 800,
    lineHeight: 1.15,
    whiteSpace: "pre-wrap",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle} key={animKey}>
        {/* watermark screen id */}
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            opacity: 0.35,
            fontFamily: "system-ui",
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          SCREEN {screenKey}
        </div>

        {current.kind === "EMPTY" ? (
          <div style={{ opacity: 0.7, fontSize: 28 }}>Prêt.</div>
        ) : (
          <>
            {current.title ? <div style={titleStyle}>{current.title}</div> : null}
            <div style={bodyStyle}>{current.body ?? ""}</div>
          </>
        )}
      </div>
    </div>
  );
}
