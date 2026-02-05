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


  // Live controls from projection window: arrows + click left/right
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        window.cp.live?.next?.();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        window.cp.live?.prev?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screenKey]);

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

  // Declenche une transition douce a chaque changement de "current"
  useEffect(() => {
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current = state?.current ?? { kind: "EMPTY" };
  const lowerThird = !!state?.lowerThirdEnabled;

  const textScale = state?.textScale ?? 1;
  const bg = mode === "BLACK" ? "black" : mode === "WHITE" ? "white" : state?.background || "#050505";
  const fg = mode === "BLACK" ? "white" : mode === "WHITE" ? "black" : state?.foreground || "white";

  const containerStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: bg,
    color: fg,
    display: "flex",
    alignItems: lowerThird ? "flex-end" : "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingBottom: lowerThird ? "6vh" : 0,
  };

  const cardStyle: React.CSSProperties = {
    width: "92%",
    maxWidth: 1600,
    textAlign: lowerThird ? "left" : "center",
    fontFamily: "system-ui",
    padding: lowerThird ? "10px 24px 12px" : 24,
    background: lowerThird ? "rgba(0,0,0,0.35)" : "transparent",
    borderRadius: lowerThird ? 16 : 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: (lowerThird ? 32 : 46) * textScale,
    fontWeight: 900,
    marginBottom: lowerThird ? 8 : 18,
    letterSpacing: -0.5,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: (lowerThird ? 40 : 56) * textScale,
    fontWeight: 800,
    lineHeight: lowerThird ? 1.1 : 1.15,
    whiteSpace: "pre-wrap",
  };

  return (
    <div style={{ ...containerStyle, position: "relative" }}>
      {/* click areas */}
      <div
        onClick={() => window.cp.live?.prev?.()}
        style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", cursor: "pointer" }}
      />
      <div
        onClick={() => window.cp.live?.next?.()}
        style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", cursor: "pointer" }}
      />
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
          <div style={{ opacity: 0.7, fontSize: 28 }}>Pret.</div>
        ) : current.kind === "MEDIA" && current.mediaPath ? (
          <>
            {current.title ? <div style={titleStyle}>{current.title}</div> : null}
            {current.mediaType === "PDF" ? (
              <embed src={current.mediaPath} type="application/pdf" style={{ width: "100%", height: "70vh", border: "none" }} />
            ) : (
              <img
                src={current.mediaPath}
                style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }}
              />
            )}
          </>
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
