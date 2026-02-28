import { useEffect, useState } from "react";
import { CalendarDays, Music2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePlanDialog } from "@/components/dialogs/CreatePlanDialog";
import { usePlan } from "@/hooks/usePlan";
import { localNowYmd, isoToYmd } from "@/lib/date";
import { cn } from "@/lib/utils";

function formatDate(iso: string | Date): string {
  const ymd = isoToYmd(iso);
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function relativeBadge(ymd: string): { label: string; cls: string } | null {
  const today = localNowYmd();
  if (ymd === today) return { label: "Aujourd'hui", cls: "bg-primary/10 text-primary" };
  const diff = Math.round(
    (new Date(ymd).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 1) return { label: "Demain", cls: "bg-success/10 text-success" };
  if (diff === -1) return { label: "Hier", cls: "bg-text-muted/10 text-text-muted" };
  if (diff > 1 && diff <= 7) return { label: `Dans ${diff}j`, cls: "bg-info/10 text-info" };
  return null;
}

export function Dashboard() {
  const { planList, selectPlan, createPlan } = usePlan();
  const [songCount, setSongCount] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    window.cp.songs.list().then((songs) => setSongCount(songs.length)).catch(() => null);
  }, []);

  const today = localNowYmd();
  const todayPlan = planList.find((p) => isoToYmd(p.date) === today);

  // Show up to 6 plans (upcoming first, then recent)
  const upcoming = planList
    .filter((p) => isoToYmd(p.date) >= today)
    .slice(0, 6);
  const recent = planList
    .filter((p) => isoToYmd(p.date) < today)
    .slice(0, Math.max(0, 6 - upcoming.length));
  const displayPlans = [...upcoming, ...recent];

  const handleCreateToday = async () => {
    const plan = await createPlan({ dateIso: today });
    if (plan) selectPlan(plan.id);
  };

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto py-10 px-6 gap-8">
        {/* Header */}
        <div className="text-center space-y-1 max-w-sm">
          <h1 className="text-xl font-semibold text-text-primary">Bienvenue</h1>
          <p className="text-sm text-text-muted">
            {formatDate(today)}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 flex-wrap justify-center">
          {todayPlan ? (
            <Button
              onClick={() => selectPlan(todayPlan.id)}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Ouvrir le culte d'aujourd'hui
            </Button>
          ) : (
            <Button onClick={() => void handleCreateToday()} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer le culte d'aujourd'hui
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <CalendarDays className="h-4 w-4" />
            Nouveau plan…
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-center">
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-bg-elevated border border-border">
            <span className="text-lg font-bold tabular-nums text-text-primary">
              {planList.length}
            </span>
            <span className="text-xs text-text-muted">Plan{planList.length !== 1 ? "s" : ""}</span>
          </div>
          {songCount !== null && (
            <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-bg-elevated border border-border">
              <span className="text-lg font-bold tabular-nums text-text-primary">
                {songCount}
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Music2 className="h-2.5 w-2.5" />
                Chant{songCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Plans list */}
        {displayPlans.length > 0 && (
          <div className="w-full max-w-md space-y-1">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide px-1 mb-2">
              Plans
            </p>
            {displayPlans.map((p) => {
              const ymd = isoToYmd(p.date);
              const badge = ymd ? relativeBadge(ymd) : null;
              const isToday = ymd === today;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors",
                    "hover:bg-bg-elevated hover:border-border",
                    isToday
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-bg-surface"
                  )}
                  onClick={() => selectPlan(p.id)}
                >
                  <CalendarDays className={cn(
                    "h-4 w-4 shrink-0",
                    isToday ? "text-primary" : "text-text-muted"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isToday ? "text-primary" : "text-text-primary"
                    )}>
                      {p.title ?? formatDate(p.date)}
                    </p>
                    {p.title && (
                      <p className="text-xs text-text-muted truncate">{formatDate(p.date)}</p>
                    )}
                  </div>
                  {badge && (
                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0", badge.cls)}>
                      {badge.label}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreatePlanDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </>
  );
}
