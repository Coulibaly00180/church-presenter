import { useState } from "react";
import { CalendarDays, ChevronDown, HelpCircle, Plus, Settings, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
  onCreatePlan?: () => void;
}

export function Header({ onOpenShortcuts, onOpenSettings, onCreatePlan }: HeaderProps) {
  const { live, toggle } = useLive();
  const { planList, selectedPlanId, plan, selectPlan } = usePlan();
  const [creatingPlan, setCreatingPlan] = useState(false);

  const isLive = live?.enabled ?? false;

  const handleCreateToday = async () => {
    setCreatingPlan(true);
    try {
      onCreatePlan?.();
    } finally {
      setCreatingPlan(false);
    }
  };

  return (
    <header
      className="flex items-center justify-between px-4 border-b border-border bg-bg-surface"
      style={{ height: "var(--header-height)" }}
    >
      {/* Left: Logo + Plan selector */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-text-primary text-sm">Church Presenter</span>

        <div className="w-px h-5 bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 max-w-[200px]">
              <CalendarDays className="h-4 w-4 shrink-0 text-text-secondary" />
              <span className="truncate text-sm">
                {plan?.title ?? plan?.date
                  ? String(plan.title ?? plan.date)
                  : "Aucun plan"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Plans de culte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {planList.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-text-muted">
                Aucun plan disponible
              </div>
            ) : (
              planList.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={cn(selectedPlanId === p.id && "bg-bg-elevated")}
                  onClick={() => selectPlan(p.id)}
                >
                  <CalendarDays className="h-4 w-4 text-text-secondary" />
                  <span className="truncate">{p.title ?? String(p.date)}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateToday} disabled={creatingPlan}>
              <Plus className="h-4 w-4" />
              Nouveau plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={isLive ? "destructive" : "default"}
          size="sm"
          onClick={() => void toggle()}
          className="gap-1.5"
          aria-label={isLive ? "Quitter le mode Direct" : "Passer en mode Direct"}
        >
          <Video className="h-4 w-4" />
          {isLive ? "Quitter Direct" : "Mode Direct"}
        </Button>

        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            aria-label="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {onOpenShortcuts && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenShortcuts}
            aria-label="Raccourcis clavier"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
