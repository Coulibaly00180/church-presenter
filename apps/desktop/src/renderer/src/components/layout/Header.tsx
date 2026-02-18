import React, { useEffect, useState } from "react";
import { Monitor, MonitorOff, Moon, Sun, Settings, Palette, Keyboard, Plus } from "lucide-react";
import { ProjectionSettings } from "@/components/dialogs/ProjectionSettings";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { hydrateShortcuts, matchAction } from "@/lib/shortcuts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { localNowYmd } from "@/lib/date";
import { toast } from "sonner";
import { getTemplates, type PlanTemplate } from "@/lib/templates";
import { TemplatePickerDialog } from "@/components/dialogs/TemplatePickerDialog";
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("Culte");
  const [newPlanDate, setNewPlanDate] = useState(localNowYmd());
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [pendingNewDate, setPendingNewDate] = useState<string | null>(null);
  const [pendingNewTitle, setPendingNewTitle] = useState("Culte");

  const refreshPlans = () => window.cp.plans.list().then(setPlans).catch(() => null);

  useEffect(() => {
    refreshPlans();
  }, []);

  useEffect(() => {
    if (!window.cp.projectionWindow) return;
    window.cp.projectionWindow.isOpen().then((r) => setProjOpen(!!r?.isOpen));
    const off = window.cp.projectionWindow.onWindowState((p) => setProjOpen(!!p?.isOpen));
    return () => off?.();
  }, []);

  useEffect(() => {
    void hydrateShortcuts();
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

  // Projection shortcut (configurable)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchAction(e) === "toggleProjection") {
        e.preventDefault();
        toggleProjection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const createPlanDirect = async (ymd: string, title: string) => {
    const created = await window.cp.plans.create({ dateIso: ymd, title: title || "Culte" });
    if (created?.id) {
      toast.success("Plan cree");
      await refreshPlans();
      onSelectPlan(created.id);
    }
  };

  const handleNewPlan = async () => {
    const templates = await getTemplates();
    if (templates.length > 0) {
      setPendingNewDate(newPlanDate);
      setPendingNewTitle(newPlanTitle);
      setTemplatePickerOpen(true);
    } else {
      await createPlanDirect(newPlanDate, newPlanTitle);
    }
    setNewPlanOpen(false);
  };

  const handleTemplateSelect = async (template: PlanTemplate) => {
    if (!pendingNewDate) return;
    const created = await window.cp.plans.create({ dateIso: pendingNewDate, title: pendingNewTitle || "Culte" });
    if (created?.id) {
      for (const item of template.items) {
        await window.cp.plans.addItem({
          planId: created.id,
          kind: item.kind,
          title: item.title ?? undefined,
          content: item.content ?? undefined,
          refId: item.refId ?? undefined,
          refSubId: item.refSubId ?? undefined,
          mediaPath: item.mediaPath ?? undefined,
        });
      }
      toast.success("Plan cree depuis template");
      await refreshPlans();
      onSelectPlan(created.id);
    }
    setPendingNewDate(null);
  };

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

      <Popover open={newPlanOpen} onOpenChange={setNewPlanOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Nouveau plan</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Nouveau plan</Label>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Nom</Label>
              <input
                type="text"
                title="Nom du plan"
                placeholder="Culte du dimanche"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Date</Label>
              <input
                type="date"
                title="Date du plan"
                value={newPlanDate}
                onChange={(e) => setNewPlanDate(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              />
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={handleNewPlan}>
              Creer le plan
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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
          <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
            <Keyboard className="h-3.5 w-3.5 mr-1.5" /> Raccourcis clavier
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
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <TemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={(v) => { setTemplatePickerOpen(v); if (!v) setPendingNewDate(null); }}
        onSelect={handleTemplateSelect}
        onSkip={() => { if (pendingNewDate) createPlanDirect(pendingNewDate, pendingNewTitle); setPendingNewDate(null); }}
      />
    </header>
  );
}
