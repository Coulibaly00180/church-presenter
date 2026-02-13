import React, { useEffect, useMemo, useState } from "react";
import { ActionRow, Alert, Field, PageHeader, Panel } from "../ui/primitives";
import { PlanSelectField, ProjectionTargetField } from "../ui/headerControls";
import { projectTextToScreen } from "../projection/target";

type ScreenKey = "A" | "B" | "C";

type SongListItem = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  updatedAt: string | Date;
};

type SongBlock = {
  id?: string;
  order: number;
  type: string;
  title?: string | null;
  content: string;
};

type SongDetail = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  tags?: string | null;
  blocks: SongBlock[];
};

type PlanWithItems = { id: string; date?: string | Date; title?: string | null; items?: Array<{ id: string; kind: string; refId?: string | null; refSubId?: string | null }> };

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
  async function loadPlanItems(id: string): Promise<PlanWithItems | null> {
    try {
      const p = await window.cp.plans.get(id);
      return p;
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
      .then((ps: PlanWithItems[]) => {
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
    const metaSong = {
      title: song.title,
      artist: song.artist ?? undefined,
      album: song.album ?? undefined,
      year: song.tags ?? song.album ?? undefined, // tags often used for year import
    };
    await projectTextToScreen({ target, title: song.title, body: b.content || "", metaSong });
  }

  async function addBlockToPlan(i: number) {
    if (!song || !planId) return;
    let sourceSong: SongDetail = song;

    // ensure block ids exist by saving if needed
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
    const payload = {
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

  async function projectAllAsFlow() {
    if (!song) return;
    const text = song.blocks.map((b) => (b.content ?? "").trim()).filter(Boolean).join("\n\n");
    const metaSong = {
      title: song.title,
      artist: song.artist ?? undefined,
      album: song.album ?? undefined,
      year: song.tags ?? song.album ?? undefined,
    };
    await projectTextToScreen({ target, title: song.title, body: text, metaSong });
  }

  return (
    <div className="cp-page">
      <PageHeader
        title="Chants"
        subtitle="Bibliotheque, projection, ajout au plan"
        className="cp-page-header-start"
        actions={
          <>
            <ProjectionTargetField value={target} onChange={setTarget} wide />

            <PlanSelectField
              value={planId}
              plans={plans}
              getPlanId={(p) => p.id}
              getPlanLabel={(p) => (
                <>
                  {p.title || "Culte"} {formatPlanDate(p) ? `(${formatPlanDate(p)})` : ""}
                </>
              )}
              onChange={setPlanId}
              wide
            />
          </>
        }
      />

      {err ? (
        <Alert tone="error">
          <b>Erreur :</b> {err}
        </Alert>
      ) : null}
      {info ? <Alert tone={info.kind}>{info.text}</Alert> : null}
      <Panel soft className="cp-toolbar-panel">
        <ActionRow className="cp-toolbar-row">
          <input
            value={newSongTitle}
            onChange={(e) => setNewSongTitle(e.target.value)}
            placeholder="Titre du nouveau chant"
            className="cp-input-min-180 cp-flex-1"
          />
          <button className="btn-primary" onClick={onCreate}>
            + Nouveau chant
          </button>
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
              const r = await window.cp.songs.importAuto();
              setImporting(false);
              if (r?.ok) {
                await refresh(q);
                const count = r.imported || 0;
                const detail = `${count} chant${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""}`;
                setInfo({ kind: "success", text: `Import OK • ${detail}` });
                if (r?.errors?.length) {
                  console.warn("Import errors:", r.errors);
                  setErr(`${r.errors.length} erreur(s) durant l'import (voir console)`);
                }
              } else if (r?.canceled) {
                setInfo({ kind: "info", text: "Import annule." });
              }
            }}
            disabled={importing}
          >
            Importer des chants (docx / odt / json)
          </button>
        </ActionRow>
      </Panel>

      <div className="cp-grid-main cp-grid-main--songs">
        {/* LEFT list */}
        <Panel className="cp-panel-flat">
          <div className="cp-song-list-head">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (titre, artiste, paroles…)"
              className="cp-input-full"
            />
            <ActionRow className="cp-mt-8">
              <button onClick={() => refresh(q)}>Rechercher</button>
              <button onClick={() => { setQ(""); refresh(""); }}>Reinitialiser</button>
            </ActionRow>
            {filtered.length > 0 && q.trim().length > 0 ? (
              <div className="cp-song-suggest-list">
                {filtered.slice(0, 8).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSong(s.id)}
                    className={cls("cp-song-suggest-item", "cp-song-suggest-item-btn", s.id === selectedId && "is-active")}
                  >
                    <div className="cp-song-item-title">{s.title}</div>
                    <div className="cp-help-text-flat">
                      {(s.artist || "—")} {s.album ? `• ${s.album}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="cp-song-list-scroll">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadSong(s.id)}
                className={cls("cp-song-list-item", "cp-song-list-item-btn", s.id === selectedId && "is-active")}
              >
                <div className="cp-song-list-title">{s.title}</div>
                <div className="cp-song-list-meta">
                  {(s.artist || "—")} {s.album ? `• ${s.album}` : ""}
                </div>
              </button>
            ))}
            {filtered.length === 0 ? <div className="cp-empty-row">Aucun chant.</div> : null}
          </div>
        </Panel>

        {/* RIGHT editor */}
        <Panel>
          {!song ? (
            <div className="cp-muted">Sélectionne un chant à gauche ou crée-en un.</div>
          ) : (
            <>
              <ActionRow className="cp-mb-10">
                <b className="cp-flex-1">Édition</b>
                <button onClick={onSaveMeta} disabled={saving}>
                  Sauver meta
                </button>
                <button onClick={onSaveBlocks} disabled={saving}>
                  Sauver blocs
                </button>
                <button onClick={onDelete} disabled={saving}>
                  Supprimer
                </button>
              </ActionRow>

              <div className="cp-song-meta-grid">
                <Field label="Titre">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Artiste">
                  <input value={artist} onChange={(e) => setArtist(e.target.value)} />
                </Field>
                <Field label="Album">
                  <input value={album} onChange={(e) => setAlbum(e.target.value)} />
                </Field>
              </div>

              <ActionRow className="cp-mb-12">
                <button onClick={() => addBlock("VERSE")}>+ Couplet</button>
                <button onClick={() => addBlock("CHORUS")}>+ Refrain</button>
                <button onClick={() => addBlock("BRIDGE")}>+ Pont</button>
                <button onClick={projectAllAsFlow}>Projeter tout</button>
                <button onClick={addAllBlocksToPlan} disabled={!planId}>
                  Ajouter tout au plan
                </button>
              </ActionRow>

              <div className="cp-song-block-stack">
                {song.blocks.map((b, idx) => (
                  <div key={idx} className="cp-song-block-card">
                    <ActionRow className="cp-mb-8">
                      <b className="cp-flex-1">
                        {b.title || b.type} <span className="cp-song-block-index">#{idx + 1}</span>
                      </b>
                      <button onClick={() => projectBlock(idx)}>Projeter</button>
                      <button onClick={() => addBlockToPlan(idx)} disabled={!planId}>
                        Ajouter au plan
                      </button>
                      <button onClick={() => removeBlock(idx)}>Supprimer</button>
                    </ActionRow>

                    <div className="cp-song-block-fields">
                      <Field label="Type">
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
                      </Field>

                      <Field label="Titre du bloc">
                        <input
                          value={b.title ?? ""}
                          onChange={(e) => {
                            const blocks = [...song.blocks];
                            blocks[idx] = { ...blocks[idx], title: e.target.value };
                            setSong({ ...song, blocks });
                          }}
                        />
                      </Field>
                    </div>

                    <textarea
                      value={b.content}
                      onChange={(e) => {
                        const blocks = [...song.blocks];
                        blocks[idx] = { ...blocks[idx], content: e.target.value };
                        setSong({ ...song, blocks });
                      }}
                      rows={6}
                      className="cp-input-full"
                      placeholder="Tape les paroles de ce bloc…"
                    />
                    <div className="cp-help-text-sm">
                      Astuce : laisse une ligne vide pour séparer des sous-blocs lors de la projection (si tu veux).
                    </div>
                  </div>
                ))}
                {song.blocks.length === 0 ? <div className="cp-muted">Aucun bloc.</div> : null}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

