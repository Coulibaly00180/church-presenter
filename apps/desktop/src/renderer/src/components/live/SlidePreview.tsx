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

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border",
          "flex items-center justify-center",
          onClick && "cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
        )}
        style={{
          aspectRatio: "16 / 9",
          backgroundColor: isBlack ? "#000" : isWhite ? "#fff" : (projectionState?.background ?? bg),
        }}
        role={onClick ? "button" : undefined}
        onClick={onClick}
        aria-label={label}
      >
        {/* Mode overlay */}
        {isBlack && (
          <span className="text-white/30 text-xs uppercase tracking-widest">Noir</span>
        )}
        {isWhite && (
          <span className="text-black/30 text-xs uppercase tracking-widest">Blanc</span>
        )}

        {/* Content */}
        {!isBlack && !isWhite && current && current.kind !== "EMPTY" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
            {current.kind === "TEXT" && (
              <>
                {isTimer ? (
                  /* Timer countdown display */
                  <p
                    className="text-sm font-bold tabular-nums leading-none"
                    style={{ color: projectionState?.foreground ?? "#fff" }}
                  >
                    {countdown ?? current.body}
                  </p>
                ) : (
                  <>
                    {current.title && (
                      <p
                        className="text-[9px] font-semibold leading-tight truncate w-full text-center"
                        style={{ color: projectionState?.foreground ?? "#fff" }}
                      >
                        {current.title}
                      </p>
                    )}
                    {current.body && (
                      <p
                        className="text-[8px] leading-tight line-clamp-3 w-full text-center mt-0.5"
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
              <div className="w-full h-full flex items-center justify-center opacity-50">
                <span className="text-[9px] text-white uppercase">{current.mediaType ?? "Média"}</span>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {(!current || current.kind === "EMPTY") && !isBlack && !isWhite && (
          <span className="text-[9px] opacity-30 uppercase tracking-wider text-white">Vide</span>
        )}
      </div>

      {label && (
        <p className="text-xs text-text-secondary text-center">{label}</p>
      )}
    </div>
  );
}
