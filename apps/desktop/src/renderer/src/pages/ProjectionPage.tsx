import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type ProjectionState = CpProjectionState;

function TimerDisplay({ body }: { body: string }) {
  // body is expected to be a timer value string like "5:00"
  return (
    <div className="flex items-center justify-center w-full h-full">
      <span
        className="font-bold tabular-nums tracking-tighter"
        style={{ fontSize: "clamp(4rem, 20vw, 15rem)", color: "var(--foreground, #ffffff)" }}
      >
        {body}
      </span>
    </div>
  );
}

function TextContent({ state }: { state: ProjectionState }) {
  const { current } = state;
  const isTimer = current.title?.startsWith("TIMER:");

  if (isTimer) {
    return <TimerDisplay body={current.body ?? ""} />;
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
