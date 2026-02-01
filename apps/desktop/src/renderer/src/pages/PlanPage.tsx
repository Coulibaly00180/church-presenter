import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SongListItem = { id: string; title: string; artist?: string | null; album?: string | null };
type SongBlock = { id: string; order: number; type: string; title?: string | null; content: string };
type Song = { id: string; title: string; artist?: string | null; album?: string | null; blocks: SongBlock[] };

type PlanListItem = { id: string; date: string; title?: string | null; updatedAt: string };
type PlanItem = {
  id: string;
  order: number;
  kind: string; // SONG_BLOCK | ANNOUNCEMENT_TEXT | VERSE_MANUAL | ...
  refId?: string | null; // songId
  refSubId?: string | null; // blockId
  title?: string | null;
  content?: string | null;
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

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}


async function fetchAvailableTranslations() {
  const res = await fetch("https://bible.helloao.org/api/available_translations.json");
  if (!res.ok) throw new Error(`translations HTTP ${res.status}`);
  const data = await res.json();
  const list = (data?.translations ?? []).map((t: any) => ({
    id: String(t.id),
    name: String(t.name ?? t.id),
    englishName: t.englishName ? String(t.englishName) : undefined,
  }));
  return list as { id: string; name: string; englishName?: string }[];
}

function flattenVerseContent(content: any[]): string {
  return (content ?? [])
    .map((c) => {
      if (typeof c === "string") return c;
      if (!c || typeof c !== "object") return "";
      if ("text" in c && typeof c.text === "string") return c.text;
      if ("heading" in c && typeof c.heading === "string") return `\n${c.heading}\n`;
      if ("lineBreak" in c) return "\n";
      // footnote references etc -> ignore
      return "";
    })
    .join("");
}

async function fetchVersesFromApi(opts: {
  translationId: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}): Promise<{ title: string; body: string }> {
  const { translationId, bookId, chapter, verseStart, verseEnd } = opts;
  const url = `https://bible.helloao.org/api/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bible HTTP ${res.status}`);
  const data = await res.json();

  const parts = (data?.chapter?.content ?? []).filter((x: any) => x?.type === "verse");
  const verses = parts
    .filter((v: any) => typeof v.number === "number" && v.number >= verseStart && v.number <= verseEnd)
    .map((v: any) => `${v.number}. ${flattenVerseContent(v.content)}`.trim());

  const body = verses.join("\n\n").trim();
  const rangeLabel = verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  const title = `${bookId} ${chapter}:${rangeLabel} (${translationId})`;
  return { title, body };
}

function parseVerseRange(range: string): { start: number; end: number } | null {
  const cleaned = range.trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

function SortableRow(props: {
  item: PlanItem;
  isSelected: boolean;
  onSelect: () => void;
  onProject: () => void;
  onRemove: () => void;
}) {
  const { item, isSelected, onSelect, onProject, onRemove } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isSelected ? "2px solid #111" : "1px solid #ddd",
    borderRadius: 10,
    padding: 10,
    background: isDragging ? "#f0f0f0" : "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "default",
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}>
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
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        ☰
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          #{item.order} — {item.title || item.kind}
        </div>
        <div style={{ opacity: 0.75, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.kind}
          {item.kind === "SONG_BLOCK" && item.refId ? ` • song:${item.refId}` : ""}
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
  const canUse =
    !!window.cp?.plans &&
    !!window.cp?.projection &&
    !!window.cp?.projectionWindow &&
    !!window.cp?.songs;

  const [projOpen, setProjOpen] = useState(false);

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  // Live cursor for plan traversal
  const [cursor, setCursor] = useState<number>(-1);
  const [liveMode, setLiveMode] = useState<boolean>(() => {
    const v = localStorage.getItem("cp.plan.liveMode");
    return v ? v === "1" : true;
  });

  const [newDate, setNewDate] = useState<string>(() => isoToYmd(new Date().toISOString()));
  const [newTitle, setNewTitle] = useState<string>("Culte");

  // Add item form
  const [addKind, setAddKind] = useState<string>("ANNOUNCEMENT_TEXT");
  const [addTitle, setAddTitle] = useState<string>("Annonce");
  const [addContent, setAddContent] = useState<string>("");

// Verse API (Free Use Bible API)
const [verseTranslation, setVerseTranslation] = useState<string>("LSG");
const [verseBook, setVerseBook] = useState<string>("JHN");
const [verseChapter, setVerseChapter] = useState<number>(3);
const [verseRange, setVerseRange] = useState<string>("16"); // "16" or "16-18"
const [availableTranslations, setAvailableTranslations] = useState<{ id: string; name: string; englishName?: string }[]>([]);
const [isFetchingVerse, setIsFetchingVerse] = useState(false);

  // SongBlock picker
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [songQuery, setSongQuery] = useState("");
  const [pickedSongId, setPickedSongId] = useState<string>("");
  const [pickedSong, setPickedSong] = useState<Song | null>(null);
  const [pickedBlockId, setPickedBlockId] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function refreshPlans() {
    const list = await window.cp.plans.list();
    setPlans(list);
  }

  async function loadPlan(id: string) {
    const p = await window.cp.plans.get(id);
    setPlan(p);
    setSelectedPlanId(id);

    // restore cursor for this plan
    const key = `cp.plan.cursor.${id}`;
    const saved = localStorage.getItem(key);
    const idx = saved ? Number(saved) : -1;
    setCursor(Number.isFinite(idx) ? idx : -1);
  }

  async function refreshSongs(q?: string) {
    const list = await window.cp.songs.list(q ?? "");
    setSongs(list);
  }

  
  // Live sync (highlight current/next) from Regie or other pages
  useEffect(() => {
    function syncFromStorage() {
      setLivePlanId(localStorage.getItem("cp.live.planId"));
      setLiveEnabled((localStorage.getItem("cp.live.enabled") ?? "1") === "1");
      setLiveCursor(Number(localStorage.getItem("cp.live.cursor") ?? "-1"));
    }
    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);
    const off = window.cp?.live?.onUpdate?.((p) => {
      // keep local UI updated too
      if (typeof p.planId !== "undefined") {
        localStorage.setItem("cp.live.planId", p.planId || "");
        if (!p.planId) localStorage.removeItem("cp.live.planId");
      }
      if (typeof p.enabled === "boolean") localStorage.setItem("cp.live.enabled", p.enabled ? "1" : "0");
      if (typeof p.cursor === "number") localStorage.setItem("cp.live.cursor", String(p.cursor));
      syncFromStorage();
    });
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      if (typeof off === "function") off();
    };
  }, []);

useEffect(() => {
    if (!canUse) return;

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshPlans();
    refreshSongs("");

    return () => offWin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("cp.plan.liveMode", liveMode ? "1" : "0");
  }, [liveMode]);

  const orderedIds = useMemo(() => (plan?.items ?? []).map((i) => i.id), [plan]);

  async function projectServiceItem(item: PlanItem) {
    if (!projOpen) return alert("Ouvre la projection d’abord.");

    if (item.kind === "SONG_BLOCK") {
      if (!item.refId || !item.refSubId) {
        return alert("Item SONG_BLOCK incomplet (refId/refSubId manquants).");
      }
      const song: Song = await window.cp.songs.get(item.refId);
      const block = song?.blocks?.find((b) => b.id === item.refSubId);
      if (!block) return alert("Bloc introuvable pour ce chant.");

      await window.cp.projection.setContentText({
        title: `${song.title}${block.title ? ` — ${block.title}` : ""}`,
        body: block.content,
      });
      return;
    }

    // Text-like items (ANNOUNCEMENT_TEXT, VERSE_MANUAL, etc.)
    await window.cp.projection.setContentText({
      title: item.title || item.kind,
      body: item.content || "",
    });
  }

  function persistCursor(next: number) {
    if (!plan) return;
    localStorage.setItem(`cp.plan.cursor.${plan.id}`, String(next));
  }

  async function projectItemByIndex(i: number) {
    if (!plan) return;
    const item = plan.items[i];
    if (!item) return;

    setCursor(i);
    persistCursor(i);
    await projectServiceItem(item);
  }

  async function goNext() {
    if (!plan) return;
    const next = Math.min((cursor < 0 ? -1 : cursor) + 1, plan.items.length - 1);
    if (next < 0) return;
    await projectItemByIndex(next);
  }

  async function goPrev() {
    if (!plan) return;
    const prev = Math.max((cursor < 0 ? 0 : cursor) - 1, 0);
    await projectItemByIndex(prev);
  }

  // Keyboard nav (plan live)
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if (!plan) return;
      if (!projOpen) return;
      if (!liveMode) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        await goNext();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        await goPrev();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const idx = cursor >= 0 ? cursor : 0;
        await projectItemByIndex(idx);
      }
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        await window.cp.projection.setMode("BLACK");
      }
      if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        await window.cp.projection.setMode("WHITE");
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        await window.cp.projection.setMode("NORMAL");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [plan, projOpen, liveMode, cursor]);

  // Projection control events (click left/right on projection)
  useEffect(() => {
    if (!window.cp?.projection?.onControl) return;

    const off = window.cp.projection.onControl(async (action: "NEXT" | "PREV") => {
      if (!plan) return;
      if (!projOpen) return;
      if (!liveMode) return;

      if (action === "NEXT") await goNext();
      if (action === "PREV") await goPrev();
    });

    return () => off();
  }, [plan, projOpen, liveMode, cursor]);

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

    // keep cursor pointing to same item id after reorder
    const currentId = plan.items[cursor]?.id;
    const nextCursor = currentId ? newItems.findIndex((x) => x.id === currentId) : cursor;
    setCursor(nextCursor);
    persistCursor(nextCursor);

    await loadPlan(plan.id);
  }

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Plan</h1>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.* indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Plan</h1>
          <div style={{ opacity: 0.7 }}>
            Projection: {projOpen ? "OPEN" : "CLOSED"} • Live: {liveMode ? "ON" : "OFF"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
            <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
            Plan Live (NEXT/PREV)
          </label>

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
        {/* LEFT */}
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

        {/* RIGHT */}
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

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      if (!projOpen) return alert("Ouvre la projection d’abord.");
                      await window.cp.projection.setMode("NORMAL");
                      const idx = cursor >= 0 ? cursor : 0;
                      await projectItemByIndex(idx);
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    Reprendre
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm("Supprimer ce plan ?")) return;
                      await window.cp.plans.delete(plan.id);
                      setPlan(null);
                      setSelectedPlanId(null);
                      setCursor(-1);
                      await refreshPlans();
                    }}
                    style={{ padding: "10px 14px" }}
                  >
                    Supprimer Plan
                  </button>
                </div>
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
                      onChange={async (e) => {
                        const v = e.target.value;
                        setAddKind(v);
                        if (v === "SONG_BLOCK") {
                          await refreshSongs(songQuery);
                        }
                      }}
                      style={{ width: "100%", padding: 10 }}
                    >
                      <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
                      <option value="VERSE_MANUAL">VERSE_MANUAL</option>
                      <option value="VERSE_API">VERSE_API</option>
                      <option value="SONG_BLOCK">SONG_BLOCK</option>
                    </select>
                  </label>

                  <label>
                    <div style={{ fontWeight: 600 }}>Titre</div>
                    <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                  </label>
                </div>

                {addKind === "SONG_BLOCK" ? (
                  <div style={{ display: "grid", gap: 8, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>Choisir un chant + bloc</div>

                    <label>
                      <div style={{ fontWeight: 600 }}>Recherche chant</div>
                      <input
                        value={songQuery}
                        onChange={async (e) => {
                          const q = e.target.value;
                          setSongQuery(q);
                          await refreshSongs(q);
                        }}
                        placeholder="Tape un titre / artiste…"
                        style={{ width: "100%", padding: 10 }}
                      />
                    </label>

                    <label>
                      <div style={{ fontWeight: 600 }}>Chant</div>
                      <select
                        value={pickedSongId}
                        onChange={async (e) => {
                          const id = e.target.value;
                          setPickedSongId(id);
                          setPickedBlockId("");
                          if (!id) {
                            setPickedSong(null);
                            return;
                          }
                          const s = await window.cp.songs.get(id);
                          setPickedSong(s);
                        }}
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
                        value={pickedBlockId}
                        onChange={(e) => setPickedBlockId(e.target.value)}
                        style={{ width: "100%", padding: 10 }}
                        disabled={!pickedSong}
                      >
                        <option value="">— sélectionner —</option>
                        {(pickedSong?.blocks ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.order}. {b.title || b.type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

) : addKind === "VERSE_API" ? (
  <div style={{ display: "grid", gap: 8, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
    <div style={{ fontWeight: 700 }}>Passage biblique (API)</div>

    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
      <label>
        <div style={{ fontWeight: 600 }}>Traduction</div>
        <input
          value={verseTranslation}
          onChange={(e) => setVerseTranslation(e.target.value.toUpperCase())}
          placeholder="ex: LSG, BSB…"
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        <div style={{ fontWeight: 600 }}>Livre (ID)</div>
        <input
          value={verseBook}
          onChange={(e) => setVerseBook(e.target.value.toUpperCase())}
          placeholder="ex: JHN, MAT, PSA…"
          style={{ width: "100%", padding: 10 }}
        />
      </label>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
      <label>
        <div style={{ fontWeight: 600 }}>Chapitre</div>
        <input
          type="number"
          value={verseChapter}
          onChange={(e) => setVerseChapter(Number(e.target.value))}
          min={1}
          style={{ width: "100%", padding: 10 }}
        />
      </label>

      <label>
        <div style={{ fontWeight: 600 }}>Versets</div>
        <input
          value={verseRange}
          onChange={(e) => setVerseRange(e.target.value)}
          placeholder="16 ou 16-18"
          style={{ width: "100%", padding: 10 }}
        />
      </label>
    </div>

    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={async () => {
          try {
            setIsFetchingVerse(true);
            const list = await fetchAvailableTranslations();
            setAvailableTranslations(list);
          } catch (e: any) {
            alert(e?.message ?? String(e));
          } finally {
            setIsFetchingVerse(false);
          }
        }}
        style={{ padding: "10px 12px" }}
        type="button"
      >
        Charger traductions
      </button>

      <button
        onClick={async () => {
          try {
            const r = parseVerseRange(verseRange);
            if (!r) return alert("Format versets invalide. Exemple: 16 ou 16-18");
            setIsFetchingVerse(true);
            const { title, body } = await fetchVersesFromApi({
              translationId: verseTranslation.trim(),
              bookId: verseBook.trim(),
              chapter: verseChapter,
              verseStart: r.start,
              verseEnd: r.end,
            });
            // Préremplir le formulaire d'ajout
            setAddTitle(title);
            setAddContent(body);
          } catch (e: any) {
            alert(e?.message ?? String(e));
          } finally {
            setIsFetchingVerse(false);
          }
        }}
        style={{ padding: "10px 12px", fontWeight: 700 }}
        type="button"
      >
        {isFetchingVerse ? "Récupération..." : "Récupérer le texte"}
      </button>

      {availableTranslations.length > 0 ? (
        <span style={{ opacity: 0.8 }}>
          {availableTranslations.length} traductions disponibles (recherche dans la console bientôt)
        </span>
      ) : null}
    </div>

    <div style={{ fontSize: 12, opacity: 0.75 }}>
      Astuce: les IDs de livres sont du type GEN, EXO, PSA, MAT, MRK, LUK, JHN, ROM...
    </div>

    <label>
      <div style={{ fontWeight: 600 }}>Contenu (cache du plan)</div>
      <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={6} style={{ width: "100%", padding: 10 }} />
    </label>
  </div>
) : (
  <label>
    <div style={{ fontWeight: 600 }}>Contenu</div>
    <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={4} style={{ width: "100%", padding: 10 }} />
  </label>
)}

                <button
                  onClick={async () => {
                    if (!plan) return;

                    if (addKind === "SONG_BLOCK") {
                      if (!pickedSongId || !pickedBlockId) return alert("Choisis un chant ET un bloc.");
                      const songTitle = songs.find((s) => s.id === pickedSongId)?.title ?? "Chant";
                      const blockTitle = (pickedSong?.blocks ?? []).find((b) => b.id === pickedBlockId)?.title ?? "Bloc";
                      await window.cp.plans.addItem({
                        planId: plan.id,
                        kind: "SONG_BLOCK",
                        title: addTitle.trim() || `${songTitle} — ${blockTitle}`,
                        refId: pickedSongId,
                        refSubId: pickedBlockId,
                      });
                    } else {
                      await window.cp.plans.addItem({
                        planId: plan.id,
                        kind: addKind,
                        title: addTitle.trim() || undefined,
                        content: addContent || undefined,
                      });
                    }

                    await loadPlan(plan.id);
                  }}
                  style={{ padding: "10px 14px", width: 220 }}
                >
                  + Ajouter
                </button>
              </div>

              <hr style={{ margin: "14px 0" }} />

              {/* DnD list */}
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Ordre (clic = sélectionner, Enter = projeter, ↑/↓ = naviguer)
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "grid", gap: 10 }}>
                    {plan.items.map((it, idx) => (
                      <SortableRow
                        key={it.id}
                        item={it}
                        isSelected={idx === cursor}
                        onSelect={() => {
                          setCursor(idx);
                          persistCursor(idx);
                        }}
                        onProject={async () => {
                          await projectItemByIndex(idx);
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

              <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
                Raccourcis : ↑/↓ ou ←/→ (NEXT/PREV), Enter (projeter), B/W/R (noir/blanc/normal).
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
