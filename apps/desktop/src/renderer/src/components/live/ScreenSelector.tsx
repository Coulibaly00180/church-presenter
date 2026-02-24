import { useLive } from "@/hooks/useLive";
import { cn } from "@/lib/utils";

const SCREENS: ScreenKey[] = ["A", "B", "C"];

interface ScreenSelectorProps {
  className?: string;
}

export function ScreenSelector({ className }: ScreenSelectorProps) {
  const { live, setTarget } = useLive();

  if (!live) return null;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label="Écran de projection cible"
    >
      {SCREENS.map((screen) => {
        const isActive = live.target === screen;
        const isLocked = live.lockedScreens[screen];
        return (
          <button
            key={screen}
            role="radio"
            aria-checked={isActive}
            aria-label={`Écran ${screen}${isLocked ? " (verrouillé)" : ""}`}
            disabled={isLocked}
            onClick={() => void setTarget(screen)}
            className={cn(
              "h-8 w-10 rounded-full text-sm font-semibold transition-all",
              "border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isActive
                ? "bg-primary border-primary text-primary-fg shadow"
                : "bg-bg-elevated border-border text-text-secondary hover:bg-bg-surface hover:text-text-primary",
              isLocked && "opacity-40 cursor-not-allowed"
            )}
          >
            {screen}
          </button>
        );
      })}
    </div>
  );
}
