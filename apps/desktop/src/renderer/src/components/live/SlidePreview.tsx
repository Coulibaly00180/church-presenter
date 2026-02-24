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
