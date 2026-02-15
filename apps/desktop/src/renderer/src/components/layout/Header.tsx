import React, { useEffect, useState } from "react";
import { Monitor, MonitorOff, Moon, Sun, Settings, Palette } from "lucide-react";
import { ProjectionSettings } from "@/components/dialogs/ProjectionSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanListItem = {
  id: string;
  date: string | Date;
  title?: string | null;
};

type HeaderProps = {
  planId: string | null;
  onSelectPlan: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenHistory?: () => void;
};

function formatPlanLabel(plan: PlanListItem) {
  const d = typeof plan.date === "string" ? new Date(plan.date) : plan.date;
  const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${dateStr} — ${plan.title || "Culte"}`;
}

export function Header({ planId, onSelectPlan, theme, onToggleTheme, onOpenHistory }: HeaderProps) {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [projOpen, setProjOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    window.cp.plans.list().then(setPlans).catch(() => null);
  }, []);

  useEffect(() => {
    if (!window.cp.projectionWindow) return;
    window.cp.projectionWindow.isOpen().then((r) => setProjOpen(!!r?.isOpen));
    const off = window.cp.projectionWindow.onWindowState((p) => setProjOpen(!!p?.isOpen));
    return () => off?.();
  }, []);

  const toggleProjection = async () => {
    if (!window.cp.projectionWindow) return;
    if (projOpen) {
      const r = await window.cp.projectionWindow.close();
      setProjOpen(!!r?.isOpen);
    } else {
      const r = await window.cp.projectionWindow.open();
      setProjOpen(!!r?.isOpen);
    }
  };

  // Ctrl+P shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        toggleProjection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <header className="flex items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-muted/50 dark:bg-secondary/30 shrink-0">
      <h1 className="text-sm font-semibold whitespace-nowrap">Church Presenter</h1>

      <Select value={planId ?? ""} onValueChange={onSelectPlan}>
        <SelectTrigger className="w-[240px] h-8 text-xs">
          <SelectValue placeholder="Choisir un plan..." />
        </SelectTrigger>
        <SelectContent>
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {formatPlanLabel(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={projOpen ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={toggleProjection}
          >
            {projOpen ? <Monitor className="h-3.5 w-3.5 mr-1" /> : <MonitorOff className="h-3.5 w-3.5 mr-1" />}
            Projection
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ctrl+P pour basculer</TooltipContent>
      </Tooltip>

      <Badge variant={projOpen ? "default" : "secondary"} className="text-[10px]">
        {projOpen ? "ON" : "OFF"}
      </Badge>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{theme === "dark" ? "Mode clair" : "Mode sombre"}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
            <Palette className="h-3.5 w-3.5 mr-1.5" /> Apparence projection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenHistory}>
            Import / Export
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.cp.devtools?.open?.("REGIE")}>
            DevTools Regie
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.cp.devtools?.open?.("PROJECTION")}>
            DevTools Projection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectionSettings open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </header>
  );
}
