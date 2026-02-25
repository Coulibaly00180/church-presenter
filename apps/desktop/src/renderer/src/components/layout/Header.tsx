import { useCallback, useState } from "react";
import { CalendarDays, ChevronDown, Circle, Copy, HelpCircle, Plus, Settings, Video } from "lucide-react";
import { toast } from "sonner";
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
import { localNowYmd, isoToYmd } from "@/lib/date";

interface HeaderProps {
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
}

function formatPlanLabel(plan: CpPlanListItem | { title?: string | null; date: string | Date } | undefined): string {
  if (!plan) return "Aucun plan";
  if (plan.title) return plan.title;
  const ymd = isoToYmd(String(plan.date));
  return ymd;
}

function isTodayPlan(plan: { date: string | Date } | undefined): boolean {
  if (!plan) return false;
  return isoToYmd(String(plan.date)) === localNowYmd();
}

export function Header({ onOpenShortcuts, onOpenSettings }: HeaderProps) {
  const { live, toggle } = useLive();
  const { planList, selectedPlanId, plan, selectPlan, createPlan, refreshList } = usePlan();
  const [creatingPlan, setCreatingPlan] = useState(false);

  const isLive = live?.enabled ?? false;

  const handleCreateToday = useCallback(async () => {
    setCreatingPlan(true);
    try {
      await createPlan({ dateIso: localNowYmd() });
    } finally {
      setCreatingPlan(false);
    }
  }, [createPlan]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedPlanId) return;
    const duplicated = await window.cp.plans.duplicate({ planId: selectedPlanId });
    if (duplicated) {
      await refreshList();
      selectPlan(duplicated.id);
      toast.success("Plan dupliqué");
    }
  }, [selectedPlanId, refreshList, selectPlan]);

  return (
    <header
      className="flex items-center justify-between px-4 border-b border-border bg-bg-surface shrink-0 h-12"
    >
      {/* Left: Logo + Plan selector */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Video className="h-4 w-4 text-primary" />
          <span className="font-semibold text-text-primary text-sm hidden sm:block">Church Presenter</span>
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        {/* Plan selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 max-w-[220px] h-8 px-2"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate text-sm font-medium">
                {plan ? formatPlanLabel(plan) : "Aucun plan"}
              </span>
              {plan && isTodayPlan(plan) && (
                <span className="text-[9px] font-semibold bg-success/15 text-success px-1 py-0.5 rounded shrink-0">
                  Auj.
                </span>
              )}
              <ChevronDown className="h-3 w-3 shrink-0 text-text-muted ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs">Plans de culte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {planList.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-muted">
                Aucun plan disponible
              </div>
            ) : (
              planList.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const isToday = isTodayPlan(p);
                return (
                  <DropdownMenuItem
                    key={p.id}
                    className={cn(isSelected && "bg-bg-elevated font-medium")}
                    onClick={() => selectPlan(p.id)}
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate flex-1">{formatPlanLabel(p)}</span>
                    {isToday && (
                      <span className="text-[9px] font-semibold bg-success/15 text-success px-1 py-0.5 rounded shrink-0">
                        Auj.
                      </span>
                    )}
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            {plan && (
              <DropdownMenuItem onClick={() => void handleDuplicate()}>
                <Copy className="h-3.5 w-3.5" />
                Dupliquer ce plan
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => void handleCreateToday()} disabled={creatingPlan}>
              <Plus className="h-3.5 w-3.5" />
              {creatingPlan ? "Création…" : "Nouveau plan"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Live toggle */}
        <Button
          variant={isLive ? "destructive" : "default"}
          size="sm"
          onClick={() => void toggle()}
          className={cn(
            "gap-1.5 h-8 px-3 font-medium",
            !isLive && "bg-success hover:bg-success/90 text-white",
          )}
          aria-label={isLive ? "Quitter le mode Direct" : "Passer en mode Direct"}
        >
          {isLive ? (
            <>
              <Circle className="h-2.5 w-2.5 fill-current animate-pulse" />
              Direct
            </>
          ) : (
            <>
              <Video className="h-3.5 w-3.5" />
              Mode Direct
            </>
          )}
        </Button>

        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            aria-label="Paramètres"
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {onOpenShortcuts && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenShortcuts}
            aria-label="Raccourcis clavier (?)"
            className="h-8 w-8"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
