import React, { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type PlanListItem = { id: string; date: string; title?: string | null; updatedAt: string };
type PlanItem = {
  id: string;
  order: number;
  kind: string;
  title?: string | null;
  content?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
};
type Plan = { id: string; date: string; title?: string | null; items: PlanItem[] };

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SortableRow(props: {
  item: PlanItem;
  onProject: () => void;
  onRemove: () => void;
}) {
  const { item, onProject, onRemove } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 10,
    background: isDragging ? "#f0f0f0" : "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  
  function isLivePlanId(id: string) {
    return liveEnabled && livePlanId && livePlanId === id;
  }

  function viewingPlanId(): string | null {
    return (plan?.id as string) || (selectedPlanId as string) || null;
  }

  function isViewingLivePlan() {
    const pid = viewingPlanId();
    return !!pid && liveEnabled && livePlanId === pid;
  }

return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        title="Drag"
        style={{
          cursor: "grab",
          userSelect: "none",
          fontWeight: 800,
          padding: "6px 10px",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        ☰
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>
          #{item.order} — {item.title || item.kind}
        </div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          {item.kind}
          {item.content ? ` • ${item.content.slice(0, 80)}${item.content.length > 80 ? "…" : ""}` : ""}
        </div>
      </div>

      <button onClick={onProject} style={{ padding: "8px 10px" }}>
        Projeter
      </button>
      <button onClick={onRemove} style={{ padding: "8px 10px" }}>
        Suppr
      </button>
    </div>
  );
}

export function PlanPage() {
  const canUse = !!window.cp?.plans && !!window.cp?.projection && !!window.cp?.projectionWindow;

  const [projOpen, setProjOpen] = useState(false);

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [newDate, setNewDate] = useState<string>(() => isoToYmd(new Date().toISOString()));
  const [newTitle, setNewTitle] = useState<string>("Culte");

  const [addKind, setAddKind] = useState<string>("ANNOUNCEMENT_TEXT");
  const [addTitle, setAddTitle] = useState<string>("Annonce");
  const [addContent, setAddContent] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function refreshPlans() {
    const list = await window.cp.plans.list();
    setPlans(list);
  }

  async function loadPlan(id: string) {
    const p = await window.cp.plans.get(id);
    setPlan(p);
    setSelectedPlanId(id);
  }

  useEffect(() => {
    if (!canUse) return;

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshPlans();

    return () => offWin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedIds = useMemo(() => (plan?.items ?? []).map((i) => i.id), [plan]);

  async function onDragEnd(event: DragEndEvent) {
    if (!plan) return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

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

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Plan</h1>
        {/* Go prev/next (Plan toolbar) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Live</span>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const prev = Math.max((liveCursor ?? -1) - 1, 0);
              await window.cp.live.set({ planId: pid, cursor: prev, enabled: true, target });
            }}
          >
            ◀ Prev
          </button>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const next = Math.min((liveCursor ?? -1) + 1, (items?.length ?? 0) - 1);
              if (next < 0) return;
              await window.cp.live.set({ planId: pid, cursor: next, enabled: true, target });
            }}
          >
            Next ▶
          </button>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const cur = liveCursor ?? -1;
              const idx = cur >= 0 ? cur : 0;
              await window.cp.live.set({ planId: pid, cursor: idx, enabled: true, target });
            }}
          >
            Set current
          </button>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 6 }}>
            <input
              type="checkbox"
              checked={liveEnabled}
              onChange={async (e) => {
                const pid = viewingPlanId();
                setLiveEnabled(e.target.checked);
                await window.cp.live.set({ planId: pid, enabled: e.target.checked });
              }}
            />
            Live
          </label>
          {isViewingLivePlan() ? (
            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                fontWeight: 900,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#222",
                color: "#fff",
              }}
            >
              LIVE
            </span>
          ) : null}
        </div>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Plan</h1>
        {/* Go prev/next (Plan toolbar) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Live</span>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const prev = Math.max((liveCursor ?? -1) - 1, 0);
              await window.cp.live.set({ planId: pid, cursor: prev, enabled: true, target });
            }}
          >
            ◀ Prev
          </button>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const next = Math.min((liveCursor ?? -1) + 1, (items?.length ?? 0) - 1);
              if (next < 0) return;
              await window.cp.live.set({ planId: pid, cursor: next, enabled: true, target });
            }}
          >
            Next ▶
          </button>
          <button
            onClick={async () => {
              const pid = viewingPlanId();
              if (!pid) return;
              const cur = liveCursor ?? -1;
              const idx = cur >= 0 ? cur : 0;
              await window.cp.live.set({ planId: pid, cursor: idx, enabled: true, target });
            }}
          >
            Set current
          </button>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 6 }}>
            <input
              type="checkbox"
              checked={liveEnabled}
              onChange={async (e) => {
                const pid = viewingPlanId();
                setLiveEnabled(e.target.checked);
                await window.cp.live.set({ planId: pid, enabled: e.target.checked });
              }}
            />
            Live
          </label>
          {isViewingLivePlan() ? (
            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                fontWeight: 900,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#222",
                color: "#fff",
              }}
            >
              LIVE
            </span>
          ) : null}
        </div>
          <div style={{ opacity: 0.7 }}>Projection: {projOpen ? "OPEN" : "CLOSED"}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!projOpen ? (
            <button
              onClick={async () => {
                const r = await window.cp.projectionWindow.open();
                setProjOpen(!!r?.isOpen);
              }}
              style={{ padding: "10px 14px" }}
            >
              Ouvrir Projection
            </button>
          ) : (
            <button
              onClick={async () => {
                const r = await window.cp.projectionWindow.close();
                setProjOpen(!!r?.isOpen);
              }}
              style={{ padding: "10px 14px" }}
            >
              Fermer Projection
            </button>
          )}
          <button onClick={() => window.cp.devtools?.open?.("REGIE")} style={{ padding: "10px 14px" }}>
            DevTools Régie
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, marginTop: 12 }}>
        {/* LEFT: list + create */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Créer un plan</div>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <div style={{ fontWeight: 600 }}>Date</div>
              <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" style={{ width: "100%", padding: 10 }} />
            </label>
            <label>
              <div style={{ fontWeight: 600 }}>Titre</div>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
            </label>
            <button
              onClick={async () => {
                const created = await window.cp.plans.create({ dateIso: newDate, title: newTitle.trim() || "Culte" });
                await refreshPlans();
                await loadPlan(created.id);
              }}
              style={{ padding: "10px 14px" }}
            >
              + Créer
            </button>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontWeight: 800, marginBottom: 8 }}>Plans</div>
          <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflow: "auto" }}>
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPlan(p.id)}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border: selectedPlanId === p.id ? "2px solid #111" : "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800 }}>{p.title || "Culte"}</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>{isoToYmd(p.date)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: plan detail */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          {!plan ? (
            <div style={{ opacity: 0.75 }}>Sélectionne un plan à gauche.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{plan.title || "Culte"}</div>
                  <div style={{ opacity: 0.75 }}>{isoToYmd(plan.date)}</div>
                </div>

                <button
                  onClick={async () => {
                    if (!confirm("Supprimer ce plan ?")) return;
                    await window.cp.plans.delete(plan.id);
                    setPlan(null);
                    setSelectedPlanId(null);
                    await refreshPlans();
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Supprimer Plan
                </button>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* Add item */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Ajouter un élément</div>

                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
                  <label>
                    <div style={{ fontWeight: 600 }}>Type</div>
                    <select value={addKind} onChange={(e) => setAddKind(e.target.value)} style={{ width: "100%", padding: 10 }}>
                      <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
                      <option value="VERSE_MANUAL">VERSE_MANUAL</option>
                    </select>
                  </label>
                  <label>
                    <div style={{ fontWeight: 600 }}>Titre</div>
                    <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                  </label>
                </div>

                <label>
                  <div style={{ fontWeight: 600 }}>Contenu</div>
                  <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={4} style={{ width: "100%", padding: 10 }} />
                </label>

                <button
                  onClick={async () => {
                    await window.cp.plans.addItem({
                      planId: plan.id,
                      kind: addKind,
                      title: addTitle.trim() || undefined,
                      content: addContent || undefined,
                    });
                    await loadPlan(plan.id);
                  }}
                  style={{ padding: "10px 14px", width: 220 }}
                >
                  + Ajouter
                </button>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* DnD list */}
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Ordre</div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {plan.items.map((it) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        onProject={async () => {
                          if (!projOpen) return alert("Ouvre la projection d’abord.");
                          const title = it.title || it.kind;
                          const body = it.content || "";
                          await window.cp.projection.setContentText({ title, body });
                        }}
                        onRemove={async () => {
                          await window.cp.plans.removeItem({ planId: plan.id, itemId: it.id });
                          await loadPlan(plan.id);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
