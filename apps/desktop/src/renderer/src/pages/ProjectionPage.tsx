import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { projectPlanItemToTarget } from "@/lib/projection";
import type { PlanItem } from "@/lib/types";

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
  const titleScaleFactor = state.titleTextScale ?? scaleFactor;

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

  // Multi-translation stacked layout
  const hasSecondary = (current.secondaryTexts?.length ?? 0) > 0;
  if (hasSecondary) {
    const allVersions = [
      { label: current.title, body: current.body },
      ...(current.secondaryTexts ?? []),
    ].filter((v): v is { label: string | undefined; body: string } => Boolean(v.body));
    const n = allVersions.length;
    const bodySize = Math.round(26 * scaleFactor / (0.5 + 0.5 * n));
    const labelSize = Math.round(13 * titleScaleFactor / Math.max(1, n - 0.5));
    const separatorColor = `${(state.foreground ?? "#ffffff")}30`;

    return (
      <div className="flex flex-col w-full h-full">
        {allVersions.map((version, i) => (
          <div
            key={i}
            className="flex flex-col justify-center px-12 py-2 flex-1"
            style={{ borderTop: i > 0 ? `1px solid ${separatorColor}` : undefined }}
          >
            {version.label && (
              <span
                className="uppercase tracking-wider font-semibold mb-1 opacity-50"
                ref={(el) => applyFgStyle(el, labelSize)}
              >
                {version.label}
              </span>
            )}
            <p
              className="leading-snug whitespace-pre-wrap"
              ref={(el) => applyFgStyle(el, bodySize)}
            >
              {version.body}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Title / reference — top-left overlay */}
      {current.title && (
        <div className="absolute top-6 left-8 z-10 max-w-[60%]">
          <h2
            className="font-semibold leading-snug opacity-75"
            ref={(el) => applyFgStyle(el, Math.round(22 * titleScaleFactor))}
          >
            {current.title}
          </h2>
        </div>
      )}
      {/* Body — centered on screen */}
      {current.body && (
        <div className="flex items-center justify-center w-full h-full px-16 py-20 text-center">
          <p
            className="leading-relaxed whitespace-pre-wrap max-w-[85%]"
            ref={(el) => applyFgStyle(el, Math.round(26 * scaleFactor))}
          >
            {current.body}
          </p>
        </div>
      )}
    </div>
  );
}

function MediaContent({ state }: { state: ProjectionState }) {
  const { current } = state;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Listen for play/pause and volume commands from the control window
  useEffect(() => {
    const unsubControl = window.cp.live.onVideoControl((action) => {
      if (action === "PLAY") void videoRef.current?.play();
      else videoRef.current?.pause();
    });
    const unsubVolume = window.cp.live.onVideoVolume((volume) => {
      if (videoRef.current) videoRef.current.volume = volume;
    });
    return () => { unsubControl(); unsubVolume(); };
  }, []);

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

  if (current.mediaType === "VIDEO") {
    return (
      <video
        ref={videoRef}
        src={`file://${current.mediaPath}`}
        className="w-full h-full object-contain"
        autoPlay
        controls={false}
        loop
        muted={false}
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
        }[state.logoPosition ?? "top-left"] ?? "top-4 left-4";
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

  // Keep live state in a ref so the keyboard handler always has fresh values
  // without re-registering the listener on every cursor change.
  const liveNavRef = useRef<CpLiveState | null>(null);
  useEffect(() => {
    void window.cp.live.get().then((s) => { liveNavRef.current = s; });
    const unsub = window.cp.live.onUpdate((s) => { liveNavRef.current = s; });
    return unsub;
  }, []);

  // Arrow-key navigation — handles the case where the projection window has
  // focus instead of the regie window, so keyboard shortcuts still work.
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const live = liveNavRef.current;
      console.log("[proj] arrow key", e.key, "live:", live?.enabled, "planId:", live?.planId);
      if (!live?.enabled) return;
      if (!live.planId) {
        // Free mode: forward to regie window which handles song/bible navigation
        e.preventDefault();
        await window.cp.live.freeNavigate(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const plan = await window.cp.plans.get(live.planId);
      if (!plan) return;
      const nextCursor = Math.max(0, Math.min(live.cursor + dir, plan.items.length - 1));
      console.log("[proj] navigating cursor", live.cursor, "→", nextCursor);
      if (dir > 0) await window.cp.live.next();
      else await window.cp.live.prev();
      const item = plan.items[nextCursor];
      if (item) {
        await projectPlanItemToTarget(live.target, item as PlanItem, live);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
