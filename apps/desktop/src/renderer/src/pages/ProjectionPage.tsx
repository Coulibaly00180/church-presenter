import React, { useEffect, useState } from "react";

type ControlAction = "NEXT" | "PREV";

export function ProjectionPage() {
  const [state, setState] = useState<any>(null);
  const [animKey, setAnimKey] = useState(0);

  // Hard-disable scrollbars on the projection screen
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyMargin = document.body.style.margin;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.margin = prevBodyMargin;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!window.cp?.projection) {
      console.error("window.cp.projection not available (preload not loaded?)");
      return;
    }
    window.cp.projection.getState().then(setState);
    const off = window.cp.projection.onState(setState);
    return () => off();
  }, []);

  // Soft transition on content changes
  useEffect(() => {
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body, state?.mode]);

  // Allow controlling NEXT/PREV from the projection screen (optional but handy)
  useEffect(() => {
    if (!window.cp?.projection?.emitControl) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // do not steal keys when modifier pressed
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      // ArrowLeft/ArrowRight = PREV/NEXT
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        window.cp.projection.emitControl("PREV");
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        window.cp.projection.emitControl("NEXT");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const mode = state?.mode ?? "NORMAL";
  const current = state?.current ?? { kind: "EMPTY" };

  const bg = mode === "BLACK" ? "#000" : mode === "WHITE" ? "#fff" : "#000";
  const fg = mode === "WHITE" ? "#000" : "#fff";

  const handleClick = (clientX: number) => {
    if (!window.cp?.projection?.emitControl) return;
    const w = window.innerWidth || 1;
    const action: ControlAction = clientX < w / 2 ? "PREV" : "NEXT";
    window.cp.projection.emitControl(action);
  };

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
        overflow: "hidden",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // left click anywhere: left half=prev, right half=next
        // (mouseDown instead of click to be instant)
        handleClick(e.clientX);
      }}
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
              <div style={{ fontSize: 48, lineHeight: 1.25, whiteSpace: "pre-wrap" }}>{current.body}</div>
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
          html, body { width: 100%; height: 100%; overflow: hidden; }
          @keyframes cpFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0px); }
          }
        `}
      </style>
    </div>
  );
}
