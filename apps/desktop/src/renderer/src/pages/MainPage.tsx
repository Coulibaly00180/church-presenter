import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { PlanToolbar } from "@/components/plan/PlanToolbar";
import { NextPreview } from "@/components/plan/NextPreview";
import { AddItemDialog } from "@/components/dialogs/AddItemDialog";
import { EditItemDialog } from "@/components/dialogs/EditItemDialog";
import { ProjectionHistoryDialog, type ProjectionLogEntry } from "@/components/dialogs/ProjectionHistoryDialog";
import { projectPlanItemToTarget } from "@/lib/projection";
import { isoToYmd } from "@/lib/date";
import type { Plan, PlanItem } from "@/lib/types";

type MainPageContext = {
  planId: string | null;
  setPlanId: (id: string | null) => void;
};

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

  // Keep live planId in sync
  useEffect(() => {
    if (planId && window.cp.live) {
      window.cp.live.set({ planId });
    }
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
        const target = live?.target ?? "A";
        projectPlanItemToTarget(target, nextItem, live);
        window.cp.live?.setCursor(nextItem.order);
        setProjectionLog((prev) => [...prev, {
          timestamp: Date.now(),
          title: nextItem.title || nextItem.kind,
          kind: nextItem.kind,
          content: nextItem.content ?? undefined,
        }]);
      }
    }, loopInterval * 1000);

    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [loopActive, loopInterval, plan, live]);

  const reload = useCallback(() => {
    if (!planId) return;
    window.cp.plans.get(planId).then((p) => {
      if (p) setPlan(p as Plan);
    });
  }, [planId]);

  const handleProject = useCallback(async (item: PlanItem) => {
    const target = live?.target ?? "A";
    await projectPlanItemToTarget(target, item, live);
    if (window.cp.live) {
      await window.cp.live.setCursor(item.order);
    }
    setProjectionLog((prev) => [...prev, {
      timestamp: Date.now(),
      title: item.title || item.kind,
      kind: item.kind,
      content: item.content ?? undefined,
    }]);
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
  };

  if (!planId || !plan) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Selectionnez un plan dans le menu en haut pour commencer,
              ou utilisez l'onglet Calendrier dans le panneau de gauche pour en creer un nouveau.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dateStr = isoToYmd(plan.date);

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

      <PlanEditor
        planId={planId}
        items={plan.items}
        liveCursor={live?.cursor ?? 0}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onProject={handleProject}
        onProjectToScreen={async (item, screen) => {
          await projectPlanItemToTarget(screen, item, live);
          setProjectionLog((prev) => [...prev, {
            timestamp: Date.now(),
            title: `[${screen}] ${item.title || item.kind}`,
            kind: item.kind,
            content: item.content ?? undefined,
          }]);
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

      <NextPreview
        prevItem={plan.items.find((i) => i.order === (live?.cursor ?? 0) - 1) ?? null}
        currentItem={plan.items.find((i) => i.order === (live?.cursor ?? 0)) ?? null}
        nextItem={plan.items.find((i) => i.order === (live?.cursor ?? 0) + 1) ?? null}
      />

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
