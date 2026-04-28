import { useEffect, useState } from "react";
import { CalendarDays, FileDown, Music2, Plus, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePlanDialog } from "@/components/dialogs/CreatePlanDialog";
import { usePlan } from "@/hooks/usePlan";
import { localNowYmd, isoToYmd } from "@/lib/date";
import { cn } from "@/lib/utils";

function formatDate(iso: string | Date): string {
  const ymd = isoToYmd(iso);
  if (!ymd) return "—";
  const [year, month, day] = ymd.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
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
  if (diff > 1 && diff <= 7) return { label: `Dans ${diff}j`, cls: "bg-accent/10 text-accent" };
  return null;
}

interface DashboardProps {
  showQuickStart?: boolean;
  importingData?: boolean;
  onDismissQuickStart?: () => void;
  onCreateSong?: () => void;
  onImportData?: () => void;
}

export function Dashboard({
  showQuickStart = false,
  importingData = false,
  onDismissQuickStart,
  onCreateSong,
  onImportData,
}: DashboardProps) {
  const { planList, selectPlan, createPlan } = usePlan();
  const [songCount, setSongCount] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    window.cp.songs.list().then((songs) => setSongCount(songs.length)).catch(() => null);
  }, []);

  const today = localNowYmd();
  const todayPlan = planList.find((plan) => isoToYmd(plan.date) === today);

  const upcoming = planList
    .filter((plan) => isoToYmd(plan.date) >= today)
    .slice(0, 6);
  const recent = planList
    .filter((plan) => isoToYmd(plan.date) < today)
    .slice(0, Math.max(0, 6 - upcoming.length));
  const displayPlans = [...upcoming, ...recent];
  const nextPlan = upcoming.find((plan) => isoToYmd(plan.date) !== today) ?? null;

  const handleCreateToday = async () => {
    const plan = await createPlan({ dateIso: today });
    if (plan) selectPlan(plan.id);
  };

  return (
    <>
      <div className="flex flex-1 overflow-y-auto bg-bg-base px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Tableau de preparation
              </p>
              <h1 className="text-2xl font-semibold text-text-primary">Bienvenue</h1>
              <p className="text-sm text-text-muted">{formatDate(today)}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {todayPlan ? (
                <Button onClick={() => selectPlan(todayPlan.id)} className="gap-2 rounded-xl">
                  <CalendarDays className="h-4 w-4" />
                  Ouvrir le culte d'aujourd'hui
                </Button>
              ) : (
                <Button onClick={() => void handleCreateToday()} className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Créer le culte d'aujourd'hui
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => setCreateDialogOpen(true)}
              >
                <CalendarDays className="h-4 w-4" />
                Nouveau plan…
              </Button>
            </div>
          </div>

          {showQuickStart && (
            <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-bg-surface to-bg-surface px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm font-semibold">Premiers pas</p>
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                    La régie est prête. Créez votre premier chant, importez une base existante
                    ou fermez ce bloc pour démarrer directement dans l'application.
                  </p>
                </div>
                {onDismissQuickStart && (
                  <Button variant="ghost" size="sm" className="rounded-xl" onClick={onDismissQuickStart}>
                    Masquer
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {onCreateSong && (
                  <Button className="gap-2 rounded-xl" onClick={onCreateSong}>
                    <Music2 className="h-4 w-4" />
                    Créer votre premier chant
                  </Button>
                )}
                {onImportData && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={onImportData}
                    disabled={importingData}
                  >
                    <FileDown className="h-4 w-4" />
                    {importingData ? "Import en cours…" : "Importer des données existantes"}
                  </Button>
                )}
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <section className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Aujourd'hui
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-text-primary">
                    {todayPlan ? (todayPlan.title ?? formatDate(todayPlan.date)) : "Aucun culte planifié"}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {todayPlan
                      ? "Le plan du jour est prêt à être repris ou projeté."
                      : "Créez le service du jour pour préparer les chants, annonces et lectures."}
                  </p>
                </div>
                <div className="rounded-xl bg-primary/10 px-3 py-2 text-center text-primary">
                  <p className="text-lg font-bold tabular-nums">{planList.length}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide">Plans</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {todayPlan ? (
                  <Button onClick={() => selectPlan(todayPlan.id)} className="gap-2 rounded-xl">
                    <CalendarDays className="h-4 w-4" />
                    Reprendre le plan du jour
                  </Button>
                ) : (
                  <Button onClick={() => void handleCreateToday()} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" />
                    Créer le plan du jour
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <CalendarDays className="h-4 w-4" />
                  Préparer un autre service
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Bibliothèque
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-text-primary tabular-nums">
                    {songCount ?? "…"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    chant{songCount !== 1 ? "s" : ""} disponible{songCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <Music2 className="h-9 w-9 text-primary/60" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {songCount === 0
                  ? "La bibliothèque est encore vide. Commencez par créer un chant ou importer votre base."
                  : "La bibliothèque est prête pour la préparation des services et la projection libre."}
              </p>
              {(onCreateSong || onImportData) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {onCreateSong && (
                    <Button variant="outline" className="gap-2 rounded-xl" onClick={onCreateSong}>
                      <Plus className="h-4 w-4" />
                      Nouveau chant
                    </Button>
                  )}
                  {onImportData && (
                    <Button
                      variant="ghost"
                      className="gap-2 rounded-xl"
                      onClick={onImportData}
                      disabled={importingData}
                    >
                      <FileDown className="h-4 w-4" />
                      Importer
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Prochains plans
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text-primary">
                  {nextPlan ? (nextPlan.title ?? formatDate(nextPlan.date)) : "Aucun service à venir"}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {nextPlan
                    ? "Les prochains services restent à portée pour une reprise rapide."
                    : "Créez un plan pour visualiser votre prochaine préparation ici."}
                </p>
              </div>
              {nextPlan && (
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => selectPlan(nextPlan.id)}>
                  Ouvrir
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {displayPlans.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {displayPlans.map((plan) => {
                  const ymd = isoToYmd(plan.date);
                  const badge = ymd ? relativeBadge(ymd) : null;
                  const isToday = ymd === today;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                        isToday
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-bg-base hover:bg-bg-elevated",
                      )}
                      onClick={() => selectPlan(plan.id)}
                    >
                      <CalendarDays className={cn(
                        "h-4 w-4 shrink-0",
                        isToday ? "text-primary" : "text-text-muted",
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "truncate text-sm font-medium",
                          isToday ? "text-primary" : "text-text-primary",
                        )}>
                          {plan.title ?? formatDate(plan.date)}
                        </p>
                        <p className="truncate text-xs text-text-muted">{formatDate(plan.date)}</p>
                      </div>
                      {badge && (
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium", badge.cls)}>
                          {badge.label}
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-bg-base px-4 py-6 text-center text-sm text-text-muted">
                Aucun plan disponible pour le moment.
              </div>
            )}
          </section>
        </div>
      </div>

      <CreatePlanDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </>
  );
}
