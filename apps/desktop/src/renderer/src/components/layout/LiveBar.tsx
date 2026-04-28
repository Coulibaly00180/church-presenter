import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Clock, Monitor, MoonStar, Pause, Play, SlidersHorizontal, Square, Sun, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidePreview } from "@/components/live/SlidePreview";
import { NavControls } from "@/components/live/NavControls";
import { ScreenSelector } from "@/components/live/ScreenSelector";
import { KindBadge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { useShortcuts } from "@/hooks/useShortcuts";
import { projectPlanItemToTarget, parsePlanBackground } from "@/lib/projection";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { estimateItemDurationSeconds, formatMinutes } from "@/lib/planDuration";
import { cn } from "@/lib/utils";
import type { PlanItem } from "@/lib/types";

const AUTO_INTERVALS = [5, 10, 15, 20, 30, 60] as const;
type AutoInterval = (typeof AUTO_INTERVALS)[number];

function parseSecondaryTexts(secondaryContent: string | null | undefined) {
  if (!secondaryContent) return undefined;
  try {
    return JSON.parse(secondaryContent) as Array<{ label: string; body: string }>;
  } catch {
    return undefined;
  }
}

function inferPreviewMediaType(kind: CpPlanItemKind): CpMediaType | null {
  if (kind === "ANNOUNCEMENT_IMAGE") return "IMAGE";
  if (kind === "ANNOUNCEMENT_PDF") return "PDF";
  if (kind === "ANNOUNCEMENT_VIDEO") return "VIDEO";
  return null;
}

function buildPreviewState(item: CpPlanItem, planBackground?: CpItemBackground): CpProjectionState {
  const title = item.title?.trim() || getPlanKindDefaultTitle(item.kind);
  const itemBackground = parsePlanBackground(item.backgroundConfig);
  const backgroundOverride =
    (planBackground || itemBackground) ? { ...planBackground, ...itemBackground } : undefined;
  const mediaType = inferPreviewMediaType(item.kind as CpPlanItemKind);

  return {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    textFont: "",
    background: backgroundOverride?.background ?? "#000",
    backgroundMode: backgroundOverride?.backgroundMode,
    backgroundGradientFrom: backgroundOverride?.backgroundGradientFrom,
    backgroundGradientTo: backgroundOverride?.backgroundGradientTo,
    backgroundGradientAngle: backgroundOverride?.backgroundGradientAngle,
    foreground: backgroundOverride?.foreground ?? "#fff",
    current: mediaType
      ? {
          kind: "MEDIA",
          title,
          mediaType,
          mediaPath: item.mediaPath ?? undefined,
        }
      : {
          kind: "TEXT",
          title: item.kind === "TIMER" ? `TIMER:${title}` : title,
          body: item.content ?? "",
          secondaryTexts: parseSecondaryTexts(item.secondaryContent),
          backgroundOverride,
        },
    updatedAt: 0,
  };
}

type LiveToolsPopoverProps = {
  autoEnabled: boolean;
  autoInterval: AutoInterval;
  hasPlanMode: boolean;
  hasVideo: boolean;
  isVideoPlaying: boolean;
  videoVolume: number;
  onSetAutoEnabled: (value: boolean) => void;
  onSetAutoInterval: (value: AutoInterval) => void;
  onToggleVideo: () => void;
  onSetVideoVolume: (value: number) => void;
};

function LiveToolsPopover({
  autoEnabled,
  autoInterval,
  hasPlanMode,
  hasVideo,
  isVideoPlaying,
  videoVolume,
  onSetAutoEnabled,
  onSetAutoInterval,
  onToggleVideo,
  onSetVideoVolume,
}: LiveToolsPopoverProps) {
  if (!hasPlanMode && !hasVideo) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl px-3"
          aria-label="Outils de projection"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Outils
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          {hasPlanMode && (
            <section className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Auto-avance
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Lance une avance automatique sur le plan actif.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={autoEnabled ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5", autoEnabled && "bg-accent text-white hover:bg-accent/90")}
                  onClick={() => onSetAutoEnabled(!autoEnabled)}
                  aria-pressed={autoEnabled}
                >
                  {autoEnabled ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {autoEnabled ? "Arreter" : "Activer"}
                </Button>
                <select
                  value={autoInterval}
                  onChange={(e) => onSetAutoInterval(Number(e.target.value) as AutoInterval)}
                  className="h-8 min-w-[84px] rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary"
                  aria-label="Intervalle auto-avance"
                >
                  {AUTO_INTERVALS.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds}s
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {hasPlanMode && hasVideo && <div className="h-px bg-border" />}

          {hasVideo && (
            <section className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Video
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Lecture et volume du media actuellement projete.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onToggleVideo}
                  aria-label={isVideoPlaying ? "Mettre la video en pause" : "Lire la video"}
                >
                  {isVideoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isVideoPlaying ? "Pause" : "Lire"}
                </Button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                  onClick={() => onSetVideoVolume(videoVolume > 0 ? 0 : 1)}
                  aria-label={videoVolume > 0 ? "Couper le son" : "Retablir le son"}
                >
                  {videoVolume > 0
                    ? <Volume2 className="h-3.5 w-3.5" />
                    : <VolumeX className="h-3.5 w-3.5" />
                  }
                </button>
                <input
                  type="range"
                  aria-label="Volume video"
                  min={0}
                  max={1}
                  step={0.05}
                  value={videoVolume}
                  onChange={(e) => onSetVideoVolume(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
            </section>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LiveBar() {
  const { live, toggle, toggleBlack, toggleWhite, resume } = useLive();
  const { plan } = usePlan();
  const [currentState, setCurrentState] = useState<CpProjectionState | null>(null);
  const [nextState, setNextState] = useState<CpProjectionState | null>(null);

  const isEnabled = live?.enabled ?? false;
  const isPlanMode = isEnabled && live?.planId !== null;
  const isFreeMode = isEnabled && live?.planId === null;

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoInterval, setAutoInterval] = useState<AutoInterval>(15);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isEnabled) setAutoEnabled(false);
  }, [isEnabled]);

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
      const seconds = Math.floor(remaining);
      setTimerCountdown(
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
      );
    };
    calc();
    const id = setInterval(calc, 250);
    return () => clearInterval(id);
  }, [currentState]);

  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoVolume, setVideoVolume] = useState(1);

  useEffect(() => {
    if (currentState?.current?.mediaType === "VIDEO") {
      setIsVideoPlaying(true);
    }
  }, [currentState?.current?.mediaPath]);

  const handleVideoToggle = useCallback(async () => {
    const next = !isVideoPlaying;
    setIsVideoPlaying(next);
    await window.cp.live.videoControl(next ? "PLAY" : "PAUSE");
  }, [isVideoPlaying]);

  const handleVideoVolume = useCallback(async (value: number) => {
    setVideoVolume(value);
    await window.cp.live.videoVolume(value);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    void window.cp.projection.getState().then(setCurrentState);
    const unsub = window.cp.projection.onState(setCurrentState);
    return unsub;
  }, [isEnabled]);

  useEffect(() => {
    if (!live || !plan) return;
    const nextItem = plan.items[live.cursor + 1];
    const planBackground = parsePlanBackground(plan.backgroundConfig);
    setNextState(nextItem ? buildPreviewState(nextItem, planBackground) : null);
  }, [live, plan]);

  const handleItemClick = useCallback(async (item: CpPlanItem, index: number) => {
    await window.cp.live.setCursor(index);
    if (live) {
      await projectPlanItemToTarget(live.target, item as PlanItem, live, parsePlanBackground(plan?.backgroundConfig));
    }
  }, [live, plan]);

  const handleNavigate = useCallback(async (dir: 1 | -1) => {
    const currentCursor = live?.cursor ?? 0;
    const itemCount = plan?.items.length ?? 0;
    const nextCursor = Math.max(0, Math.min(currentCursor + dir, itemCount - 1));
    if (dir > 0) await window.cp.live.next();
    else await window.cp.live.prev();

    const item = plan?.items[nextCursor];
    if (item && live) {
      await projectPlanItemToTarget(live.target, item as PlanItem, live, parsePlanBackground(plan?.backgroundConfig));
    }
  }, [live, plan]);

  useShortcuts(
    useCallback((action) => {
      switch (action) {
        case "next": void handleNavigate(1); break;
        case "prev": void handleNavigate(-1); break;
        case "toggleBlack": void toggleBlack(); break;
        case "toggleWhite": void toggleWhite(); break;
        case "resume": void resume(); break;
        case "targetA": void window.cp.live.setTarget("A"); break;
        case "targetB": void window.cp.live.setTarget("B"); break;
        case "targetC": void window.cp.live.setTarget("C"); break;
      }
    }, [handleNavigate, toggleBlack, toggleWhite, resume]),
    isEnabled
  );

  if (!isEnabled || !live) return null;

  const isBlack = live.black;
  const isWhite = live.white;
  const currentItem = plan?.items[live.cursor];
  const nextItem = plan?.items[live.cursor + 1];
  const currentLabel = currentItem?.title?.trim() || (currentItem ? getPlanKindDefaultTitle(currentItem.kind) : "En cours");
  const nextLabel = nextItem?.title?.trim() || (nextItem ? getPlanKindDefaultTitle(nextItem.kind) : "Aucun element suivant");
  const hasVideoControls = currentState?.current?.mediaType === "VIDEO";

  const itemDurations = plan?.items.map(estimateItemDurationSeconds) ?? [];
  const totalDurationSeconds = itemDurations.reduce((sum, duration) => sum + duration, 0);
  const completedSeconds = itemDurations.slice(0, live.cursor).reduce((sum, duration) => sum + duration, 0);
  const progressPercent = totalDurationSeconds > 0 ? (completedSeconds / totalDurationSeconds) * 100 : 0;
  const remainingSeconds = totalDurationSeconds - completedSeconds;
  const remainingLabel = totalDurationSeconds > 0 ? formatMinutes(remainingSeconds) : null;

  return (
    <div
      className="flex flex-col overflow-hidden border-t border-border bg-bg-base h-[var(--live-bar-height)] min-h-[var(--live-bar-height)]"
      role="region"
      aria-label="Barre Mode Direct"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                isFreeMode
                  ? "border-warning/30 bg-warning/15 text-warning"
                  : "border-live-indicator/25 bg-live-indicator/15 text-live-indicator",
              )}
            >
              <Circle className="h-2.5 w-2.5 fill-current animate-pulse" />
              {isFreeMode ? "Libre" : "Direct"}
            </span>
            {isPlanMode && plan && (
              <span className="rounded-full border border-border bg-bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {live.cursor + 1} / {plan.items.length}
              </span>
            )}
            {timerCountdown && (
              <div className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5">
                <Clock className="h-3 w-3 shrink-0 text-warning" />
                <span className="text-xs font-bold tabular-nums text-warning">{timerCountdown}</span>
              </div>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-text-primary">
            {currentLabel}
          </p>
          <p className="truncate text-xs text-text-muted">
            {isPlanMode
              ? `${nextItem ? `Puis ${nextLabel}` : "Dernier element du plan"}${remainingLabel ? ` • ${remainingLabel} restantes` : ""}`
              : "Projection libre depuis les sources, la Bible ou les medias."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-elevated/35 p-1">
            <Button
              variant={isBlack ? "default" : "ghost"}
              size="xs"
              onClick={() => void toggleBlack()}
              className={cn("gap-1 rounded-lg", isBlack && "bg-text-primary text-bg-base")}
              aria-pressed={isBlack}
            >
              <MoonStar className="h-3.5 w-3.5" />
              Noir
            </Button>
            <Button
              variant={isWhite ? "default" : "ghost"}
              size="xs"
              onClick={() => void toggleWhite()}
              className={cn("gap-1 rounded-lg", isWhite && "border border-border bg-white text-black")}
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
                className="gap-1 rounded-lg text-success"
              >
                <Monitor className="h-3.5 w-3.5" />
                Reprendre
              </Button>
            )}
          </div>

          {isPlanMode && (
            <NavControls
              className="shrink-0"
              onPrev={() => void handleNavigate(-1)}
              onNext={() => void handleNavigate(1)}
            />
          )}

          <ScreenSelector />

          <LiveToolsPopover
            autoEnabled={autoEnabled}
            autoInterval={autoInterval}
            hasPlanMode={isPlanMode}
            hasVideo={hasVideoControls}
            isVideoPlaying={isVideoPlaying}
            videoVolume={videoVolume}
            onSetAutoEnabled={setAutoEnabled}
            onSetAutoInterval={setAutoInterval}
            onToggleVideo={() => void handleVideoToggle()}
            onSetVideoVolume={(value) => void handleVideoVolume(value)}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void toggle()}
            className="gap-1.5 rounded-xl px-3 text-text-secondary"
            aria-label={isFreeMode ? "Quitter le Mode Libre" : "Quitter le mode Direct"}
          >
            <X className="h-3.5 w-3.5" />
            Quitter
          </Button>
        </div>
      </div>

      {totalDurationSeconds > 0 && (
        <div className="h-0.5 shrink-0 bg-border">
          <div
            className="h-full bg-primary/60 transition-[width] duration-500 ease-out"
            ref={(element) => {
              if (element) element.style.width = `${progressPercent}%`;
            }}
          />
        </div>
      )}

      <div className="flex flex-1 items-stretch gap-4 overflow-hidden px-4 py-3">
        <div className="flex shrink-0 items-stretch gap-3">
          <SlidePreview
            projectionState={currentState}
            variant="current"
            label={currentLabel}
            className="w-[156px] shrink-0"
          />

          {isPlanMode && (
            <SlidePreview
              projectionState={nextState}
              variant="next"
              label={nextLabel}
              className="w-[124px] shrink-0"
              onClick={nextItem ? () => void handleItemClick(nextItem, live.cursor + 1) : undefined}
            />
          )}
        </div>

        {isPlanMode && plan ? (
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-bg-elevated/25 px-2 py-2">
            <ScrollArea className="h-full">
              <div className="flex gap-2">
                {plan.items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex min-w-[96px] flex-col items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                      index === live.cursor
                        ? "border-primary/40 bg-primary/10 shadow-sm"
                        : "border-border bg-bg-surface hover:bg-bg-elevated",
                    )}
                    onClick={() => void handleItemClick(item, index)}
                    aria-current={index === live.cursor ? "true" : undefined}
                    aria-label={`${index + 1}. ${item.title ?? getPlanKindDefaultTitle(item.kind)}`}
                  >
                    <div className="flex w-full items-center gap-2">
                      <KindBadge kind={item.kind as CpPlanItemKind} className="text-xs px-1.5 py-0.5" />
                      <span className="ml-auto text-[11px] font-medium tabular-nums text-text-muted">
                        {index + 1}
                      </span>
                    </div>
                    <span className="line-clamp-2 text-xs font-medium leading-snug text-text-primary">
                      {item.title?.trim() || getPlanKindDefaultTitle(item.kind)}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elevated/20 px-6 text-center">
            <p className="max-w-md text-sm text-text-muted">
              Choisissez un chant, un texte ou un passage biblique pour projeter en libre,
              puis utilisez les fleches du clavier pour naviguer rapidement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
