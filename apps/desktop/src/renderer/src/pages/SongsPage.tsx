import React, { useEffect, useMemo, useState } from "react";

type ScreenKey = "A" | "B" | "C";

type SongListItem = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  updatedAt: string;
};

type SongBlock = {
  id?: string;
  order: number;
  type: string;
  title?: string;
  content: string;
};

type SongDetail = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  blocks: SongBlock[];
};

type PlanWithItems = { id: string; date?: string | Date; title?: string | null; items?: Array<{ id: string; kind: string; refId?: string | null; refSubId?: string | null }> };

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}


async function projectTextToTarget(target: ScreenKey, title: string | undefined, body: string) {
  // Always ensure A exists when needed
  const screens = await window.cp.screens.list();
  const meta = screens.find((s) => s.key === target);

  // If target is not open, open it (A via legacy, others via screens)
  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen) {
    await window.cp.screens.open(target);
  }

  // If B/C are mirroring A, projecting to B/C should actually update A (so mirror follows)
  if (target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A") {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  // Normal cases
  if (target === "A") {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res: any = await window.cp.screens.setContentText(target, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    // safety fallback: update A
    await window.cp.projection.setContentText({ title, body });
  }
}


export function SongsPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<SongListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [song, setSong] = useState<SongDetail | null>(null);

  const [target, setTarget] = useState<ScreenKey>("A");
  const [plans, setPlans] = useState<PlanWithItems[]>([]);
  const [planId, setPlanId] = useState<string>("");

  // Meta form
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<{ kind: "info" | "success"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");
  const panelStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "var(--shadow)",
  };

  async function loadPlanItems(id: string): Promise<PlanWithItems | null> {
    try {
      const p = await window.cp.plans.get(id);
      return p as PlanWithItems;
    } catch {
      return null;
    }
  }

  function isDuplicate(plan: PlanWithItems | null, refId: string, refSubId?: string) {
    if (!plan?.items) return false;
    return !!plan.items.find((it) => it.kind === "SONG_BLOCK" && it.refId === refId && it.refSubId === refSubId);
  }

  async function refresh(query?: string) {
    const items = await window.cp.songs.list(query ?? "");
    setList(items);
  }

  async function loadSong(id: string) {
    const s = await window.cp.songs.get(id);
    setSong(s);
    setSelectedId(id);
    setTitle(s.title ?? "");
    setArtist(s.artist ?? "");
    setAlbum(s.album ?? "");
  }

  function formatPlanDate(p: PlanWithItems) {
    if (!p.date) return "";
    const d = p.date instanceof Date ? p.date : new Date(p.date);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    refresh("").catch((e) => setErr(String(e)));
    window.cp.plans
      ?.list?.()
      .then((ps: any[]) => {
        setPlans(ps || []);
        if ((ps || []).length > 0) setPlanId(ps[0].id);
      })
      .catch(() => void 0);
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
      const cleanedBlocks: SongBlock[] = (song.blocks ?? []).map((b, idx) => ({
        order: idx + 1,
        type: b.type || "VERSE",
        title: b.title,
        content: b.content ?? "",
      }));

      const updated = await window.cp.songs.replaceBlocks({ songId: song.id, blocks: cleanedBlocks });
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
    const nb: SongBlock = { order: nextOrder, type, title: type === "CHORUS" ? "Refrain" : `Couplet ${nextOrder}`, content: "" };
    setSong({ ...song, blocks: [...song.blocks, nb] });
  }

  function removeBlock(i: number) {
    if (!song) return;
    const blocks = [...song.blocks];
    blocks.splice(i, 1);
    // re-order
    const re = blocks.map((b, idx) => ({ ...b, order: idx + 1 }));
    setSong({ ...song, blocks: re });
  }

  async function projectBlock(i: number) {
    if (!song) return;
    const b = song.blocks[i];
    await projectTextToTarget(target, song.title, b.content || "");
  }

  async function addBlockToPlan(i: number) {
    if (!song || !planId) return;
    // ensure block ids exist by saving if needed
    if (!song.blocks[i]?.id) {
      await onSaveBlocks();
      const re = await window.cp.songs.get(song.id);
      setSong(re);
    }
    const b = (song.blocks[i] as SongBlock) || {};
    const plan = await loadPlanItems(planId);
    if (isDuplicate(plan, song.id, b.id)) {
      setInfo({ kind: "info", text: "Bloc deja present dans le plan." });
      return;
    }
    const payload = {
      planId,
      kind: "SONG_BLOCK",
      title: `${song.title} - ${b.title || b.type}`,
      content: b.content || "",
      refId: song.id,
      refSubId: b.id,
    };
    await window.cp.plans.addItem(payload);
    setInfo({ kind: "success", text: "Bloc ajoute au plan." });
  }

  async function addAllBlocksToPlan() {
    if (!song || !planId) return;
    await onSaveBlocks();
    const fresh = await window.cp.songs.get(song.id);
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

  async function projectAllAsFlow() {
    if (!song) return;
    const text = song.blocks.map((b) => (b.content ?? "").trim()).filter(Boolean).join("\n\n");
    await projectTextToTarget(target, song.title, text);
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>Chants</h1>
          <div style={{ opacity: 0.7 }}>Bibliotheque, projection, ajout au plan</div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Projeter vers
          <select value={target} onChange={(e) => setTarget(e.target.value as ScreenKey)}>
            <option value="A">Ecran A</option>
            <option value="B">Ecran B</option>
            <option value="C">Ecran C</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Plan
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || "Culte"} {formatPlanDate(p) ? `(${formatPlanDate(p)})` : ""}
              </option>
            ))}
          </select>
        </label>

        <input
          value={newSongTitle}
          onChange={(e) => setNewSongTitle(e.target.value)}
          placeholder="Titre du nouveau chant"
          style={{ minWidth: 180 }}
        />
        <button onClick={onCreate}>+ Nouveau chant</button>
        <button
          onClick={async () => {
            if (!selectedId) return;
            const r = await window.cp.songs.exportWord(selectedId);
            if (r?.ok) setInfo({ kind: "success", text: "Export Word OK" });
          }}
          disabled={!selectedId}
        >
          Exporter Word
        </button>
        <button
          onClick={async () => {
            setImporting(true);
            const r = await window.cp.songs.importWordBatch();
            setImporting(false);
            console.log("Import docx/odt result", r);
            if (r?.ok) {
              await refresh(q);
              setInfo({ kind: "success", text: `Import: ${r.imported || 0} chants (docx/odt)` });
              if (r?.errors?.length) {
                console.warn("Import errors:", r.errors);
                setErr(`${r.errors.length} erreurs durant l'import (voir console)`);
              }
            } else if (r?.error) {
              setErr(r.error);
            }
          }}
          disabled={importing}
        >
          Importer des chants (docx / odt)
        </button>
        <button
          onClick={async () => {
            setImporting(true);
            const r = await window.cp.songs.importJson();
            setImporting(false);
            if (r?.ok) {
              await refresh(q);
              setInfo({ kind: "success", text: `Import JSON : ${r.imported || 0} chants` });
            } else if (r?.error) {
              setErr(r.error);
            }
          }}
          disabled={importing}
        >
          Importer JSON
        </button>
      </div>

      {err ? (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 10, borderRadius: 10, marginBottom: 12 }}>
          <b>Erreur :</b> {err}
        </div>
      ) : null}
      {info ? (
        <div
          style={{
            background: info.kind === "success" ? "#e6ffed" : "#eef2ff",
            border: "1px solid " + (info.kind === "success" ? "#9ae6b4" : "#cbd5ff"),
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          {info.text}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, alignItems: "start" }}>
        {/* LEFT list */}
        <div style={{ ...panelStyle, padding: 0 }}>
          <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (titre, artiste, paroles…)"
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => refresh(q)}>Rechercher</button>
              <button onClick={() => { setQ(""); refresh(""); }}>Reset</button>
            </div>
            {filtered.length > 0 && q.trim().length > 0 ? (
              <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 8, maxHeight: 200, overflow: "auto", background: "white" }}>
                {filtered.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => loadSong(s.id)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      borderBottom: "1px solid #f2f2f2",
                      background: s.id === selectedId ? "#eef6ff" : "transparent",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{s.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {(s.artist || "—")} {s.album ? `• ${s.album}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ maxHeight: "70vh", overflow: "auto", padding: 8 }}>
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => loadSong(s.id)}
                style={{
                  padding: 10,
                  cursor: "pointer",
                  borderRadius: 10,
                  border: "1px solid " + (s.id === selectedId ? "var(--primary)" : "var(--border)"),
                  background: s.id === selectedId ? "#eef6ff" : "transparent",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 900 }}>{s.title}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {(s.artist || "—")} {s.album ? `• ${s.album}` : ""}
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <div style={{ padding: 10, opacity: 0.7 }}>Aucun chant.</div>
            ) : null}
          </div>
        </div>

        {/* RIGHT editor */}
        <div style={panelStyle}>
          {!song ? (
            <div style={{ opacity: 0.7 }}>Sélectionne un chant à gauche ou crée-en un.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <b style={{ flex: 1 }}>Édition</b>
                <button onClick={onSaveMeta} disabled={saving}>
                  Sauver meta
                </button>
                <button onClick={onSaveBlocks} disabled={saving}>
                  Sauver blocs
                </button>
                <button onClick={onDelete} disabled={saving}>
                  Supprimer
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  Titre
                  <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  Artiste
                  <input value={artist} onChange={(e) => setArtist(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  Album
                  <input value={album} onChange={(e) => setAlbum(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => addBlock("VERSE")}>+ Couplet</button>
                <button onClick={() => addBlock("CHORUS")}>+ Refrain</button>
                <button onClick={() => addBlock("BRIDGE")}>+ Pont</button>
                <button onClick={projectAllAsFlow}>Projeter tout</button>
                <button onClick={addAllBlocksToPlan} disabled={!planId}>
                  Ajouter tout au plan
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {song.blocks.map((b, idx) => (
                  <div key={idx} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <b style={{ flex: 1 }}>
                        {b.title || b.type} <span style={{ opacity: 0.5, fontWeight: 600 }}>#{idx + 1}</span>
                      </b>
                      <button onClick={() => projectBlock(idx)}>Projeter</button>
                      <button onClick={() => addBlockToPlan(idx)} disabled={!planId}>
                        Ajouter au plan
                      </button>
                      <button onClick={() => removeBlock(idx)}>Supprimer</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, marginBottom: 8 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        Type
                        <select
                          value={b.type}
                          onChange={(e) => {
                            const blocks = [...song.blocks];
                            blocks[idx] = { ...blocks[idx], type: e.target.value };
                            setSong({ ...song, blocks });
                          }}
                        >
                          <option value="VERSE">VERSE</option>
                          <option value="CHORUS">CHORUS</option>
                          <option value="BRIDGE">BRIDGE</option>
                          <option value="TAG">TAG</option>
                        </select>
                      </label>

                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        Titre du bloc
                        <input
                          value={b.title ?? ""}
                          onChange={(e) => {
                            const blocks = [...song.blocks];
                            blocks[idx] = { ...blocks[idx], title: e.target.value };
                            setSong({ ...song, blocks });
                          }}
                          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                        />
                      </label>
                    </div>

                    <textarea
                      value={b.content}
                      onChange={(e) => {
                        const blocks = [...song.blocks];
                        blocks[idx] = { ...blocks[idx], content: e.target.value };
                        setSong({ ...song, blocks });
                      }}
                      rows={6}
                      style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", fontFamily: "system-ui" }}
                      placeholder="Tape les paroles de ce bloc…"
                    />
                    <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
                      Astuce : laisse une ligne vide pour séparer des sous-blocs lors de la projection (si tu veux).
                    </div>
                  </div>
                ))}
                {song.blocks.length === 0 ? <div style={{ opacity: 0.7 }}>Aucun bloc.</div> : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
