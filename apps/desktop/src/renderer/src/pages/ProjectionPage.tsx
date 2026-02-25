import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type ProjectionState = CpProjectionState;

// ─── Helpers timer ────────────────────────────────────────────────────────────

function parseMMSS(str: string): number {
  const parts = str.split(":");
  const m = parseInt(parts[0] ?? "0", 10) || 0;
  const s = parseInt(parts[1] ?? "0", 10) || 0;
  return m * 60 + s;
}

function formatMMSS(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Composants de rendu ──────────────────────────────────────────────────────

function TimerDisplay({ body, startedAt, onExpired }: { body: string; startedAt: number; onExpired?: () => void }) {
  const totalSeconds = parseMMSS(body);

  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(0, totalSeconds - elapsed);
  });

  useEffect(() => {
    const calc = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, totalSeconds - elapsed));
    };
    calc();
    const id = setInterval(calc, 250);
    return () => clearInterval(id);
  }, [totalSeconds, startedAt]);

  const isDone = remaining <= 0;

  // Notify parent once when timer expires
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [startedAt]);
  useEffect(() => {
    if (isDone && !firedRef.current && onExpired) {
      firedRef.current = true;
      onExpired();
    }
  }, [isDone, onExpired]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <span
        style={{
          fontSize: "clamp(4rem, 20vw, 15rem)",
          fontWeight: "bold",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.05em",
          color: "var(--foreground, #ffffff)",
          opacity: isDone ? 0.4 : 1,
          transition: "opacity 0.3s",
        }}
      >
        {formatMMSS(remaining)}
      </span>
    </div>
  );
}

const CUSTOM_FONT_FAMILY = "cp-custom-font";

function TextContent({ state, onTimerExpired }: { state: ProjectionState; onTimerExpired?: () => void }) {
  const { current } = state;
  const isTimer = current.title?.startsWith("TIMER:");

  // Load custom font file if provided via @font-face style injection
  const fontFamilyToUse = useMemo(() => {
    if (state.textFontPath) return CUSTOM_FONT_FAMILY;
    return state.textFont || "system-ui";
  }, [state.textFont, state.textFontPath]);

  useEffect(() => {
    const styleId = "cp-projection-custom-font";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    if (state.textFontPath) {
      styleEl.textContent = `@font-face { font-family: "${CUSTOM_FONT_FAMILY}"; src: url("file://${CSS.escape(state.textFontPath)}"); }`;
    } else {
      styleEl.textContent = "";
    }
  }, [state.textFontPath]);

  if (isTimer) {
    return <TimerDisplay body={current.body ?? "0:00"} startedAt={state.updatedAt} onExpired={onTimerExpired} />;
  }

  const scaleFactor = state.textScale ?? 1;

  const isGradientFg = state.foregroundMode === "GRADIENT" && state.foregroundGradientFrom && state.foregroundGradientTo;
  const fgGradientStyle = isGradientFg
    ? `linear-gradient(90deg, ${state.foregroundGradientFrom}, ${state.foregroundGradientTo})`
    : null;

  const applyFgStyle = (el: HTMLElement | null, fontSize: number) => {
    if (!el) return;
    el.style.fontSize = `${fontSize}px`;
    el.style.fontFamily = fontFamilyToUse;
    if (fgGradientStyle) {
      el.style.background = fgGradientStyle;
      el.style.webkitBackgroundClip = "text";
      el.style.webkitTextFillColor = "transparent";
      el.style.backgroundClip = "text";
      el.style.color = "";
    } else {
      el.style.background = "";
      el.style.webkitBackgroundClip = "";
      el.style.webkitTextFillColor = "";
      el.style.backgroundClip = "";
      el.style.color = state.foreground ?? "#ffffff";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-12 text-center gap-4">
      {current.title && (
        <h2
          className="font-semibold leading-tight"
          ref={(el) => applyFgStyle(el, Math.round(22 * scaleFactor))}
        >
          {current.title}
        </h2>
      )}
      {current.body && (
        <p
          className="leading-relaxed whitespace-pre-wrap"
          ref={(el) => applyFgStyle(el, Math.round(20 * scaleFactor))}
        >
          {current.body}
        </p>
      )}
    </div>
  );
}

function MediaContent({ state }: { state: ProjectionState }) {
  const { current } = state;
  if (!current.mediaPath) return null;

  if (current.mediaType === "IMAGE") {
    return (
      <img
        src={`file://${current.mediaPath}`}
        alt={current.title ?? ""}
        className="w-full h-full object-contain"
      />
    );
  }

  // PDF: use iframe with file:// URL — Electron's Chromium renders PDFs natively
  return (
    <iframe
      src={`file://${current.mediaPath}`}
      title={current.title ?? "PDF"}
      className="w-full h-full border-0 bg-black"
    />
  );
}

function ProjectionContent({ state, onTimerExpired }: { state: ProjectionState; onTimerExpired?: () => void }) {
  const { mode, current } = state;

  if (mode === "BLACK") {
    return <div className="w-full h-full bg-black" />;
  }

  if (mode === "WHITE") {
    return <div className="w-full h-full bg-white" />;
  }

  // Background
  const bgStyle: React.CSSProperties = {};
  if (state.backgroundMode === "GRADIENT_LINEAR" && state.backgroundGradientFrom && state.backgroundGradientTo) {
    const angle = state.backgroundGradientAngle ?? 180;
    bgStyle.background = `linear-gradient(${angle}deg, ${state.backgroundGradientFrom}, ${state.backgroundGradientTo})`;
  } else if (state.backgroundMode === "GRADIENT_RADIAL" && state.backgroundGradientFrom && state.backgroundGradientTo) {
    bgStyle.background = `radial-gradient(circle, ${state.backgroundGradientFrom}, ${state.backgroundGradientTo})`;
  } else {
    bgStyle.backgroundColor = state.background ?? "#000000";
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={bgStyle}>
      {/* Background image */}
      {state.backgroundImage && (
        <img
          src={`file://${state.backgroundImage}`}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {current.kind === "EMPTY" && null}
        {current.kind === "TEXT" && <TextContent state={state} onTimerExpired={onTimerExpired} />}
        {current.kind === "MEDIA" && <MediaContent state={state} />}
      </div>

      {/* Logo overlay */}
      {state.logoPath && (() => {
        const posClass = {
          "bottom-right": "bottom-4 right-4",
          "bottom-left":  "bottom-4 left-4",
          "top-right":    "top-4 right-4",
          "top-left":     "top-4 left-4",
          "center":       "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        }[state.logoPosition ?? "bottom-right"] ?? "bottom-4 right-4";
        const opacity = (state.logoOpacity ?? 80) / 100;
        return (
          <img
            src={`file://${state.logoPath}`}
            alt=""
            aria-hidden
            className={`absolute z-20 max-h-[10%] max-w-[15%] object-contain pointer-events-none ${posClass}`}
            ref={(el) => { if (el) el.style.opacity = String(opacity); }}
          />
        );
      })()}
    </div>
  );
}

export function ProjectionPage() {
  const [searchParams] = useSearchParams();
  const screenKey = (searchParams.get("screen") ?? "A") as ScreenKey;
  const [projState, setProjState] = useState<ProjectionState | null>(null);
  const autoBlackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (screenKey === "A") {
      void window.cp.projection.getState().then(setProjState);
      const unsub = window.cp.projection.onState(setProjState);
      return unsub;
    } else {
      void window.cp.screens.getState(screenKey).then(setProjState);
      const unsub = window.cp.screens.onState(screenKey, setProjState);
      return unsub;
    }
  }, [screenKey]);

  // Cancel auto-black if the slide changes
  useEffect(() => {
    if (autoBlackTimerRef.current) {
      clearTimeout(autoBlackTimerRef.current);
      autoBlackTimerRef.current = null;
    }
  }, [projState?.updatedAt]);

  const handleTimerExpired = useCallback(() => {
    autoBlackTimerRef.current = setTimeout(() => {
      void window.cp.live.toggleBlack();
    }, 3000);
  }, []);

  if (!projState) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ProjectionContent state={projState} onTimerExpired={handleTimerExpired} />
    </div>
  );
}
