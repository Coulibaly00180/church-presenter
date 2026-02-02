import React, { useEffect, useMemo, useRef, useState } from "react";
import { lookupLSG1910 } from "../bible/lookupLSG1910";
import { findBookIdByName, getBooks, getChapter, maxChapter, buildReferenceLabel, searchVerses } from "../bible/bollsApi";
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

function normalizeBookName(x: string) {
  return x
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const [bibleTranslation, setBibleTranslation] = useState<"LSG1910" | "LSG" | "WEB" | "FRLSG">("FRLSG");
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);
  const [bibleVerses, setBibleVerses] = useState<Array<{ chapter: number; verse: number; text: string }>>([]);
  const [bibleReference, setBibleReference] = useState<string>(""); 
  const bibleBooks = useRef<Record<string, any[]>>({});
  const [bibleSearchText, setBibleSearchText] = useState("");
  const [bibleSearchResults, setBibleSearchResults] = useState<Array<{ book: number; chapter: number; verse: number; text: string }>>([]);
  const [bibleSearchLoading, setBibleSearchLoading] = useState(false);
  const bibleSearchTimer = useRef<NodeJS.Timeout | null>(null);
  const bibleTimer = useRef<NodeJS.Timeout | null>(null);
  const songTimer = useRef<NodeJS.Timeout | null>(null);

  function getBookNameFromCache(bookId: number): string {
    const books = bibleBooks.current[bibleTranslation];
    const found = books?.find((b: any) => b.bookid === bookId);
    return found?.name || `Livre ${bookId}`;
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  async function searchSongs() {
    const list = await window.cp.songs.list(songSearch.trim());
    setSongResults(list);
  }

  function isSongDuplicate(pl: Plan | null, refId?: string | null, refSubId?: string | null) {
    if (!pl?.items) return false;
    return !!pl.items.find((i) => i.kind === "SONG_BLOCK" && i.refId === refId && i.refSubId === refSubId);
  }

  async function addSongAllBlocksToPlan(songId: string) {
    if (!plan) return;
    const s = await window.cp.songs.get(songId);
    const current = await window.cp.plans.get(plan.id);
    let added = 0;
    for (const b of s.blocks || []) {
      if (isSongDuplicate(current as Plan, s.id, b.id)) continue;
      await window.cp.plans.addItem({
        planId: plan.id,
        kind: "SONG_BLOCK",
        title: `${s.title} - ${b.title || b.type}`,
        content: b.content || "",
        refId: s.id,
        refSubId: b.id,
      });
      added += 1;
    }
    await loadPlan(plan.id);
    showToast(added > 0 ? "success" : "info", added > 0 ? "Chant ajoute au plan" : "Tous les blocs etaient deja presents");
  }

  // Debounced song search
  useEffect(() => {
    if (songTimer.current) clearTimeout(songTimer.current);
    songTimer.current = setTimeout(() => {
      if (songSearch.trim().length === 0) {
        setSongResults([]);
        return;
      }
      searchSongs();
    }, 250);
    return () => {
      if (songTimer.current) clearTimeout(songTimer.current);
    };
  }, [songSearch]);

  // Debounced bible text search (bolls find)
  useEffect(() => {
    if (bibleSearchTimer.current) clearTimeout(bibleSearchTimer.current);
    if (!bibleSearchText.trim()) {
      setBibleSearchResults([]);
      return;
    }
    bibleSearchTimer.current = setTimeout(async () => {
      setBibleSearchLoading(true);
      try {
        const trans = bibleTranslation === "LSG1910" ? "FRLSG" : bibleTranslation;
        // ensure books cached for name display
        if (!bibleBooks.current[trans]) {
          bibleBooks.current[trans] = await getBooks(trans);
        }
        const res = await searchVerses(trans, bibleSearchText.trim(), { limit: 20 });
        setBibleSearchResults(res.results.map((r) => ({ book: r.book, chapter: r.chapter, verse: r.verse, text: r.text })));
      } catch (e: any) {
        setBibleError(e?.message || String(e));
        setBibleSearchResults([]);
      } finally {
        setBibleSearchLoading(false);
      }
    }, 350);
    return () => {
      if (bibleSearchTimer.current) clearTimeout(bibleSearchTimer.current);
    };
  }, [bibleSearchText, bibleTranslation]);

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
        // bolls.life
        const refText = bibleRef.trim();
        const m = refText.match(/^(.+?)\\s+(\\d+)(?::(\\d+)(?:-(\\d+))?)?$/i);
        if (!m) throw new Error("Reference non comprise (ex: Jean 3:16-18)");
        const [, rawBook, chapStr, vStartStr, vEndStr] = m;
        const books = bibleBooks.current[bibleTranslation] || (await getBooks(bibleTranslation));
        bibleBooks.current[bibleTranslation] = books;
        const book = findBookIdByName(books, rawBook);
        if (!book) throw new Error("Livre non trouve pour cette traduction");
        const chap = parseInt(chapStr, 10);
        const max = maxChapter(books, book.bookid);
        if (max && chap > max) throw new Error(`Ce livre n'a que ${max} chapitres`);
        const allVerses = await getChapter(bibleTranslation, book.bookid, chap);
        let filtered = allVerses;
        if (vStartStr) {
          const start = parseInt(vStartStr, 10);
          const end = vEndStr ? parseInt(vEndStr, 10) : start;
          filtered = allVerses.filter((v) => v.verse >= start && v.verse <= end);
        }
        const label = buildReferenceLabel(book, chap, filtered.map((v) => v.verse));
        setBibleReference(label);
        setBibleVerses(filtered.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })));
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
    const label = bibleTranslation;
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
            <div style={{ display: "grid", gap: 12 }}>
              <div style={panelStyle}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Creer un plan</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label>
                    <div style={{ fontWeight: 600 }}>Date</div>
                    <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" style={{ width: "100%" }} />
                  </label>
                  <label>
                    <div style={{ fontWeight: 600 }}>Titre</div>
                    <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: "100%" }} />
                  </label>
                  <button
                    onClick={async () => {
                      const created = await window.cp.plans.create({ dateIso: newDate, title: newTitle.trim() || "Culte" });
                      await refreshPlans();
                      await loadPlan(created.id);
                    }}
                    style={{ background: "var(--primary)", color: "white", border: "none" }}
                  >
                    + Creer
                  </button>
                </div>
              </div>

              <div style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>Plans</div>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{plans.length} plan(s)</span>
                </div>
                <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflow: "auto" }}>
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadPlan(p.id)}
                      className="panel"
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: selectedPlanId === p.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: selectedPlanId === p.id ? "#eef2ff" : "white",
                        boxShadow: "none",
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
            </div>

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

              <div className="panel" style={{ ...panelStyle, marginTop: 12, boxShadow: "none", background: "#f8fafc" }}>
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
                          borderRadius: 10,
                          border: target === k ? "2px solid var(--primary)" : "1px solid var(--border)",
                          background: target === k ? "#eef2ff" : "#fff",
                          color: "#0f172a",
                          fontWeight: 800,
                        }}
                      >
                        Ecran {k}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                      <label key={k} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={!!live?.lockedScreens?.[k]}
                          onChange={(e) => window.cp.live?.setLocked(k, e.target.checked)}
                        />
                        Lock {k}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => window.cp.live?.prev()}>{'< Prev'}</button>
                    <button onClick={() => window.cp.live?.next()}>{'Next >'}</button>
                  </div>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={filterSongsOnly} onChange={(e) => setFilterSongsOnly(e.target.checked)} />
                    Chants uniquement
                  </label>
                </div>
              </div>

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
                    showToast("success", "Element ajoute au plan");
                  }}
                  style={{ padding: "10px 14px", width: 220 }}
                >
                  + Ajouter
                </button>

                <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Ajouter un chant (recherche)</div>
                  <div style={{ position: "relative" }}>
                    <input
                      value={songSearch}
                      onChange={(e) => setSongSearch(e.target.value)}
                      placeholder="Titre, artiste..."
                      style={{ width: "100%", padding: 10 }}
                    />
                    {songResults.length > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "110%",
                          left: 0,
                          right: 0,
                          background: "white",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow)",
                          zIndex: 5,
                          maxHeight: 200,
                          overflow: "auto",
                        }}
                      >
                        {songResults.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => addSongAllBlocksToPlan(s.id)}
                            style={{
                              padding: 10,
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{s.title}</div>
                            <div style={{ fontSize: 12, opacity: 0.65 }}>Ajouter tous les blocs</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>Tape pour chercher un chant.</div>
                    )}
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
                    <select value={bibleTranslation} onChange={(e) => setBibleTranslation(e.target.value as any)} style={{ padding: 10, minWidth: 180 }}>
                      <option value="LSG">Traduction preferee : LSG (bolls)</option>
                      <option value="WEB">WEB (bolls)</option>
                      <option value="LSG1910">LSG1910 offline</option>
                    </select>
                    <button onClick={fetchBible} disabled={bibleLoading} style={{ padding: "10px 12px" }}>
                      {bibleLoading ? "..." : "Chercher"}
                    </button>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Recherche texte (bolls)</div>
                    <input
                      value={bibleSearchText}
                      onChange={(e) => setBibleSearchText(e.target.value)}
                      placeholder="Mot ou expression"
                      style={{ width: "100%" }}
                    />
                    {bibleSearchLoading ? <div style={{ opacity: 0.7, fontSize: 12 }}>Recherche…</div> : null}
                    <div style={{ maxHeight: 160, overflow: "auto", display: "grid", gap: 6, marginTop: 6 }}>
                      {bibleSearchResults.map((r, idx) => {
                        const bookName = getBookNameFromCache(r.book);
                        const refLbl = `${bookName} ${r.chapter}:${r.verse} (${bibleTranslation})`;
                        return (
                          <div
                            key={`${r.book}-${r.chapter}-${r.verse}-${idx}`}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: 10,
                              display: "grid",
                              gap: 6,
                              background: "#fff",
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{refLbl}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{r.text}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                onClick={async () => {
                                  if (!plan) return;
                                  await window.cp.plans.addItem({
                                    planId: plan.id,
                                    kind: "BIBLE_VERSE",
                                    title: refLbl,
                                    content: `${r.chapter}:${r.verse}  ${r.text}`,
                                    refId: refLbl,
                                    refSubId: `${r.chapter}:${r.verse}`,
                                  });
                                  showToast("success", "Verset ajoute au plan");
                                }}
                              >
                                + Verset
                              </button>
                              <button
                                onClick={async () => {
                                  if (!plan) return;
                                  await window.cp.plans.addItem({
                                    planId: plan.id,
                                    kind: "BIBLE_PASSAGE",
                                    title: refLbl,
                                    content: `${r.chapter}:${r.verse}  ${r.text}`,
                                    refId: refLbl,
                                    refSubId: `${r.chapter}:${r.verse}`,
                                  });
                                  showToast("success", "Passage ajoute au plan");
                                }}
                              >
                                Passage
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {bibleSearchText && !bibleSearchResults.length && !bibleSearchLoading ? (
                        <div style={{ opacity: 0.6, fontSize: 12 }}>Aucun resultat</div>
                      ) : null}
                    </div>
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
