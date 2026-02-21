import { useEffect, useMemo, useState } from "react";

type PlanEntry = { id: string; date?: string | Date; title?: string | null; items?: CpPlanItem[] };

export function useSongsState() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<CpSongListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [song, setSong] = useState<CpSongDetail | null>(null);

  const [target, setTarget] = useState<ScreenKey>("A");
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [planId, setPlanId] = useState<string>("");

  // Meta form
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<{ kind: "info" | "success"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");

  async function loadPlanItems(id: string): Promise<PlanEntry | null> {
    try {
      const p = await window.cp.plans.get(id);
      return p;
    } catch {
      return null;
    }
  }

  function isDuplicate(plan: PlanEntry | null, refId: string, refSubId?: string) {
    if (!plan?.items) return false;
    return !!plan.items.find((it) => it.kind === "SONG_BLOCK" && it.refId === refId && it.refSubId === refSubId);
  }

  async function refresh(query?: string) {
    const items = await window.cp.songs.list(query ?? "");
    setList(items);
  }

  async function loadSong(id: string) {
    const s = await window.cp.songs.get(id);
    if (!s) {
      setSong(null);
      setSelectedId(null);
      setErr("Chant introuvable.");
      return;
    }
    setSong(s);
    setSelectedId(id);
    setTitle(s.title ?? "");
    setArtist(s.artist ?? "");
    setAlbum(s.album ?? "");
    setYear(s.year ?? "");
  }

  function formatPlanDate(p: PlanEntry) {
    if (!p.date) return "";
    const d = p.date instanceof Date ? p.date : new Date(p.date);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    let cancelled = false;
    refresh("").catch((e) => { if (!cancelled) setErr(String(e)); });
    window.cp.plans
      ?.list?.()
      .then((ps: CpPlanListItem[]) => {
        if (cancelled) return;
        setPlans(ps || []);
        if ((ps || []).length > 0) setPlanId(ps[0].id);
      })
      .catch(() => void 0);
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => list, [list]);

  // Live search (debounced)
  useEffect(() => {
    const t = setTimeout(() => refresh(q).catch((e) => setErr(String(e))), 200);
    return () => clearTimeout(t);
  }, [q]);

  async function onCreate() {
    setErr(null);
    const baseTitle = newSongTitle.trim() || "Sans titre";
    try {
      const created = await window.cp.songs.create({ title: baseTitle });
      setNewSongTitle("");
      await refresh(q);
      await loadSong(created.id);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function onImportWord() {
    setImporting(true);
    setErr(null);
    setInfo(null);
    try {
      const result = await window.cp.songs.importWordBatch();
      if ("canceled" in result && result.canceled) return;
      if (result.ok) {
        await refresh(q);
        if (result.imported > 0) {
          setInfo({
            kind: "success",
            text: `Import Word termine: ${result.imported} chant(s).`,
          });
        } else {
          setInfo({
            kind: "info",
            text: "Import Word termine: aucun chant importe.",
          });
        }
        if (result.errors.length > 0) {
          setErr(`${result.errors.length} erreur(s) detectee(s) pendant l'import Word.`);
        }
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setImporting(false);
    }
  }

  async function onImportJson() {
    setImporting(true);
    setErr(null);
    setInfo(null);
    try {
      const result = await window.cp.songs.importJson();
      if ("canceled" in result && result.canceled) return;
      if ("error" in result) {
        setErr(result.error);
        return;
      }
      if (result.ok) {
        await refresh(q);
        if (result.imported > 0) {
          setInfo({
            kind: "success",
            text: `Import JSON termine: ${result.imported} chant(s).`,
          });
        } else {
          setInfo({
            kind: "info",
            text: "Import JSON termine: aucun chant importe.",
          });
        }
        if (result.errors.length > 0) {
          setErr(`${result.errors.length} erreur(s) detectee(s) pendant l'import JSON.`);
        }
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setImporting(false);
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    if (!confirm("Supprimer ce chant ?")) return;

    try {
      await window.cp.songs.delete(selectedId);
      setSelectedId(null);
      setSong(null);
      await refresh(q);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function onSaveMeta() {
    if (!song) return;
    setSaving(true);
    setErr(null);
    try {
      const updated = await window.cp.songs.updateMeta({
        id: song.id,
        title: title.trim() || "Sans titre",
        artist: artist.trim() || undefined,
        album: album.trim() || undefined,
        year: year.trim() || undefined,
      });
      setSong(updated);
      await refresh(q);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveBlocks() {
    if (!song) return;
    setSaving(true);
    setErr(null);
    try {
      const cleanedBlocks: Array<{ order: number; type: string; title?: string; content: string }> = (song.blocks ?? []).map((b, idx) => ({
        order: idx + 1,
        type: b.type || "VERSE",
        title: b.title ?? undefined,
        content: b.content ?? "",
      }));

      const updated = await window.cp.songs.replaceBlocks({ songId: song.id, blocks: cleanedBlocks });
      if (!updated) throw new Error("Chant introuvable apres sauvegarde des blocs.");
      setSong(updated);
      await refresh(q);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  function addBlock(type: string) {
    if (!song) return;
    const nextOrder = (song.blocks?.length ?? 0) + 1;
    const nb = { id: "", order: nextOrder, type, title: type === "CHORUS" ? "Refrain" : `Couplet ${nextOrder}`, content: "" } satisfies CpSongBlock;
    setSong({ ...song, blocks: [...song.blocks, nb] });
  }

  function removeBlock(i: number) {
    if (!song) return;
    const blocks = [...song.blocks];
    blocks.splice(i, 1);
    const re = blocks.map((b, idx) => ({ ...b, order: idx + 1 }));
    setSong({ ...song, blocks: re });
  }

  function updateBlock(i: number, patch: Partial<CpSongBlock>) {
    if (!song) return;
    const blocks = [...song.blocks];
    blocks[i] = { ...blocks[i], ...patch };
    setSong({ ...song, blocks });
  }

  async function addBlockToPlan(i: number) {
    if (!song || !planId) return;
    let sourceSong: CpSongDetail = song;

    if (!song.blocks[i]?.id) {
      await onSaveBlocks();
      const re = await window.cp.songs.get(song.id);
      if (!re) {
        setErr("Chant introuvable apres sauvegarde.");
        return;
      }
      setSong(re);
      sourceSong = re;
    }
    const b = sourceSong.blocks[i];
    if (!b) return;

    const plan = await loadPlanItems(planId);
    if (isDuplicate(plan, sourceSong.id, b.id)) {
      setInfo({ kind: "info", text: "Bloc deja present dans le plan." });
      return;
    }
    const payload: CpPlanAddItemPayload = {
      planId,
      kind: "SONG_BLOCK",
      title: `${sourceSong.title} - ${b.title || b.type}`,
      content: b.content || "",
      refId: sourceSong.id,
      refSubId: b.id,
    };
    await window.cp.plans.addItem(payload);
    setInfo({ kind: "success", text: "Bloc ajoute au plan." });
  }

  async function addAllBlocksToPlan() {
    if (!song || !planId) return;
    await onSaveBlocks();
    const fresh = await window.cp.songs.get(song.id);
    if (!fresh) {
      setErr("Chant introuvable apres sauvegarde.");
      return;
    }
    setSong(fresh);
    const plan = await loadPlanItems(planId);
    let added = 0;
    for (const b of fresh.blocks) {
      if (isDuplicate(plan, fresh.id, b.id)) continue;
      await window.cp.plans.addItem({
        planId,
        kind: "SONG_BLOCK",
        title: `${fresh.title} - ${b.title || b.type}`,
        content: b.content || "",
        refId: fresh.id,
        refSubId: b.id,
      });
      added += 1;
    }
    setInfo({
      kind: added > 0 ? "success" : "info",
      text: added > 0 ? "Chant ajoute au plan." : "Tous les blocs etaient deja presents.",
    });
  }

  return {
    // search / list
    q, setQ, filtered, selectedId, loadSong, refresh,
    // song detail
    song, setSong,
    // meta form
    title, setTitle, artist, setArtist, album, setAlbum, year, setYear,
    // actions
    err, setErr, saving, info, setInfo, importing, setImporting,
    newSongTitle, setNewSongTitle,
    onCreate, onImportWord, onImportJson, onDelete, onSaveMeta, onSaveBlocks,
    addBlock, removeBlock, updateBlock,
    addBlockToPlan, addAllBlocksToPlan,
    // plan / target
    target, setTarget, plans, planId, setPlanId, formatPlanDate,
  };
}
