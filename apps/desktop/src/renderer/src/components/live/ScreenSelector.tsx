import { useEffect, useState } from "react";
import { Monitor, MonitorOff, MonitorPlay } from "lucide-react";
import { useLive } from "@/hooks/useLive";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SCREENS: ScreenKey[] = ["A", "B", "C"];

interface ScreenSelectorProps {
  className?: string;
}

export function ScreenSelector({ className }: ScreenSelectorProps) {
  const { live, setTarget } = useLive();
  const [screenMetas, setScreenMetas] = useState<CpScreenMeta[]>([]);
  const [busy, setBusy] = useState<ScreenKey | null>(null);

  useEffect(() => {
    void window.cp.screens.list().then(setScreenMetas);

    const unsubs = SCREENS.map((key) =>
      window.cp.screens.onWindowState(key, ({ isOpen }) => {
        setScreenMetas((prev) =>
          prev.map((s) => (s.key === key ? { ...s, isOpen } : s))
        );
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  if (!live) return null;

  const getMeta = (key: ScreenKey) => screenMetas.find((s) => s.key === key);

  const handlePillClick = async (key: ScreenKey) => {
    const meta = getMeta(key);
    if (meta && !meta.isOpen) {
      setBusy(key);
      try {
        await window.cp.screens.open(key);
      } finally {
        setBusy(null);
      }
    }
    await setTarget(key);
  };

  const handleToggleWindow = async (key: ScreenKey) => {
    const meta = getMeta(key);
    setBusy(key);
    try {
      if (meta?.isOpen) {
        await window.cp.screens.close(key);
      } else {
        await window.cp.screens.open(key);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Pills : sélection de l'écran cible */}
      <div
        role="radiogroup"
        aria-label="Écran de projection cible"
        className="flex items-center gap-1"
      >
        {SCREENS.map((screen) => {
          const isActive = live.target === screen;
          const isLocked = live.lockedScreens[screen];
          const meta = getMeta(screen);
          const isOpen = meta?.isOpen ?? true;

          return (
            <button
              key={screen}
              type="button"
              role="radio"
              aria-checked={isActive ? "true" : "false"}
              aria-label={`Écran ${screen}${!isOpen ? " (fermé — cliquer pour ouvrir)" : ""}${isLocked ? " (verrouillé)" : ""}`}
              disabled={isLocked || busy === screen}
              onClick={() => void handlePillClick(screen)}
              className={cn(
                "relative h-8 w-10 rounded-full text-sm font-semibold transition-all",
                "border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isActive && isOpen
                  ? "bg-primary border-primary text-primary-fg shadow"
                  : isOpen
                  ? "bg-bg-elevated border-border text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                  : "bg-bg-elevated border-dashed border-border text-text-muted opacity-60 hover:opacity-90 hover:bg-bg-surface",
                (isLocked || busy === screen) && "cursor-not-allowed"
              )}
            >
              {screen}
              {/* Point indicateur : fermé */}
              {!isOpen && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-text-muted border-2 border-bg-base"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Popover de gestion des fenêtres d'écran */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            aria-label="Gérer les fenêtres de projection"
            className="h-8 w-8 p-0"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="end" sideOffset={6}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Fenêtres de projection
          </p>
          <div className="space-y-1.5">
            {SCREENS.map((screen) => {
              const meta = getMeta(screen);
              const isOpen = meta?.isOpen ?? true;
              const isBusy = busy === screen;

              return (
                <div
                  key={screen}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <MonitorPlay className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <MonitorOff className="h-4 w-4 shrink-0 text-text-muted" />
                    )}
                    <span className="text-sm text-text-primary">
                      Écran {screen}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        isOpen ? "text-success" : "text-text-muted"
                      )}
                    >
                      {isOpen ? "Ouvert" : "Fermé"}
                    </span>
                  </div>
                  <Button
                    variant={isOpen ? "ghost" : "outline"}
                    size="xs"
                    disabled={isBusy}
                    onClick={() => void handleToggleWindow(screen)}
                    className={cn(
                      "shrink-0 text-xs",
                      isOpen && "text-danger hover:text-danger"
                    )}
                  >
                    {isOpen ? "Fermer" : "Ouvrir"}
                  </Button>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
