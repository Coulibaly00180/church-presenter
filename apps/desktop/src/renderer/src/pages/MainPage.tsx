import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { PlanToolbar } from "@/components/plan/PlanToolbar";
import { NextPreview } from "@/components/plan/NextPreview";
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
  }, [live]);

  const handleRemove = useCallback(async (item: PlanItem) => {
    if (!planId) return;
    await window.cp.plans.removeItem({ planId, itemId: item.id });
    toast.success("Element supprime");
    reload();
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
        />
      </div>

      <PlanEditor
        planId={planId}
        items={plan.items}
        liveCursor={live?.cursor ?? 0}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onProject={handleProject}
        onRemove={handleRemove}
        onReorder={handleReorder}
      />

      <NextPreview
        prevItem={plan.items.find((i) => i.order === (live?.cursor ?? 0) - 1) ?? null}
        currentItem={plan.items.find((i) => i.order === (live?.cursor ?? 0)) ?? null}
        nextItem={plan.items.find((i) => i.order === (live?.cursor ?? 0) + 1) ?? null}
      />
    </div>
  );
}
