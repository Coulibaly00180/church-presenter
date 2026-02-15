import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MonitorSmartphone,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

export function LiveBar() {
  const [live, setLive] = useState<CpLiveState | null>(null);
  const [screens, setScreens] = useState<CpScreenMeta[]>([]);

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

  // Keyboard shortcuts (global)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!window.cp.live) return;

      switch (e.key) {
        case "1": e.preventDefault(); window.cp.live.setTarget("A"); break;
        case "2": e.preventDefault(); window.cp.live.setTarget("B"); break;
        case "3": e.preventDefault(); window.cp.live.setTarget("C"); break;
        case "b": case "B": e.preventDefault(); window.cp.live.toggleBlack(); break;
        case "w": case "W": e.preventDefault(); window.cp.live.toggleWhite(); break;
        case "r": case "R": e.preventDefault(); window.cp.live.resume(); break;
        case "ArrowLeft": case "q": case "Q":
          e.preventDefault(); window.cp.live.prev(); break;
        case "ArrowRight": case " ": case "d": case "D":
          e.preventDefault(); window.cp.live.next(); break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        const isOpen = k === "A" ? true : !!meta?.isOpen;
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

      <div className="flex-1" />

      <span className="text-[10px] text-muted-foreground hidden sm:inline">
        1/2/3=ecran B/W/R=modes ←/→=nav
      </span>
    </div>
  );
}
