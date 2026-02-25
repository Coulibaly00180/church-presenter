import { useEffect, useState } from "react";
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

function TimerDisplay({ body, startedAt }: { body: string; startedAt: number }) {
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

function TextContent({ state }: { state: ProjectionState }) {
  const { current } = state;
  const isTimer = current.title?.startsWith("TIMER:");

  if (isTimer) {
    return <TimerDisplay body={current.body ?? "0:00"} startedAt={state.updatedAt} />;
  }

  const scaleFactor = state.textScale ?? 1;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-12 text-center gap-4">
      {current.title && (
        <h2
          className="font-semibold leading-tight"
          style={{
            fontSize: `${Math.round(22 * scaleFactor)}px`,
            color: state.foreground ?? "#ffffff",
          }}
        >
          {current.title}
        </h2>
      )}
      {current.body && (
        <p
          className="leading-relaxed whitespace-pre-wrap"
          style={{
            fontSize: `${Math.round(20 * scaleFactor)}px`,
            color: state.foreground ?? "#ffffff",
          }}
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

  return (
    <div className="flex items-center justify-center w-full h-full text-white text-sm opacity-50">
      PDF : {current.mediaPath}
    </div>
  );
}

function ProjectionContent({ state }: { state: ProjectionState }) {
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
        {current.kind === "TEXT" && <TextContent state={state} />}
        {current.kind === "MEDIA" && <MediaContent state={state} />}
      </div>
    </div>
  );
}

export function ProjectionPage() {
  const [searchParams] = useSearchParams();
  const screenKey = (searchParams.get("screen") ?? "A") as ScreenKey;
  const [projState, setProjState] = useState<ProjectionState | null>(null);

  useEffect(() => {
    // Load initial state
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

  if (!projState) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ProjectionContent state={projState} />
    </div>
  );
}
