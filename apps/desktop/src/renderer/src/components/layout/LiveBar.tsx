import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MonitorSmartphone,
  Lock,
  Unlock,
  MessageSquarePlus,
  Palette,
  ImagePlus,
  Trash2,
  Wifi,
  WifiOff,
  FileText,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { QuickProjectDialog } from "@/components/dialogs/QuickProjectDialog";
import { hydrateShortcuts, matchAction } from "@/lib/shortcuts";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

function toFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("file://") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const [pathOnly, frag] = path.split("#");
  const base =
    pathOnly.startsWith("\\\\")
      ? `file:${pathOnly.replace(/\\/g, "/")}`
      : `file:///${pathOnly.replace(/\\/g, "/")}`;
  return frag ? `${base}#${frag}` : base;
}

function projectionBackground(state: CpProjectionState | null) {
  if (!state) return "#050505";
  if (state.mode === "BLACK") return "#000000";
  if (state.mode === "WHITE") return "#ffffff";

  const bgMode = state.backgroundMode || "SOLID";
  const from = state.backgroundGradientFrom || "#2563eb";
  const to = state.backgroundGradientTo || "#7c3aed";
  const angle = state.backgroundGradientAngle ?? 135;

  if (bgMode === "GRADIENT_LINEAR") return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
  if (bgMode === "GRADIENT_RADIAL") return `radial-gradient(circle at center, ${from} 0%, ${to} 100%)`;
  return state.background || "#050505";
}

function modeLabel(mode: CpProjectionMode) {
  if (mode === "BLACK") return "Noir";
  if (mode === "WHITE") return "Blanc";
  return "Normal";
}

function currentPreview(current: CpProjectionCurrent) {
  if (current.kind === "TEXT") {
    const title = (current.title || "").trim() || "Texte";
    const body = String(current.body || "").trim();
    return { title, body: body.slice(0, 120), kind: "TEXT" as const };
  }
  if (current.kind === "MEDIA") {
    const fileName = current.mediaPath?.split(/[\\/]/).pop() || "";
    if (current.mediaType === "IMAGE") {
      return {
        title: (current.title || "").trim() || "Image",
        body: fileName,
        kind: "MEDIA_IMAGE" as const,
      };
    }
    return {
      title: (current.title || "").trim() || "PDF",
      body: fileName,
      kind: "MEDIA_PDF" as const,
    };
  }
  return { title: "Vide", body: "", kind: "EMPTY" as const };
}

type ScreenMiniCardProps = {
  screen: ScreenKey;
  state: CpProjectionState | null;
  isTarget: boolean;
  isOpen: boolean;
  isLocked: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
};

function ScreenMiniCard({
  screen,
  state,
  isTarget,
  isOpen,
  isLocked,
  onClick,
  onDoubleClick,
}: ScreenMiniCardProps) {
  const mode = state?.mode || "NORMAL";
  const current = currentPreview(state?.current ?? { kind: "EMPTY" });
  const bg = projectionBackground(state);
  const textColor = mode === "WHITE" ? "#111111" : "#ffffff";
  const isImage = current.kind === "MEDIA_IMAGE" && state?.current.kind === "MEDIA" && state.current.mediaPath;

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "group w-[132px] rounded-md border overflow-hidden text-left transition-colors",
        isTarget ? "border-primary ring-1 ring-primary/40" : "border-border/60 hover:border-primary/50",
        !isOpen && "opacity-65",
      )}
      title={`Ecran ${screen} - ${isOpen ? "ouvert" : "ferme"} - double clic pour ouvrir/fermer`}
    >
      <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-border/60 bg-muted/50">
        <span className="text-[10px] font-semibold tracking-wide">ECRAN {screen}</span>
        <div className="flex items-center gap-1">
          {isLocked && <Lock className="h-2.5 w-2.5 text-destructive" />}
          <span className="text-[9px] text-muted-foreground">{modeLabel(mode)}</span>
        </div>
      </div>

      <div className="relative aspect-video" style={{ background: bg, color: textColor }}>
        {isImage && (
          <img
            src={toFileUrl(state.current.mediaPath)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 p-1.5 flex flex-col justify-center bg-black/25">
          <div className="text-[10px] font-semibold truncate leading-tight">{current.title}</div>
          {current.body ? (
            <div className="text-[9px] opacity-90 line-clamp-2 leading-tight mt-0.5">{current.body}</div>
          ) : null}
        </div>

        <div className="absolute top-1 right-1 rounded-sm bg-black/40 px-1 py-0.5">
          {current.kind === "TEXT" && <Type className="h-2.5 w-2.5 text-white/90" />}
          {current.kind === "MEDIA_PDF" && <FileText className="h-2.5 w-2.5 text-white/90" />}
          {current.kind === "MEDIA_IMAGE" && <ImagePlus className="h-2.5 w-2.5 text-white/90" />}
        </div>
      </div>
    </button>
  );
}

export function LiveBar() {
  const [live, setLive] = useState<CpLiveState | null>(null);
  const [screens, setScreens] = useState<CpScreenMeta[]>([]);
  const [screenStates, setScreenStates] = useState<Record<ScreenKey, CpProjectionState | null>>({
    A: null,
    B: null,
    C: null,
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [bg, setBg] = useState("#050505");
  const [fg, setFg] = useState("#ffffff");
  const [scale, setScale] = useState(1);
  const [bgImage, setBgImage] = useState("");
  const [syncStatus, setSyncStatus] = useState<CpSyncStatus | null>(null);

  useEffect(() => {
    if (!window.cp.live) return;
    window.cp.live.get().then(setLive).catch(() => null);
    const off = window.cp.live.onUpdate(setLive);
    return () => off?.();
  }, []);

  useEffect(() => {
    if (!window.cp.screens) return;
    window.cp.screens.list().then(setScreens);
    const offs = (["A", "B", "C"] as ScreenKey[]).map((k) =>
      window.cp.screens.onWindowState(k, (p) =>
        setScreens((prev) => prev.map((s) => (s.key === k ? { ...s, isOpen: !!p.isOpen } : s)))
      )
    );
    return () => offs.forEach((off) => off?.());
  }, []);

  useEffect(() => {
    if (!window.cp.screens) return;
    const keys = ["A", "B", "C"] as ScreenKey[];
    let canceled = false;

    void Promise.all(keys.map(async (key) => ({ key, state: await window.cp.screens.getState(key) })))
      .then((rows) => {
        if (canceled) return;
        setScreenStates((prev) => {
          const next = { ...prev };
          rows.forEach(({ key, state }) => {
            next[key] = state;
          });
          return next;
        });
      })
      .catch(() => null);

    const offs = keys.map((key) =>
      window.cp.screens.onState(key, (state) => {
        setScreenStates((prev) => ({ ...prev, [key]: state }));
      })
    );

    return () => {
      canceled = true;
      offs.forEach((off) => off?.());
    };
  }, []);

  // Keyboard shortcuts (global)
  useEffect(() => {
    void hydrateShortcuts();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!window.cp.live) return;

      const action = matchAction(e);
      if (!action || action === "toggleProjection") return;
      e.preventDefault();

      switch (action) {
        case "targetA": window.cp.live.setTarget("A"); break;
        case "targetB": window.cp.live.setTarget("B"); break;
        case "targetC": window.cp.live.setTarget("C"); break;
        case "toggleBlack": window.cp.live.toggleBlack(); break;
        case "toggleWhite": window.cp.live.toggleWhite(); break;
        case "resume": window.cp.live.resume(); break;
        case "prev": window.cp.live.prev(); break;
        case "next": window.cp.live.next(); break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Sync status
  useEffect(() => {
    if (!window.cp.sync) return;
    window.cp.sync.status().then(setSyncStatus).catch(() => null);
    const off = window.cp.sync.onStatusChange(setSyncStatus);
    return () => off?.();
  }, []);

  // Load projection appearance
  useEffect(() => {
    window.cp.projection.getState().then((s) => {
      setBg(s.background || "#050505");
      setFg(s.foreground || "#ffffff");
      setScale(s.textScale || 1);
      setBgImage(s.backgroundImage || "");
    });
    const off = window.cp.projection.onState((s) => {
      setBg(s.background || "#050505");
      setFg(s.foreground || "#ffffff");
      setScale(s.textScale || 1);
      setBgImage(s.backgroundImage || "");
    });
    return () => off?.();
  }, []);

  const applyAppearance = (patch: { background?: string; foreground?: string; textScale?: number; backgroundImage?: string }) => {
    window.cp.projection.setAppearance(patch);
  };

  const pickBgImage = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && "path" in result) {
      setBgImage(result.path);
      applyAppearance({ backgroundImage: result.path });
    }
  };

  const clearBgImage = () => {
    setBgImage("");
    applyAppearance({ backgroundImage: "" });
  };

  const target = live?.target ?? "A";
  const locked = live?.lockedScreens ?? { A: false, B: false, C: false };

  const openScreen = async (key: ScreenKey) => {
    const meta = screens.find((s) => s.key === key);
    if (key === "A") {
      if (meta?.isOpen) {
        await window.cp.projectionWindow.close();
      } else {
        await window.cp.projectionWindow.open();
      }
    } else {
      if (meta?.isOpen) {
        await window.cp.screens.close(key);
      } else {
        await window.cp.screens.open(key);
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/60 bg-muted/50 dark:bg-secondary/30 shrink-0 flex-wrap">
      {/* Transport */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => window.cp.live?.prev()}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Precedent (Q / ←)</TooltipContent>
      </Tooltip>

      <Badge variant="outline" className="font-mono text-xs min-w-[2.5rem] h-7 justify-center">
        {live?.cursor ?? 0}
      </Badge>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => window.cp.live?.next()}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Suivant (D / → / Espace)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Screen target */}
      {(["A", "B", "C"] as ScreenKey[]).map((k) => {
        const meta = screens.find((s) => s.key === k);
        const isOpen = !!meta?.isOpen;
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <Button
                variant={target === k ? "default" : "outline"}
                size="xs"
                className={cn(!isOpen && "opacity-50")}
                onClick={() => window.cp.live?.setTarget(k)}
                onDoubleClick={() => openScreen(k)}
              >
                <MonitorSmartphone className="h-3 w-3" />
                {k}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Ecran {k} {isOpen ? "(ouvert)" : "(ferme)"} — dbl-clic pour ouvrir/fermer
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="flex items-center gap-1.5 flex-wrap">
        {(["A", "B", "C"] as ScreenKey[]).map((k) => {
          const meta = screens.find((s) => s.key === k);
          return (
            <ScreenMiniCard
              key={`mini-${k}`}
              screen={k}
              state={screenStates[k]}
              isTarget={target === k}
              isOpen={!!meta?.isOpen}
              isLocked={!!locked[k]}
              onClick={() => window.cp.live?.setTarget(k)}
              onDoubleClick={() => openScreen(k)}
            />
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Mode buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={live?.black ? "destructive" : "outline"}
            size="xs"
            onClick={() => window.cp.live?.toggleBlack()}
          >
            Noir
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ecran noir (B)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={live?.white ? "secondary" : "outline"}
            size="xs"
            onClick={() => window.cp.live?.toggleWhite()}
          >
            Blanc
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ecran blanc (W)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={() => window.cp.live?.resume()}>
            Normal
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reprendre (R)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Appearance popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="xs">
            <Palette className="h-3 w-3" />
            Style
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-64 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Fond</Label>
              <input
                type="color"
                title="Couleur de fond"
                value={bg}
                onChange={(e) => { setBg(e.target.value); applyAppearance({ background: e.target.value }); }}
                className="h-7 w-10 rounded border cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Texte</Label>
              <input
                type="color"
                title="Couleur du texte"
                value={fg}
                onChange={(e) => { setFg(e.target.value); applyAppearance({ foreground: e.target.value }); }}
                className="h-7 w-10 rounded border cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Taille</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                title="Taille du texte"
                min={0.5}
                max={3}
                step={0.1}
                value={scale}
                onChange={(e) => { const v = parseFloat(e.target.value); setScale(v); applyAppearance({ textScale: v }); }}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Image de fond</Label>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={pickBgImage}>
                  <ImagePlus className="h-2.5 w-2.5 mr-0.5" /> Choisir
                </Button>
                {bgImage && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={clearBgImage}>
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                )}
                {bgImage && <span className="text-[9px] text-muted-foreground truncate flex-1">{bgImage.split(/[\\/]/).pop()}</span>}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Lock buttons */}
      {(["A", "B", "C"] as ScreenKey[]).map((k) => (
        <Tooltip key={`lock-${k}`}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => window.cp.live?.setLocked(k, !locked[k])}
            >
              {locked[k]
                ? <Lock className="h-3 w-3 text-destructive" />
                : <Unlock className="h-3 w-3 text-muted-foreground" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{locked[k] ? `Deverrouiller ${k}` : `Verrouiller ${k}`}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={() => setQuickOpen(true)}>
            <MessageSquarePlus className="h-3 w-3" />
            Rapide
          </Button>
        </TooltipTrigger>
        <TooltipContent>Projeter un texte ou image libre</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Sync */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={syncStatus?.running ? "default" : "outline"}
            size="xs"
          >
            {syncStatus?.running
              ? <><Wifi className="h-3 w-3" /> Sync ({syncStatus.clients})</>
              : <><WifiOff className="h-3 w-3" /> Sync</>}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-3">
          <div className="space-y-2">
            <p className="text-xs font-medium">Synchronisation reseau</p>
            <p className="text-[10px] text-muted-foreground">
              Permet a d'autres postes de suivre et controler la projection via le reseau local.
            </p>
            {syncStatus?.running ? (
              <>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Port</span>
                    <span className="font-mono">{syncStatus.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clients</span>
                    <span className="font-mono">{syncStatus.clients}</span>
                  </div>
                  {syncStatus.addresses.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Adresses :</span>
                      {syncStatus.addresses.map((addr) => (
                        <div key={addr} className="font-mono text-[10px] ml-2">
                          ws://{addr}:{syncStatus.port}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-7 text-xs"
                  onClick={async () => {
                    await window.cp.sync.stop();
                    const s = await window.cp.sync.status();
                    setSyncStatus(s);
                  }}
                >
                  Arreter le serveur
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={async () => {
                  const result = await window.cp.sync.start();
                  if (result.ok) {
                    const s = await window.cp.sync.status();
                    setSyncStatus(s);
                  }
                }}
              >
                Demarrer le serveur
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      <span className="text-[10px] text-muted-foreground hidden sm:inline">
        1/2/3=ecran B/W/R=modes ←/→=nav
      </span>

      <QuickProjectDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
