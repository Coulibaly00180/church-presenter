import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarClock, Clock3, Monitor, MonitorOff, Pencil, PlayCircle, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { PlanToolbar } from "@/components/plan/PlanToolbar";
import { NextPreview } from "@/components/plan/NextPreview";
import { AddItemDialog } from "@/components/dialogs/AddItemDialog";
import { EditItemDialog } from "@/components/dialogs/EditItemDialog";
import { ProjectionHistoryDialog, type ProjectionLogEntry } from "@/components/dialogs/ProjectionHistoryDialog";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { projectPlanItemToTarget } from "@/lib/projection";
import { isoToYmd } from "@/lib/date";
import type { Plan, PlanItem, ScreenKey } from "@/lib/types";

type MainPageContext = {
  planId: string | null;
  setPlanId: (id: string | null) => void;
};

type DashboardPlanItem = {
  id: string;
  date: string | Date;
  title?: string | null;
};

function dateValue(value: string | Date) {
  const parsed = typeof value === "string" ? new Date(value) : value;
  const ts = parsed.getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function planSummary(planItem: DashboardPlanItem | null) {
  if (!planItem) return "Aucun plan";
  return `${isoToYmd(planItem.date)} - ${planItem.title || "Culte"}`;
}

export function MainPage() {
  const { planId, setPlanId } = useOutletContext<MainPageContext>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [live, setLive] = useState<CpLiveState | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanItem | null>(null);
  const [projectionLog, setProjectionLog] = useState<ProjectionLogEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loopActive, setLoopActive] = useState(false);
  const [loopInterval, setLoopInterval] = useState(10);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAutoProjectionRef = useRef("");
  const prevLiveRef = useRef<CpLiveState | null>(null);
  const [allPlans, setAllPlans] = useState<DashboardPlanItem[]>([]);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [screenModes, setScreenModes] = useState<Record<ScreenKey, CpProjectionMode>>({
    A: "NORMAL",
    B: "NORMAL",
    C: "NORMAL",
  });

  const refreshPlansCatalog = useCallback(() => {
    window.cp.plans
      .list()
      .then((rows) => setAllPlans(rows as DashboardPlanItem[]))
      .catch(() => null);
  }, []);

  useEffect(() => {
    refreshPlansCatalog();
  }, [refreshPlansCatalog]);

  // Load plan
  useEffect(() => {
    if (!planId) {
      setPlan(null);
      return;
    }
    window.cp.plans.get(planId).then((p) => {
      if (p) setPlan(p as Plan);
      else setPlan(null);
    });
  }, [planId]);

  // Sync live state
  useEffect(() => {
    if (!window.cp.live) return;
    window.cp.live.get().then(setLive).catch(() => null);
    const off = window.cp.live.onUpdate(setLive);
    return () => off?.();
  }, []);

  useEffect(() => {
    if (!window.cp.projectionWindow) return;
    window.cp.projectionWindow.isOpen().then((p) => setProjectionOpen(!!p?.isOpen)).catch(() => null);
    const off = window.cp.projectionWindow.onWindowState((p) => setProjectionOpen(!!p?.isOpen));
    return () => off?.();
  }, []);

  useEffect(() => {
    if (!window.cp.screens) return;
    const keys: ScreenKey[] = ["A", "B", "C"];
    let cancelled = false;

    void Promise.all(
      keys.map(async (key) => {
        const state = await window.cp.screens.getState(key);
        return { key, mode: (state.mode ?? "NORMAL") as CpProjectionMode };
      })
    )
      .then((rows) => {
        if (cancelled) return;
        setScreenModes((prev) => {
          const next = { ...prev };
          for (const row of rows) next[row.key] = row.mode;
          return next;
        });
      })
      .catch(() => null);

    const offs = keys.map((key) =>
      window.cp.screens.onState(key, (state) => {
        setScreenModes((prev) => ({ ...prev, [key]: state.mode ?? "NORMAL" }));
      })
    );

    return () => {
      cancelled = true;
      offs.forEach((off) => off?.());
    };
  }, []);

  // Keep live planId in sync
  useEffect(() => {
    if (planId && window.cp.live) {
      window.cp.live.set({ planId });
    }
  }, [planId]);

  useEffect(() => {
    lastAutoProjectionRef.current = "";
    prevLiveRef.current = null;
  }, [planId]);

  // Loop mode: auto-advance through plan items
  useEffect(() => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    if (!loopActive || !plan || plan.items.length === 0) return;

    const items = plan.items;
    loopRef.current = setInterval(() => {
      const cursor = live?.cursor ?? 0;
      const currentIdx = items.findIndex((i) => i.order === cursor);
      const nextIdx = currentIdx >= items.length - 1 ? 0 : currentIdx + 1;
      const nextItem = items[nextIdx];
      if (nextItem) {
        window.cp.live?.setCursor(nextItem.order);
      }
    }, loopInterval * 1000);

    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [loopActive, loopInterval, plan, live]);

  // Live -> projection chain (single source of truth for in-service reliability)
  useEffect(() => {
    const previous = prevLiveRef.current;
    prevLiveRef.current = live;

    if (!plan || !live || !live.enabled || plan.items.length === 0) return;

    const item = plan.items.find((entry) => entry.order === live.cursor) ?? plan.items[0];
    if (!item) return;

    const target: ScreenKey = live.target ?? "A";
    if (live.lockedScreens?.[target]) return;

    const lockStable =
      !!previous &&
      previous.lockedScreens.A === live.lockedScreens.A &&
      previous.lockedScreens.B === live.lockedScreens.B &&
      previous.lockedScreens.C === live.lockedScreens.C;

    const cursorChanged = !previous || previous.cursor !== live.cursor;
    const targetChanged = !previous || previous.target !== live.target;
    const enabledBecameTrue = !!previous && !previous.enabled && live.enabled;
    const resumed = !!previous && (previous.black || previous.white) && !live.black && !live.white;
    const sameProjectionFields =
      !!previous &&
      previous.cursor === live.cursor &&
      previous.target === live.target &&
      previous.black === live.black &&
      previous.white === live.white &&
      previous.planId === live.planId &&
      previous.enabled === live.enabled;
    const explicitReproject = !!previous && sameProjectionFields && lockStable && previous.updatedAt !== live.updatedAt;

    const signature = `${plan.id}:${item.id}:${target}:${live.black ? 1 : 0}:${live.white ? 1 : 0}:${live.enabled ? 1 : 0}`;
    const shouldProject =
      cursorChanged ||
      targetChanged ||
      enabledBecameTrue ||
      resumed ||
      explicitReproject ||
      lastAutoProjectionRef.current.length === 0;

    if (!shouldProject) return;
    if (!explicitReproject && lastAutoProjectionRef.current === signature) return;

    let cancelled = false;
    void (async () => {
      await projectPlanItemToTarget(target, item, live);
      if (cancelled) return;
      lastAutoProjectionRef.current = signature;
      setProjectionLog((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          title: `[${target}] ${item.title || getPlanKindDefaultTitle(item.kind)}`,
          kind: item.kind,
          content: item.content ?? undefined,
        },
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [plan, live]);

  const reload = useCallback(() => {
    if (!planId) return;
    window.cp.plans.get(planId).then((p) => {
      if (p) setPlan(p as Plan);
    });
    refreshPlansCatalog();
  }, [planId, refreshPlansCatalog]);

  const handleProject = useCallback(async (item: PlanItem) => {
    const target = live?.target ?? "A";
    if (live?.lockedScreens?.[target]) {
      toast.error(`Ecran ${target} verrouille`);
      return;
    }
    if (window.cp.live) {
      await window.cp.live.setCursor(item.order);
      return;
    }
    await projectPlanItemToTarget(target, item, live);
    setProjectionLog((prev) => [
      ...prev,
      {
        timestamp: Date.now(),
        title: `[${target}] ${item.title || getPlanKindDefaultTitle(item.kind)}`,
        kind: item.kind,
        content: item.content ?? undefined,
      },
    ]);
  }, [live]);

  const handleRemove = useCallback(async (item: PlanItem) => {
    if (!planId) return;
    await window.cp.plans.removeItem({ planId, itemId: item.id });
    toast.success("Element supprime");
    reload();
  }, [planId, reload]);

  const handleDuplicate = useCallback(async (item: PlanItem) => {
    if (!planId) return;
    try {
      await window.cp.plans.addItem({
        planId,
        kind: item.kind,
        title: item.title ?? undefined,
        content: item.content ?? undefined,
        refId: item.refId ?? undefined,
        refSubId: item.refSubId ?? undefined,
        mediaPath: item.mediaPath ?? undefined,
      });
      toast.success("Element duplique");
      reload();
    } catch {
      toast.error("Erreur lors de la duplication");
    }
  }, [planId, reload]);

  const handleReorder = useCallback(async (orderedItemIds: string[], newItems: PlanItem[]) => {
    if (!planId || !plan) return;
    setPlan({ ...plan, items: newItems });
    await window.cp.plans.reorder({ planId, orderedItemIds });
  }, [planId, plan]);

  const startEditTitle = () => {
    setTitleDraft(plan?.title || "Culte");
    setEditingTitle(true);
    setTimeout(() => titleRef.current?.select(), 0);
  };

  const commitTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!planId || !plan || trimmed === (plan.title || "Culte")) return;
    await window.cp.plans.update({ planId, title: trimmed || "Culte" });
    setPlan({ ...plan, title: trimmed || "Culte" });
    toast.success("Plan renomme");
    refreshPlansCatalog();
  };

  const sortedPlans = useMemo(
    () => [...allPlans].sort((a, b) => dateValue(a.date) - dateValue(b.date)),
    [allPlans]
  );

  const todayValue = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const nextPlan = useMemo(() => {
    const upcoming = sortedPlans.filter((p) => dateValue(p.date) >= todayValue);
    return upcoming.find((p) => p.id !== planId) ?? upcoming[0] ?? null;
  }, [sortedPlans, todayValue, planId]);

  const lastPlan = useMemo(() => {
    const past = sortedPlans.filter((p) => dateValue(p.date) < todayValue);
    return past.at(-1) ?? null;
  }, [sortedPlans, todayValue]);

  const liveTarget: ScreenKey = live?.target ?? "A";
  const liveMode: CpProjectionMode =
    live?.black ? "BLACK" : live?.white ? "WHITE" : (screenModes[liveTarget] ?? "NORMAL");
  const liveModeLabel = liveMode === "BLACK" ? "NOIR" : liveMode === "WHITE" ? "BLANC" : "NORMAL";

  const toggleProjectionWindow = useCallback(async () => {
    if (!window.cp.projectionWindow) return;
    const result = projectionOpen ? await window.cp.projectionWindow.close() : await window.cp.projectionWindow.open();
    setProjectionOpen(!!result?.isOpen);
  }, [projectionOpen]);

  if (!planId || !plan) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-3xl w-full">
          <CardHeader>
            <CardTitle>Dashboard regie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Selectionnez un plan dans le menu en haut pour commencer,
              ou utilisez l'onglet Calendrier dans le panneau de gauche pour en creer un nouveau.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  Prochain culte
                </p>
                <p className="text-sm">{planSummary(nextPlan)}</p>
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!nextPlan}
                  onClick={() => {
                    if (nextPlan) setPlanId(nextPlan.id);
                  }}
                >
                  Ouvrir ce plan
                </Button>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  Dernier plan
                </p>
                <p className="text-sm">{planSummary(lastPlan)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={!lastPlan}
                  onClick={() => {
                    if (lastPlan) setPlanId(lastPlan.id);
                  }}
                >
                  Reouvrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dateStr = isoToYmd(plan.date);
  const currentItem = plan.items.find((i) => i.order === (live?.cursor ?? 0)) ?? plan.items[0] ?? null;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          {editingTitle ? (
            <input
              ref={titleRef}
              type="text"
              title="Nom du plan"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              className="text-lg font-semibold bg-transparent border-b border-primary outline-none px-0"
            />
          ) : (
            <h2
              className="text-lg font-semibold cursor-pointer hover:text-primary/80 group flex items-center gap-1.5"
              onClick={startEditTitle}
            >
              {plan.title || "Culte"}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h2>
          )}
          <p className="text-sm text-muted-foreground">{dateStr} — {plan.items.length} element{plan.items.length !== 1 ? "s" : ""}</p>
        </div>
        <PlanToolbar
          plan={plan}
          onDeleted={() => setPlanId(null)}
          onDuplicated={(newId) => setPlanId(newId)}
          onShowHistory={() => setHistoryOpen(true)}
          loopActive={loopActive}
          loopInterval={loopInterval}
          onToggleLoop={() => setLoopActive((v) => !v)}
          onSetLoopInterval={setLoopInterval}
          onImportFromFile={async () => {
            if (!planId) return;
            try {
              const result = await window.cp.plans.importFromFile(planId);
              if ("canceled" in result && result.canceled) return;
              if (result.ok) {
                toast.success(`${result.added} element(s) importe(s)`);
                reload();
              } else if ("error" in result) {
                toast.error(result.error);
              }
            } catch {
              toast.error("Erreur lors de l'import");
            }
          }}
        />
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={live?.enabled ? "default" : "secondary"} className="h-7 px-3 font-semibold">
              {live?.enabled ? "ACTIF" : "INACTIF"}
            </Badge>
            <Badge variant="outline" className="h-7 px-3 font-semibold">
              ECRAN {liveTarget}
            </Badge>
            <Badge variant={liveMode === "NORMAL" ? "secondary" : "outline"} className="h-7 px-3 font-semibold">
              MODE {liveModeLabel}
            </Badge>
            {(["A", "B", "C"] as ScreenKey[]).map((key) => (
              <Badge key={`main-lock-${key}`} variant={live?.lockedScreens?.[key] ? "destructive" : "secondary"} className="h-7 px-2">
                {key} : {live?.lockedScreens?.[key] ? "FIXE" : "LIBRE"}
              </Badge>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded-lg border bg-background/70 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Prochain culte
              </p>
              <p className="text-sm">{planSummary(nextPlan)}</p>
              <Button
                variant="outline"
                className="h-10 w-full justify-start"
                disabled={!nextPlan}
                onClick={() => {
                  if (nextPlan) setPlanId(nextPlan.id);
                }}
              >
                Ouvrir
              </Button>
            </div>

            <div className="rounded-lg border bg-background/70 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                Dernier plan
              </p>
              <p className="text-sm">{planSummary(lastPlan)}</p>
              <Button
                variant="outline"
                className="h-10 w-full justify-start"
                disabled={!lastPlan}
                onClick={() => {
                  if (lastPlan) setPlanId(lastPlan.id);
                }}
              >
                Reouvrir
              </Button>
            </div>

            <div className="rounded-lg border bg-background/70 p-3 space-y-2">
              <p className="text-xs font-semibold">Actions rapides</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button size="lg" className="h-11 justify-start" onClick={() => setAddItemOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Ajouter un item
                </Button>
                <Button size="lg" variant="outline" className="h-11 justify-start" onClick={toggleProjectionWindow}>
                  {projectionOpen ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  {projectionOpen ? "Fermer projection" : "Ouvrir projection"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 justify-start"
                  disabled={!currentItem}
                  onClick={() => {
                    if (currentItem) void handleProject(currentItem);
                  }}
                >
                  <PlayCircle className="h-4 w-4" />
                  Projeter l'item live
                </Button>
                <Button size="lg" variant="outline" className="h-11 justify-start" onClick={() => setHistoryOpen(true)}>
                  <Clock3 className="h-4 w-4" />
                  Historique projection
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PlanEditor
        items={plan.items}
        liveCursor={live?.cursor ?? 0}
        liveEnabled={!!live?.enabled}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onProject={handleProject}
        onProjectToScreen={async (item, screen) => {
          if (live?.lockedScreens?.[screen]) {
            toast.error(`Ecran ${screen} verrouille`);
            return;
          }
          if (window.cp.live) {
            await window.cp.live.set({ target: screen, cursor: item.order, enabled: true });
            return;
          }
          await projectPlanItemToTarget(screen, item, live);
          setProjectionLog((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              title: `[${screen}] ${item.title || getPlanKindDefaultTitle(item.kind)}`,
              kind: item.kind,
              content: item.content ?? undefined,
            },
          ]);
        }}
        onDuplicate={handleDuplicate}
        onEdit={(item) => setEditItem(item)}
        onRemove={handleRemove}
        onReorder={handleReorder}
        onAddItem={() => setAddItemOpen(true)}
        onDropItem={async (data) => {
          if (!planId) return;
          try {
            await window.cp.plans.addItem({ planId, ...data });
            toast.success("Element ajoute au plan");
            reload();
          } catch {
            toast.error("Erreur lors de l'ajout");
          }
        }}
      />

      {(() => {
        const sortedItems = [...plan.items].sort((a, b) => a.order - b.order);
        const cursorOrder = live?.cursor ?? 0;
        const curIdx = sortedItems.findIndex((i) => i.order === cursorOrder);
        const resolvedIdx = curIdx === -1 ? 0 : curIdx;
        return (
          <NextPreview
            prevItem={sortedItems[resolvedIdx - 1] ?? null}
            currentItem={sortedItems[resolvedIdx] ?? null}
            nextItem={sortedItems[resolvedIdx + 1] ?? null}
          />
        );
      })()}

      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        planId={planId}
        onAdded={reload}
      />

      <EditItemDialog
        open={editItem !== null}
        onOpenChange={(open) => { if (!open) setEditItem(null); }}
        planId={planId}
        item={editItem}
        onSaved={reload}
      />

      <ProjectionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={projectionLog}
        onClear={() => setProjectionLog([])}
      />
    </div>
  );
}
