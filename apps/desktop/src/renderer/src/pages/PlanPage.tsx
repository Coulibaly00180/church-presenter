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

type SongListItem = { id: string; title: string; artist?: string | null; album?: string | null; updatedAt?: string };
type SongBlock = { id: string; order: number; type: string; title?: string | null; content: string };
type Song = { id: string; title: string; artist?: string | null; album?: string | null; blocks: SongBlock[] };

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

function SortableRow(props: {
  item: PlanItem;
  isActive: boolean;
  onProject: () => void;
  onRemove: () => void;
  onClick: () => void;
}) {
  const { item, isActive, onProject, onRemove, onClick } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isActive ? "2px solid #111" : "1px solid #ddd",
    borderRadius: 10,
    padding: 10,
    background: isDragging ? "#f0f0f0" : "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onClick}>
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
        onClick={(e) => e.stopPropagation()}
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

      <button
        onClick={(e) => {
          e.stopPropagation();
          onProject();
        }}
        style={{ padding: "8px 10px" }}
      >
        Projeter
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{ padding: "8px 10px" }}
      >
        Suppr
      </button>
    </div>
  );
}

export function PlanPage() {
  const cp: any = (window as any).cp;
  const canUse = !!cp?.plans && !!cp?.projection && !!cp?.projectionWindow;

  const [projOpen, setProjOpen] = useState(false);

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [cursor, setCursor] = useState<number>(-1);

  const [newDate, setNewDate] = useState<string>(() => isoToYmd(new Date().toISOString()));
  const [newTitle, setNewTitle] = useState<string>("Culte");

  const [addKind, setAddKind] = useState<string>("ANNOUNCEMENT_TEXT");
  const [addTitle, setAddTitle] = useState<string>("Annonce");
  const [addContent, setAddContent] = useState<string>("");

  // SONG_BLOCK add UI
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [songSearch, setSongSearch] = useState<string>("");
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function refreshPlans() {
    const list = await cp.plans.list();
    setPlans(list);
  }

  async function loadPlan(id: string) {
    const p = await cp.plans.get(id);
    setPlan(p);
    setSelectedPlanId(id);
    setCursor(-1);
  }

  async function refreshSongs(q?: string) {
    if (!cp?.songs?.list) return;
    const list = await cp.songs.list(q ?? "");
    setSongs(list ?? []);
  }

  async function loadSong(songId: string) {
    if (!songId) {
      setSelectedSong(null);
      setSelectedBlockId("");
      return;
    }
    const s = await cp.songs.get(songId);
    setSelectedSong(s);
    const firstBlock = s?.blocks?.[0]?.id ?? "";
    setSelectedBlockId(firstBlock);
  }

  useEffect(() => {
    if (!canUse) return;

    cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshPlans();
    refreshSongs("");

    return () => offWin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canUse) return;
    if (addKind !== "SONG_BLOCK") return;

    // keep songs list fresh with search
    refreshSongs(songSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songSearch, addKind]);

  useEffect(() => {
    if (!canUse) return;
    if (addKind !== "SONG_BLOCK") return;

    loadSong(selectedSongId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSongId, addKind]);

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
    await cp.plans.reorder({ planId: plan.id, orderedItemIds: newItems.map((x: any) => x.id) });
    await loadPlan(plan.id);
  }

  async function projectPlanItemByIndex(i: number) {
    if (!plan) return;
    if (!projOpen) return;

    const item = plan.items[i];
    if (!item) return;

    // mark cursor first (UX)
    setCursor(i);

    if (item.kind === "SONG_BLOCK") {
      const songId = item.refId;
      const blockId = item.refSubId;
      if (!songId || !blockId) {
        await cp.projection.setContentText({
          title: item.title || "Song block",
          body: "(Référence manquante)",
        });
        return;
      }

      const s: Song = await cp.songs.get(songId);
      const block = (s?.blocks ?? []).find((b) => b.id === blockId) ?? s?.blocks?.[0];

      const title = `${s.title}${block?.title ? ` — ${block.title}` : ""}`;
      const body = block?.content ?? "";
      await cp.projection.setContentText({ title, body });
      return;
    }

    // Default: text content
    const title = item.title || item.kind;
    const body = item.content || "";
    await cp.projection.setContentText({ title, body });
  }

  // Keyboard navigation inside plan (regie-focused, projection is passive)
  useEffect(() => {
    if (!plan) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!projOpen) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min((cursor < 0 ? -1 : cursor) + 1, plan.items.length - 1);
        projectPlanItemByIndex(next);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max((cursor < 0 ? 0 : cursor) - 1, 0);
        projectPlanItemByIndex(prev);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const idx = cursor >= 0 ? cursor : 0;
        projectPlanItemByIndex(idx);
      }
      if (e.key.toLowerCase() === "b") {
        cp.projection.setMode("BLACK");
      }
      if (e.key.toLowerCase() === "w") {
        cp.projection.setMode("WHITE");
      }
      if (e.key.toLowerCase() === "r") {
        cp.projection.setMode("NORMAL");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [plan, projOpen, cursor]);

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Plan</h1>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Plan</h1>
          <div style={{ opacity: 0.7 }}>Projection: {projOpen ? "OPEN" : "CLOSED"}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!projOpen ? (
            <button
              onClick={async () => {
                const r = await cp.projectionWindow.open();
                setProjOpen(!!r?.isOpen);
              }}
              style={{ padding: "10px 14px" }}
            >
              Ouvrir Projection
            </button>
          ) : (
            <button
              onClick={async () => {
                const r = await cp.projectionWindow.close();
                setProjOpen(!!r?.isOpen);
              }}
              style={{ padding: "10px 14px" }}
            >
              Fermer Projection
            </button>
          )}
          <button onClick={() => cp.devtools?.open?.("REGIE")} style={{ padding: "10px 14px" }}>
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
                const created = await cp.plans.create({ dateIso: newDate, title: newTitle.trim() || "Culte" });
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
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                    Raccourcis: ↑/↓ suivant/précédent • Enter projeter • B/W/R noir/blanc/normal
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!confirm("Supprimer ce plan ?")) return;
                    await cp.plans.delete(plan.id);
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
                    <select
                      value={addKind}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddKind(v);
                        // reset add form on kind change
                        setAddTitle(v === "SONG_BLOCK" ? "Chant" : "Annonce");
                        setAddContent("");
                        setSongSearch("");
                        setSelectedSongId("");
                        setSelectedSong(null);
                        setSelectedBlockId("");
                      }}
                      style={{ width: "100%", padding: 10 }}
                    >
                      <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
                      <option value="VERSE_MANUAL">VERSE_MANUAL</option>
                      <option value="SONG_BLOCK">SONG_BLOCK</option>
                    </select>
                  </label>

                  <label>
                    <div style={{ fontWeight: 600 }}>Titre</div>
                    <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                  </label>
                </div>

                {addKind === "SONG_BLOCK" ? (
                  <>
                    <label>
                      <div style={{ fontWeight: 600 }}>Recherche chant</div>
                      <input
                        value={songSearch}
                        onChange={(e) => setSongSearch(e.target.value)}
                        placeholder="Tape pour filtrer…"
                        style={{ width: "100%", padding: 10 }}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label>
                        <div style={{ fontWeight: 600 }}>Chant</div>
                        <select
                          value={selectedSongId}
                          onChange={(e) => setSelectedSongId(e.target.value)}
                          style={{ width: "100%", padding: 10 }}
                        >
                          <option value="">— sélectionner —</option>
                          {songs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                              {s.artist ? ` — ${s.artist}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <div style={{ fontWeight: 600 }}>Bloc</div>
                        <select
                          value={selectedBlockId}
                          onChange={(e) => setSelectedBlockId(e.target.value)}
                          disabled={!selectedSong}
                          style={{ width: "100%", padding: 10 }}
                        >
                          {!selectedSong ? (
                            <option value="">—</option>
                          ) : (
                            (selectedSong.blocks ?? []).map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.order}. {b.title || b.type}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                    </div>

                    <button
                      onClick={async () => {
                        if (!selectedSong || !selectedBlockId) return alert("Sélectionne un chant et un bloc.");
                        const block = selectedSong.blocks.find((b) => b.id === selectedBlockId);
                        const itemTitle = `${selectedSong.title}${block?.title ? ` — ${block.title}` : ""}`;

                        await cp.plans.addItem({
                          planId: plan.id,
                          kind: "SONG_BLOCK",
                          title: itemTitle,
                          refId: selectedSong.id,
                          refSubId: selectedBlockId,
                        });
                        await loadPlan(plan.id);
                      }}
                      style={{ padding: "10px 14px", width: 220 }}
                    >
                      + Ajouter
                    </button>
                  </>
                ) : (
                  <>
                    <label>
                      <div style={{ fontWeight: 600 }}>Contenu</div>
                      <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={4} style={{ width: "100%", padding: 10 }} />
                    </label>

                    <button
                      onClick={async () => {
                        await cp.plans.addItem({
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
                  </>
                )}
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* DnD list */}
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Ordre (clic = sélection)</div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {plan.items.map((it, idx) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        isActive={idx === cursor}
                        onClick={() => setCursor(idx)}
                        onProject={async () => projectPlanItemByIndex(idx)}
                        onRemove={async () => {
                          await cp.plans.removeItem({ planId: plan.id, itemId: it.id });
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
