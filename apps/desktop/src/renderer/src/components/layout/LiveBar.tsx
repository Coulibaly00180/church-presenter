import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Clock, Monitor, MoonStar, Play, Square, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidePreview } from "@/components/live/SlidePreview";
import { NavControls } from "@/components/live/NavControls";
import { ScreenSelector } from "@/components/live/ScreenSelector";
import { KindBadge } from "@/components/ui/badge";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { useShortcuts } from "@/hooks/useShortcuts";
import { projectPlanItemToTarget } from "@/lib/projection";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { estimateItemDurationSeconds, formatMinutes } from "@/lib/planDuration";
import { cn } from "@/lib/utils";
import type { PlanItem } from "@/lib/types";

export function LiveBar() {
  const { live, toggle, toggleBlack, toggleWhite, resume } = useLive();
  const { plan } = usePlan();
  const [currentState, setCurrentState] = useState<CpProjectionState | null>(null);
  const [nextState, setNextState] = useState<CpProjectionState | null>(null);

  const isEnabled = live?.enabled ?? false;

  // Auto-advance
  const AUTO_INTERVALS = [5, 10, 15, 20, 30, 60] as const;
  type AutoInterval = (typeof AUTO_INTERVALS)[number];
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoInterval, setAutoInterval] = useState<AutoInterval>(15);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset auto-advance when live mode changes
  useEffect(() => {
    if (!isEnabled) setAutoEnabled(false);
  }, [isEnabled]);

  // Auto-advance interval
  useEffect(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (!autoEnabled || !isEnabled) return;
    autoTimerRef.current = setInterval(() => {
      void window.cp.live.next();
    }, autoInterval * 1000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoEnabled, autoInterval, isEnabled]);

  // Live timer countdown in the top strip
  const [timerCountdown, setTimerCountdown] = useState<string | null>(null);

  useEffect(() => {
    const isTimerActive =
      currentState?.current?.kind === "TEXT" &&
      currentState.current.title?.startsWith("TIMER:");
    if (!isTimerActive || !currentState) {
      setTimerCountdown(null);
      return;
    }
    const body = currentState.current.body ?? "0:00";
    const parts = body.split(":");
    const totalSecs =
      (parseInt(parts[0] ?? "0", 10) || 0) * 60 +
      (parseInt(parts[1] ?? "0", 10) || 0);
    const startedAt = currentState.updatedAt;
    const calc = () => {
      const remaining = Math.max(0, totalSecs - (Date.now() - startedAt) / 1000);
      const s = Math.floor(remaining);
      setTimerCountdown(
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
      );
    };
    calc();
    const id = setInterval(calc, 250);
    return () => clearInterval(id);
  }, [currentState]);

  // Load projection states
  useEffect(() => {
    if (!isEnabled) return;
    void window.cp.projection.getState().then(setCurrentState);
    const unsub = window.cp.projection.onState(setCurrentState);
    return unsub;
  }, [isEnabled]);

  // Precompute "next" item's projection state (visual preview only)
  useEffect(() => {
    if (!live || !plan) return;
    const nextItem = plan.items[live.cursor + 1];
    if (!nextItem) { setNextState(null); return; }
    setNextState({
      mode: "NORMAL",
      lowerThirdEnabled: false,
      transitionEnabled: false,
      textScale: 1,
      textFont: "",
      background: "#000",
      foreground: "#fff",
      current: {
        kind: "TEXT",
        title: nextItem.title?.trim() || getPlanKindDefaultTitle(nextItem.kind),
        body: nextItem.content ?? "",
      },
      updatedAt: 0,
    } as CpProjectionState);
  }, [live, plan]);

  const handleItemClick = useCallback(async (item: CpPlanItem, index: number) => {
    await window.cp.live.setCursor(index);
    if (live) {
      await projectPlanItemToTarget(live.target, item as PlanItem, live);
    }
  }, [live]);

  // Keyboard shortcuts — all hooks must be before early returns
  useShortcuts(
    useCallback((action) => {
      switch (action) {
        case "next": void window.cp.live.next(); break;
        case "prev": void window.cp.live.prev(); break;
        case "toggleBlack": void toggleBlack(); break;
        case "toggleWhite": void toggleWhite(); break;
        case "resume": void resume(); break;
        case "targetA": void window.cp.live.setTarget("A"); break;
        case "targetB": void window.cp.live.setTarget("B"); break;
        case "targetC": void window.cp.live.setTarget("C"); break;
      }
    }, [toggleBlack, toggleWhite, resume]),
    isEnabled
  );

  if (!isEnabled || !live) return null;

  const isBlack = live.black;
  const isWhite = live.white;
  const currentItem = plan?.items[live.cursor];
  const nextItem = plan?.items[live.cursor + 1];

  // Duration-based progress
  const itemDurations = plan?.items.map(estimateItemDurationSeconds) ?? [];
  const totalDurationSeconds = itemDurations.reduce((sum, d) => sum + d, 0);
  const completedSeconds = itemDurations.slice(0, live.cursor).reduce((sum, d) => sum + d, 0);
  const progressPercent = totalDurationSeconds > 0 ? (completedSeconds / totalDurationSeconds) * 100 : 0;
  const remainingSeconds = totalDurationSeconds - completedSeconds;
  const remainingLabel = totalDurationSeconds > 0 ? formatMinutes(remainingSeconds) : null;

  return (
    <div
      className="flex flex-col bg-bg-base border-t border-border overflow-hidden h-[var(--live-bar-height)] min-h-[var(--live-bar-height)]"
      role="region"
      aria-label="Barre Mode Direct"
    >
      {/* Top strip: status + controls */}
      <div className="flex items-center gap-3 px-4 h-10 shrink-0 border-b border-border">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <Circle className="h-2.5 w-2.5 fill-live-indicator text-live-indicator animate-pulse" aria-hidden />
          <span className="text-xs font-semibold text-live-indicator uppercase tracking-wide">Direct</span>
        </div>

        {/* Screen mode buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant={isBlack ? "default" : "ghost"}
            size="xs"
            onClick={() => void toggleBlack()}
            className={cn("gap-1", isBlack && "bg-text-primary text-bg-base")}
            aria-pressed={isBlack}
          >
            <MoonStar className="h-3.5 w-3.5" />
            Noir
          </Button>
          <Button
            variant={isWhite ? "default" : "ghost"}
            size="xs"
            onClick={() => void toggleWhite()}
            className={cn("gap-1", isWhite && "bg-white text-black border border-border")}
            aria-pressed={isWhite}
          >
            <Sun className="h-3.5 w-3.5" />
            Blanc
          </Button>
          {(isBlack || isWhite) && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void resume()}
              className="gap-1 text-success"
            >
              <Monitor className="h-3.5 w-3.5" />
              Reprendre
            </Button>
          )}
        </div>

        {/* Auto-advance */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant={autoEnabled ? "default" : "ghost"}
            size="xs"
            onClick={() => setAutoEnabled((v) => !v)}
            className={cn("gap-1", autoEnabled && "bg-accent text-white")}
            aria-pressed={autoEnabled}
            aria-label="Auto-avance"
          >
            {autoEnabled ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            Auto
          </Button>
          {autoEnabled && (
            <select
              value={autoInterval}
              onChange={(e) => setAutoInterval(Number(e.target.value) as AutoInterval)}
              className="text-xs bg-bg-elevated border border-border rounded px-1 py-0.5 text-text-primary h-6"
              aria-label="Intervalle auto-avance"
            >
              {AUTO_INTERVALS.map((s) => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          )}
        </div>

        {/* Navigation */}
        <NavControls className="ml-auto" />

        {/* Progress counter + remaining time */}
        {plan && (
          <span className="text-xs tabular-nums text-text-muted font-medium px-1 flex items-center gap-1.5">
            <span>{live.cursor + 1} / {plan.items.length}</span>
            {remainingLabel && (
              <span className="text-text-muted/70">· {remainingLabel}</span>
            )}
          </span>
        )}

        {/* Timer countdown badge */}
        {timerCountdown && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 border border-warning/30">
            <Clock className="h-3 w-3 text-warning shrink-0" />
            <span className="text-xs tabular-nums font-bold text-warning">
              {timerCountdown}
            </span>
          </div>
        )}

        {/* Screen selector */}
        <ScreenSelector />

        {/* Quit */}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void toggle()}
          className="gap-1 text-text-secondary ml-1"
          aria-label="Quitter le mode Direct"
        >
          <X className="h-3.5 w-3.5" />
          Quitter
        </Button>
      </div>

      {/* Progress bar */}
      {totalDurationSeconds > 0 && (
        <div className="h-0.5 bg-border shrink-0">
          <div
            className="h-full bg-primary/60 transition-[width] duration-500 ease-out"
            ref={(el) => { if (el) el.style.width = `${progressPercent}%`; }}
          />
        </div>
      )}

      {/* Bottom: slide previews + mini plan list */}
      <div className="flex flex-1 items-stretch overflow-hidden gap-3 px-4 py-2">
        {/* Current slide preview */}
        <SlidePreview
          projectionState={currentState}
          variant="current"
          label={currentItem?.title?.trim() || "En cours"}
          className="w-[120px] shrink-0"
        />

        {/* Next slide preview */}
        <SlidePreview
          projectionState={nextState}
          variant="next"
          label={nextItem ? (nextItem.title?.trim() || getPlanKindDefaultTitle(nextItem.kind)) : "—"}
          className="w-[80px] shrink-0"
          onClick={nextItem ? () => void handleItemClick(nextItem, live.cursor + 1) : undefined}
        />

        {/* Mini plan list */}
        {plan && (
          <ScrollArea className="flex-1">
            <div className="flex gap-1.5 items-center h-full">
              {plan.items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors",
                    "hover:bg-bg-elevated cursor-pointer",
                    index === live.cursor && "bg-bg-elevated ring-1 ring-primary/60"
                  )}
                  onClick={() => void handleItemClick(item, index)}
                  aria-current={index === live.cursor ? "true" : undefined}
                  aria-label={`${index + 1}. ${item.title ?? getPlanKindDefaultTitle(item.kind)}`}
                >
                  <KindBadge kind={item.kind as CpPlanItemKind} className="text-[9px] px-1 py-0" />
                  <span className="text-[9px] text-text-muted max-w-[60px] truncate">
                    {item.title?.trim() || getPlanKindDefaultTitle(item.kind)}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
