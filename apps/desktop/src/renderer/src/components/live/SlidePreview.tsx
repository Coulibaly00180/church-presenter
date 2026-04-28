import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlidePreviewProps {
  /** Current projection state for this preview */
  projectionState: CpProjectionState | null;
  /** Visual variant */
  variant?: "current" | "next";
  /** Optional label shown below the preview */
  label?: string;
  /** Click handler */
  onClick?: () => void;
  className?: string;
}

function parseMMSS(str: string): number {
  const parts = str.split(":");
  return (parseInt(parts[0] ?? "0", 10) || 0) * 60 + (parseInt(parts[1] ?? "0", 10) || 0);
}

function formatMMSS(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function SlidePreview({
  projectionState,
  variant = "current",
  label,
  onClick,
  className,
}: SlidePreviewProps) {
  const bg = variant === "current"
    ? "var(--current-slide)"
    : "var(--next-slide)";
  const variantLabel = variant === "current" ? "En direct" : "Suivant";

  const isBlack = projectionState?.mode === "BLACK";
  const isWhite = projectionState?.mode === "WHITE";
  const current = projectionState?.current;

  // Live countdown for TIMER items
  const isTimer = current?.kind === "TEXT" && current?.title?.startsWith("TIMER:");
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!isTimer || !projectionState) {
      setCountdown(null);
      return;
    }
    const totalSeconds = parseMMSS(current?.body ?? "0:00");
    const startedAt = projectionState.updatedAt;
    const calc = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setCountdown(formatMMSS(Math.max(0, totalSeconds - elapsed)));
    };
    calc();
    const id = setInterval(calc, 250);
    return () => clearInterval(id);
  }, [isTimer, current?.body, projectionState?.updatedAt, projectionState]);

  const frameClassName = cn(
    "relative flex items-center justify-center overflow-hidden rounded-xl border border-border",
    onClick && "cursor-pointer transition-colors hover:border-primary/40 hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  );
  const frameStyle: React.CSSProperties = { aspectRatio: "16 / 9" };
  if (isBlack) {
    frameStyle.backgroundColor = "#000";
  } else if (isWhite) {
    frameStyle.backgroundColor = "#fff";
  } else if (
    projectionState?.backgroundMode === "GRADIENT_LINEAR" &&
    projectionState.backgroundGradientFrom &&
    projectionState.backgroundGradientTo
  ) {
    const angle = projectionState.backgroundGradientAngle ?? 180;
    frameStyle.background = `linear-gradient(${angle}deg, ${projectionState.backgroundGradientFrom}, ${projectionState.backgroundGradientTo})`;
  } else if (
    projectionState?.backgroundMode === "GRADIENT_RADIAL" &&
    projectionState.backgroundGradientFrom &&
    projectionState.backgroundGradientTo
  ) {
    frameStyle.background = `radial-gradient(circle, ${projectionState.backgroundGradientFrom}, ${projectionState.backgroundGradientTo})`;
  } else {
    frameStyle.backgroundColor = projectionState?.background ?? bg;
  }

  const previewContent = (
    <>
      <span className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white/85">
        {variantLabel}
      </span>

      {isBlack && (
        <span className="text-white/30 text-xs uppercase tracking-widest">Noir</span>
      )}
      {isWhite && (
        <span className="text-black/30 text-xs uppercase tracking-widest">Blanc</span>
      )}

      {!isBlack && !isWhite && current && current.kind !== "EMPTY" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          {current.kind === "TEXT" && (
            <>
              {isTimer ? (
                <p
                  className="text-base font-bold tabular-nums leading-none"
                  style={{ color: projectionState?.foreground ?? "#fff" }}
                >
                  {countdown ?? current.body}
                </p>
              ) : (
                <>
                  {current.title && (
                    <p
                      className="w-full truncate text-xs font-semibold leading-tight"
                      style={{ color: projectionState?.foreground ?? "#fff" }}
                    >
                      {current.title}
                    </p>
                  )}
                  {current.body && (
                    <p
                      className="mt-1 line-clamp-4 w-full text-xs leading-snug opacity-90"
                      style={{ color: projectionState?.foreground ?? "#fff" }}
                    >
                      {current.body}
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {current.kind === "MEDIA" && (
            <div className="flex h-full w-full items-center justify-center opacity-60">
              <span className="text-xs font-semibold uppercase tracking-wide text-white">
                {current.mediaType ?? "Media"}
              </span>
            </div>
          )}
        </div>
      )}

      {(!current || current.kind === "EMPTY") && !isBlack && !isWhite && (
        <span className="text-xs uppercase tracking-wider text-white/35">Vide</span>
      )}
    </>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {onClick ? (
        <button
          type="button"
          className={frameClassName}
          style={frameStyle}
          onClick={onClick}
          aria-label={label ? `Projeter ${label}` : "Projeter l'aperçu"}
        >
          {previewContent}
        </button>
      ) : (
        <div className={frameClassName} style={frameStyle}>
          {previewContent}
        </div>
      )}

      {label && (
        <p className="line-clamp-2 text-center text-sm font-medium text-text-secondary">{label}</p>
      )}
    </div>
  );
}
