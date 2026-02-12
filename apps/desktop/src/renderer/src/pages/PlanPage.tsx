import React, { useEffect, useMemo, useRef, useState } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { isoToYmd, localNowYmd } from "./plan/date";
import { PlanComposerSection } from "./plan/PlanComposerSection";
import { PlanItemsOrderSection } from "./plan/PlanItemsOrderSection";
import { PlanLiveToolbar } from "./plan/PlanLiveToolbar";
import { PlanSidebarSection } from "./plan/PlanSidebarSection";
import { projectPlanItemToTarget } from "./plan/projection";
import { LiveState, Plan, PlanListItem } from "./plan/types";

export function PlanPage() {
  const canUse = !!window.cp?.plans && !!window.cp?.projection && !!window.cp?.projectionWindow;

  const [projOpen, setProjOpen] = useState(false);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [newDate, setNewDate] = useState<string>(() => localNowYmd());
  const [newTitle, setNewTitle] = useState<string>("Culte");

  const [live, setLive] = useState<LiveState | null>(null);
  const lastProjectionKey = useRef<string | null>(null);

  const target = live?.target ?? "A";
  const liveEnabled = !!live?.enabled;
  const livePlanId = live?.planId ?? null;
  const liveCursor = live?.cursor ?? -1;
  const [filterSongsOnly, setFilterSongsOnly] = useState(false);
  const [toast, setToast] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);

  function showToast(kind: "info" | "success" | "error", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2600);
  }

  async function refreshPlans() {
    const list = await window.cp.plans.list();
    setPlans(list);
  }

  async function loadPlan(id: string) {
    const p = await window.cp.plans.get(id);
    setPlan(p);
    setSelectedPlanId(id);
  }

  async function updateLive(patch: Partial<LiveState>) {
    if (!window.cp.live) return;
    const next = await window.cp.live.set(patch);
    setLive(next);
    return next;
  }

  useEffect(() => {
    if (!canUse) return;

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshPlans();

    window.cp.live?.get?.().then(setLive).catch(() => null);
    const offLive = window.cp.live?.onUpdate?.((s: LiveState) => setLive(s));

    return () => {
      offWin?.();
      offLive?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-projection when live cursor changes on the active plan
  useEffect(() => {
    if (!plan || !live || !live.enabled || live.planId !== plan.id) return;
    const idx = Math.max(0, Math.min(live.cursor ?? 0, (plan.items?.length ?? 1) - 1));
    const item = plan.items[idx];
    if (!item) return;

    const key = `${live.planId}:${idx}:${live.target}:${live.updatedAt}`;
    if (lastProjectionKey.current === key) return;
    lastProjectionKey.current = key;

    void projectPlanItemToTarget(live.target, item, live);
  }, [live?.updatedAt, plan]);

  const visibleItems = useMemo(() => {
    if (!plan) return [];
    if (!filterSongsOnly) return plan.items;
    return plan.items.filter((i) => i.kind === "SONG_BLOCK");
  }, [plan, filterSongsOnly]);

  async function onDragEnd(event: DragEndEvent) {
    if (!plan) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plan.items.findIndex((i) => i.id === active.id);
    const newIndex = plan.items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(plan.items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      order: idx + 1,
    }));

    setPlan({ ...plan, items: newItems });
    await window.cp.plans.reorder({ planId: plan.id, orderedItemIds: newItems.map((x) => x.id) });
    await loadPlan(plan.id);
  }

  const panelStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "var(--shadow)",
  };

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Plan</h1>
        <p style={{ color: "crimson" }}>Preload non charge (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Plan</h1>
          <div style={{ opacity: 0.7 }}>Projection: {projOpen ? "ouverte" : "fermee"}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span
            className="badge"
            style={{
              background: projOpen ? "#e0f2fe" : "#fee2e2",
              color: projOpen ? "#075985" : "#991b1b",
            }}
          >
            {projOpen ? "Projection ON" : "Projection OFF"}
          </span>
          <button
            onClick={async () => {
              if (projOpen) {
                const r = await window.cp.projectionWindow.close();
                setProjOpen(!!r?.isOpen);
              } else {
                const r = await window.cp.projectionWindow.open();
                setProjOpen(!!r?.isOpen);
              }
            }}
            style={{ background: "var(--primary)", color: "white", border: "none" }}
          >
            {projOpen ? "Fermer" : "Ouvrir"}
          </button>
          <button onClick={() => window.cp.live?.resume()}>Reprendre live</button>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            ...panelStyle,
            padding: 12,
            background: toast.kind === "error" ? "#fef2f2" : toast.kind === "success" ? "#ecfdf3" : "#eef2ff",
            borderColor: toast.kind === "error" ? "#fecdd3" : toast.kind === "success" ? "#bbf7d0" : "#cbd5ff",
          }}
        >
          {toast.text}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, marginTop: 0 }}>
        {/* LEFT: list + create */}
        <PlanSidebarSection
          panelStyle={panelStyle}
          newDate={newDate}
          newTitle={newTitle}
          plans={plans}
          selectedPlanId={selectedPlanId}
          livePlanId={livePlanId}
          onSetNewDate={setNewDate}
          onSetNewTitle={setNewTitle}
          onCreatePlan={async () => {
            const created = await window.cp.plans.create({ dateIso: newDate, title: newTitle.trim() || "Culte" });
            await refreshPlans();
            await loadPlan(created.id);
          }}
          onSelectPlan={loadPlan}
        />

        {/* RIGHT: plan detail */}
        <div style={panelStyle}>
          {!plan ? (
            <div style={{ opacity: 0.75 }}>Selectionne un plan a gauche.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{plan.title || "Culte"}</div>
                  <div style={{ opacity: 0.75 }}>{isoToYmd(plan.date)}</div>
                  {livePlanId === plan.id ? (
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: "#0a6847" }}>LIVE (curseur {liveCursor + 1})</div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={async () => {
                      await updateLive({ planId: plan.id, enabled: true, cursor: Math.max(liveCursor, 0) });
                    }}
                    style={{ background: "var(--primary)", color: "white", border: "none" }}
                  >
                    Utiliser en live
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Supprimer ce plan ?")) return;
                      await window.cp.plans.delete(plan.id);
                      setPlan(null);
                      setSelectedPlanId(null);
                      await refreshPlans();
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <PlanLiveToolbar
                panelStyle={panelStyle}
                liveEnabled={liveEnabled}
                target={target}
                live={live}
                filterSongsOnly={filterSongsOnly}
                onUpdateLive={updateLive}
                onSetLocked={(screen, locked) => window.cp.live?.setLocked(screen, locked)}
                onPrev={() => window.cp.live?.prev()}
                onNext={() => window.cp.live?.next()}
                onSetFilterSongsOnly={setFilterSongsOnly}
              />

              <PlanComposerSection plan={plan} reloadPlan={loadPlan} showToast={showToast} />

              <hr style={{ margin: "14px 0" }} />

              <PlanItemsOrderSection
                items={visibleItems}
                onDragEnd={onDragEnd}
                onProject={async (it) => {
                  const cursor = plan.items.findIndex((x) => x.id === it.id);
                  if (cursor < 0) return;
                  const next = (await updateLive({ planId: plan.id, cursor, enabled: true, target })) || live;
                  await projectPlanItemToTarget(target, it, next);
                }}
                onRemove={async (it) => {
                  await window.cp.plans.removeItem({ planId: plan.id, itemId: it.id });
                  await loadPlan(plan.id);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
