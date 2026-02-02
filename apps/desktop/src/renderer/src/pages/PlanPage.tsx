import React, { useEffect, useMemo, useRef, useState } from "react";
import { lookupLSG1910 } from "../bible/lookupLSG1910";
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

type ScreenKey = "A" | "B" | "C";
type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
type LiveState = {
  enabled: boolean;
  planId: string | null;
  cursor: number;
  target: ScreenKey;
  black: boolean;
  white: boolean;
  lockedScreens: Record<ScreenKey, boolean>;
  updatedAt: number;
};
type ScreenMeta = { key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode };

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatForProjection(item: PlanItem) {
  return {
    title: item.title || item.kind,
    body: (item.content ?? "").trim(),
  };
}

async function projectTextToTarget(target: ScreenKey, title: string | undefined, body: string, live: LiveState | null) {
  if (live?.lockedScreens?.[target]) return; // respect lock

  const screensApi = window.cp.screens;
  const list: ScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const isMirrorOfA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest: ScreenKey = isMirrorOfA ? "A" : target;

  if (dest === "A" || !screensApi) {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res: any = await screensApi.setContentText(dest, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

async function projectMediaToTarget(
  target: ScreenKey,
  title: string | undefined,
  mediaPath: string,
  mediaType: "IMAGE" | "PDF",
  live: LiveState | null
) {
  if (live?.lockedScreens?.[target]) return;
  const screensApi = window.cp.screens;
  const list: ScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const isMirrorOfA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest: ScreenKey = isMirrorOfA ? "A" : target;

  if (dest === "A" || !screensApi) {
    await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
    return;
  }
  const res: any = await screensApi.setContentMedia(dest, { title, mediaPath, mediaType });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
  }
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

  const badge = (() => {
    if (item.kind === "SONG_BLOCK") return { label: "Chant", color: "#eef2ff", border: "#cbd5ff", text: "#303e82" };
    if (item.kind === "BIBLE_VERSE") return { label: "Verset", color: "#e6fffa", border: "#9ae6b4", text: "#13624d" };
    if (item.kind === "BIBLE_PASSAGE") return { label: "Passage", color: "#e0f4ff", border: "#a7dcff", text: "#0f4c75" };
    if (item.kind === "ANNOUNCEMENT_TEXT") return { label: "Annonce", color: "#f4f4f5", border: "#d4d4d8", text: "#3f3f46" };
    return null;
  })();

  const titleAttr =
    item.kind === "SONG_BLOCK" && item.refId
      ? `Chant source: ${item.title || ""} (id: ${item.refId}${item.refSubId ? " / bloc " + item.refSubId : ""})`
      : item.kind;

  return (
    <div ref={setNodeRef} style={style} title={titleAttr}>
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
        #
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>
          #{item.order} - {item.title || item.kind}{" "}
          {badge ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 999,
                background: badge.color,
                border: "1px solid " + badge.border,
                color: badge.text,
                marginLeft: 6,
              }}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          {item.kind}
          {item.content ? ` * ${item.content.slice(0, 80)}${item.content.length > 80 ? "..." : ""}` : ""}
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
  const [addPdfPage, setAddPdfPage] = useState<string>("1");
  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<Array<{ id: string; title: string }>>([]);
  const [bibleRef, setBibleRef] = useState("Jean 3:16-18");
  const [bibleTranslation, setBibleTranslation] = useState<"LSG1910" | "WEB">("LSG1910");
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);
  const [bibleVerses, setBibleVerses] = useState<Array<{ chapter: number; verse: number; text: string }>>([]);
  const [bibleReference, setBibleReference] = useState<string>(""); 

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [live, setLive] = useState<LiveState | null>(null);
  const lastProjectionKey = useRef<string | null>(null);

  const target = live?.target ?? "A";
  const liveEnabled = !!live?.enabled;
  const livePlanId = live?.planId ?? null;
  const liveCursor = live?.cursor ?? -1;
  const [filterSongsOnly, setFilterSongsOnly] = useState(false);

  async function refreshPlans() {
    const list = await window.cp.plans.list();
    setPlans(list);
  }

  async function searchSongs() {
    const list = await window.cp.songs.list(songSearch.trim());
    setSongResults(list);
  }

  async function addSongAllBlocksToPlan(songId: string) {
    if (!plan) return;
    const s = await window.cp.songs.get(songId);
    for (const b of s.blocks || []) {
      await window.cp.plans.addItem({
        planId: plan.id,
        kind: "SONG_BLOCK",
        title: `${s.title} - ${b.title || b.type}`,
        content: b.content || "",
        refId: s.id,
        refSubId: b.id,
      });
    }
    await loadPlan(plan.id);
  }

  async function fetchBible() {
    setBibleLoading(true);
    setBibleError(null);
    setBibleVerses([]);
    try {
      if (bibleTranslation === "LSG1910") {
        const r = lookupLSG1910(bibleRef.trim());
        if (!r) throw new Error("Reference non trouvee (offline mini)");
        setBibleReference(r.reference);
        setBibleVerses(r.verses.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })));
      } else {
        const q = encodeURIComponent(bibleRef.trim());
        const url = `https://bible-api.com/${q}?translation=web`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json: any = await resp.json();
        if (!json.verses?.length) throw new Error("Aucun resultat");
        setBibleReference(json.reference || bibleRef.trim());
        setBibleVerses(json.verses.map((v: any) => ({ chapter: v.chapter, verse: v.verse, text: v.text })));
      }
    } catch (e: any) {
      setBibleError(e?.message || String(e));
    } finally {
      setBibleLoading(false);
    }
  }

  async function addBibleToPlan(mode: "PASSAGE" | "VERSES") {
    if (!plan || bibleVerses.length === 0) return;
    const ref = bibleReference || bibleRef.trim();
    const label = bibleTranslation === "LSG1910" ? "LSG1910" : "WEB";
    if (mode === "PASSAGE") {
      const body = bibleVerses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n");
      await window.cp.plans.addItem({
        planId: plan.id,
        kind: "BIBLE_PASSAGE",
        title: `${ref} (${label})`,
        content: body,
        refId: ref,
        refSubId: label,
      });
    } else {
      for (const v of bibleVerses) {
        const verseRef = `${ref.split(":")[0]}:${v.verse}`;
        const body = `${v.chapter}:${v.verse}  ${v.text.trim()}`;
        await window.cp.plans.addItem({
          planId: plan.id,
          kind: "BIBLE_VERSE",
          title: `${verseRef} (${label})`,
          content: body,
          refId: ref,
          refSubId: `${v.chapter}:${v.verse}`,
        });
      }
    }
    await loadPlan(plan.id);
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

    void projectTextToTarget(live.target, formatForProjection(item).title, formatForProjection(item).body, live);
  }, [live?.updatedAt, plan]);

  const visibleItems = useMemo(() => {
    if (!plan) return [];
    if (!filterSongsOnly) return plan.items;
    return plan.items.filter((i) => i.kind === "SONG_BLOCK");
  }, [plan, filterSongsOnly]);

  const orderedIds = useMemo(() => visibleItems.map((i) => i.id), [visibleItems]);

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

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Plan</h1>
        <p style={{ color: "crimson" }}>Preload non charge (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Plan</h1>
          <div style={{ opacity: 0.7 }}>Projection: {projOpen ? "OUVERTE" : "FERMEE"}</div>
        </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={liveEnabled}
                onChange={(e) => updateLive({ enabled: e.target.checked })}
              />
              Live
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => updateLive({ target: k })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: target === k ? "2px solid #111" : "1px solid #ddd",
                    background: target === k ? "#111" : "white",
                    color: target === k ? "white" : "#111",
                    fontWeight: 800,
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                <label key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!live?.lockedScreens?.[k]}
                    onChange={(e) => window.cp.live?.setLocked(k, e.target.checked)}
                  />
                  Lock {k}
                </label>
              ))}
            </div>
            <button onClick={() => window.cp.live?.prev()} style={{ padding: "8px 10px" }}>
              {"< Prev"}
            </button>
            <button onClick={() => window.cp.live?.next()} style={{ padding: "8px 10px" }}>
              {"Next >"}
            </button>
            <button onClick={() => window.cp.live?.resume()} style={{ padding: "8px 10px" }}>
              Reprendre
            </button>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={filterSongsOnly} onChange={(e) => setFilterSongsOnly(e.target.checked)} />
              Chants uniquement
            </label>
          </div>
        </div>

          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, marginTop: 12 }}>
            {/* LEFT: list + create */}
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Creer un plan</div>
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
              + Creer
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
                {livePlanId === p.id ? (
                  <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: "#0a6847" }}>LIVE</div>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: plan detail */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          {!plan ? (
            <div style={{ opacity: 0.75 }}>Selectionne un plan a gauche.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{plan.title || "Culte"}</div>
                  <div style={{ opacity: 0.75 }}>{isoToYmd(plan.date)}</div>
                  {livePlanId === plan.id ? (
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: "#0a6847" }}>LIVE (cursor {liveCursor + 1})</div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={async () => {
                      await updateLive({ planId: plan.id, enabled: true, cursor: Math.max(liveCursor, 0) });
                    }}
                    style={{ padding: "10px 14px" }}
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
                    style={{ padding: "10px 14px" }}
                  >
                    Supprimer Plan
                  </button>
                </div>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* Add item + chant + bible */}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>Ajouter un element</div>

                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
                  <label>
                    <div style={{ fontWeight: 600 }}>Type</div>
                    <select value={addKind} onChange={(e) => setAddKind(e.target.value)} style={{ width: "100%", padding: 10 }}>
                      <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
                      <option value="VERSE_MANUAL">VERSE_MANUAL</option>
                      <option value="BIBLE_VERSE">BIBLE_VERSE</option>
                      <option value="BIBLE_PASSAGE">BIBLE_PASSAGE</option>
                      <option value="ANNOUNCEMENT_IMAGE">ANNOUNCEMENT_IMAGE</option>
                      <option value="ANNOUNCEMENT_PDF">ANNOUNCEMENT_PDF</option>
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

                {(addKind === "ANNOUNCEMENT_IMAGE" || addKind === "ANNOUNCEMENT_PDF") && (
                  <button
                    onClick={async () => {
                      const res = await window.cp.files?.pickMedia?.();
                      if (res?.ok && res.path) {
                        setAddContent(res.path);
                      }
                    }}
                    style={{ padding: "8px 10px", width: 220 }}
                  >
                    Choisir fichier
                  </button>
                )}
                {addKind === "ANNOUNCEMENT_PDF" ? (
                  <label>
                    <div style={{ fontWeight: 600 }}>Page PDF</div>
                    <input
                      type="number"
                      min={1}
                      value={addPdfPage}
                      onChange={(e) => setAddPdfPage(e.target.value)}
                      style={{ width: "100%", padding: 10 }}
                    />
                  </label>
                ) : null}

                <button
                  onClick={async () => {
                    const mediaPath =
                      addKind === "ANNOUNCEMENT_PDF" && addContent
                        ? `${addContent}#page=${parseInt(addPdfPage || "1", 10) || 1}`
                        : addKind === "ANNOUNCEMENT_IMAGE"
                        ? addContent || undefined
                        : undefined;
                    await window.cp.plans.addItem({
                      planId: plan.id,
                      kind: addKind,
                      title: addTitle.trim() || undefined,
                      content: addContent || undefined,
                      mediaPath,
                    });
                    setAddContent("");
                    await loadPlan(plan.id);
                  }}
                  style={{ padding: "10px 14px", width: 220 }}
                >
                  + Ajouter
                </button>

                <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Ajouter un chant (recherche)</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={songSearch}
                      onChange={(e) => setSongSearch(e.target.value)}
                      placeholder="Titre, artiste..."
                      style={{ flex: 1, padding: 10 }}
                    />
                    <button onClick={searchSongs} style={{ padding: "10px 12px" }}>
                      Chercher
                    </button>
                  </div>
                  <div style={{ maxHeight: 160, overflow: "auto", display: "grid", gap: 6 }}>
                    {songResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addSongAllBlocksToPlan(s.id)}
                        style={{ textAlign: "left", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                      >
                        {s.title}
                      </button>
                    ))}
                    {songResults.length === 0 ? <div style={{ opacity: 0.6, fontSize: 12 }}>Tape puis cherche.</div> : null}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Ajouter un verset/passage</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      value={bibleRef}
                      onChange={(e) => setBibleRef(e.target.value)}
                      placeholder="Ex: Jean 3:16-18"
                      style={{ flex: 1, padding: 10 }}
                    />
                    <select value={bibleTranslation} onChange={(e) => setBibleTranslation(e.target.value as any)} style={{ padding: 10 }}>
                      <option value="LSG1910">LSG1910</option>
                      <option value="WEB">WEB</option>
                    </select>
                    <button onClick={fetchBible} disabled={bibleLoading} style={{ padding: "10px 12px" }}>
                      {bibleLoading ? "..." : "Chercher"}
                    </button>
                  </div>
                  {bibleError ? <div style={{ color: "crimson", fontSize: 13 }}>{bibleError}</div> : null}
                  {bibleVerses.length > 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                      {bibleReference || bibleRef}: {bibleVerses.length} versets
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => addBibleToPlan("PASSAGE")} disabled={bibleVerses.length === 0}>
                      Ajouter passage
                    </button>
                    <button onClick={() => addBibleToPlan("VERSES")} disabled={bibleVerses.length === 0}>
                      Verset par verset
                    </button>
                  </div>
                </div>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* DnD list */}
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Ordre</div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {visibleItems.map((it, idx) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        onProject={async () => {
                          const { title, body } = formatForProjection(it);
                          const next = (await updateLive({ planId: plan.id, cursor: idx, enabled: true, target })) || live;
                          if (it.kind === "ANNOUNCEMENT_IMAGE" && it.mediaPath) {
                            await projectMediaToTarget(target, title, it.mediaPath, "IMAGE", next);
                          } else if (it.kind === "ANNOUNCEMENT_PDF" && it.mediaPath) {
                            await projectMediaToTarget(target, title, it.mediaPath, "PDF", next);
                          } else {
                            await projectTextToTarget(target, title, body, next);
                          }
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
