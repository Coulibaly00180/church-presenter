import React, { useEffect, useMemo, useState } from "react";

type SongListItem = { id: string; title: string; artist?: string | null; album?: string | null; updatedAt: string };
type SongBlock = { id: string; order: number; type: string; title?: string | null; content: string };
type Song = { id: string; title: string; artist?: string | null; album?: string | null; blocks: SongBlock[] };

function nextOrder(blocks: SongBlock[]) {
  return blocks.length ? Math.max(...blocks.map((b) => b.order)) + 1 : 1;
}

export function RegiePage() {
  const [projOpen, setProjOpen] = useState(false);

  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaArtist, setMetaArtist] = useState("");
  const [metaAlbum, setMetaAlbum] = useState("");

  const canUseCp = !!window.cp?.projection && !!window.cp?.projectionWindow && !!window.cp?.songs;

  async function refreshList() {
    const items = await window.cp.songs.list(q);
    setSongs(items);
  }

  async function loadSong(id: string) {
    const s = await window.cp.songs.get(id);
    setSong(s);
    setSelectedId(id);
    setMetaTitle(s.title ?? "");
    setMetaArtist(s.artist ?? "");
    setMetaAlbum(s.album ?? "");
  }

  useEffect(() => {
    if (!canUseCp) {
      console.error("window.cp missing (preload not loaded)");
      return;
    }
    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshList();

    return () => offWin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canUseCp) return;
    const t = setTimeout(() => refreshList(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = useMemo(() => {
    return `Projection=${projOpen ? "OPEN" : "CLOSED"}`;
  }, [projOpen]);

  if (!canUseCp) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Régie</h1>
        <p style={{ color: "crimson" }}>Preload non chargé: window.cp indisponible.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Régie</h1>
      <p style={{ opacity: 0.75 }}>{status}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {!projOpen ? (
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.open();
              setProjOpen(!!r?.isOpen);
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Ouvrir Projection
          </button>
        ) : (
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.close();
              setProjOpen(!!r?.isOpen);
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Fermer Projection
          </button>
        )}

        <button onClick={() => window.cp.devtools?.open?.("REGIE")} style={{ padding: "10px 14px", fontSize: 16 }}>
          DevTools Régie
        </button>
        <button
          onClick={() => window.cp.devtools?.open?.("PROJECTION")}
          style={{ padding: "10px 14px", fontSize: 16 }}
          disabled={!projOpen}
        >
          DevTools Projection
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12, alignItems: "start" }}>
        {/* LEFT: liste + recherche */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Rechercher (titre, artiste, paroles...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, padding: 10, fontSize: 14 }}
            />
            <button
              onClick={async () => {
                const created = await window.cp.songs.create({ title: "Nouveau chant" });
                await refreshList();
                await loadSong(created.id);
              }}
              style={{ padding: "10px 12px" }}
            >
              + Chant
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 6, maxHeight: "70vh", overflow: "auto" }}>
            {songs.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSong(s.id)}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 8,
                  border: selectedId === s.id ? "2px solid #111" : "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {s.artist || "—"} {s.album ? `• ${s.album}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: édition chant */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          {!song ? (
            <div style={{ opacity: 0.75 }}>Sélectionne un chant à gauche.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Édition Chant</div>
                <button
                  onClick={async () => {
                    if (!song) return;
                    await window.cp.songs.updateMeta({
                      id: song.id,
                      title: metaTitle.trim() || "Sans titre",
                      artist: metaArtist.trim() || undefined,
                      album: metaAlbum.trim() || undefined,
                    });
                    await refreshList();
                    await loadSong(song.id);
                  }}
                  style={{ padding: "8px 12px" }}
                >
                  Sauver
                </button>

                <button
                  onClick={async () => {
                    if (!song) return;
                    if (!confirm("Supprimer ce chant ?")) return;
                    await window.cp.songs.delete(song.id);
                    setSong(null);
                    setSelectedId(null);
                    await refreshList();
                  }}
                  style={{ padding: "8px 12px" }}
                >
                  Supprimer
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                <label>
                  <div style={{ fontWeight: 600 }}>Titre</div>
                  <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
                <label>
                  <div style={{ fontWeight: 600 }}>Artiste</div>
                  <input value={metaArtist} onChange={(e) => setMetaArtist(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
                <label>
                  <div style={{ fontWeight: 600 }}>Album</div>
                  <input value={metaAlbum} onChange={(e) => setMetaAlbum(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Blocs (couplets / refrain)</div>
                <button
                  onClick={async () => {
                    if (!song) return;
                    const newBlock: SongBlock = {
                      id: "tmp",
                      order: nextOrder(song.blocks),
                      type: "VERSE",
                      title: `Couplet`,
                      content: "",
                    };
                    const blocks = [...song.blocks, newBlock].map((b, i) => ({ ...b, order: i + 1 }));
                    const saved = await window.cp.songs.replaceBlocks({
                      songId: song.id,
                      blocks: blocks.map((b) => ({ order: b.order, type: b.type, title: b.title ?? undefined, content: b.content })),
                    });
                    setSong(saved);
                  }}
                  style={{ padding: "8px 12px" }}
                >
                  + Bloc
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {song.blocks.map((b, idx) => (
                  <div key={b.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>#{b.order}</div>

                      <select
                        value={b.type}
                        onChange={async (e) => {
                          if (!song) return;
                          const blocks = song.blocks.map((x) => (x.id === b.id ? { ...x, type: e.target.value } : x));
                          const saved = await window.cp.songs.replaceBlocks({
                            songId: song.id,
                            blocks: blocks.map((bb, i) => ({
                              order: i + 1,
                              type: bb.type,
                              title: bb.title ?? undefined,
                              content: bb.content,
                            })),
                          });
                          setSong(saved);
                        }}
                      >
                        <option value="VERSE">VERSE</option>
                        <option value="CHORUS">CHORUS</option>
                        <option value="BRIDGE">BRIDGE</option>
                        <option value="INTRO">INTRO</option>
                        <option value="OUTRO">OUTRO</option>
                      </select>

                      <input
                        value={b.title ?? ""}
                        placeholder="Titre bloc (ex: Couplet 1)"
                        onChange={async (e) => {
                          if (!song) return;
                          const blocks = song.blocks.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x));
                          setSong({ ...song, blocks });
                        }}
                        style={{ flex: 1, minWidth: 180, padding: 8 }}
                      />

                      <button
                        onClick={async () => {
                          if (!projOpen) return alert("Ouvre la projection d’abord.");
                          await window.cp.projection.setContentText({
                            title: `${song.title}${b.title ? ` — ${b.title}` : ""}`,
                            body: b.content,
                          });
                        }}
                        style={{ padding: "8px 12px" }}
                        disabled={!projOpen}
                      >
                        Projeter
                      </button>

                      <button
                        onClick={async () => {
                          if (!song) return;
                          const blocks = song.blocks.filter((x) => x.id !== b.id).map((x, i) => ({ ...x, order: i + 1 }));
                          const saved = await window.cp.songs.replaceBlocks({
                            songId: song.id,
                            blocks: blocks.map((bb) => ({
                              order: bb.order,
                              type: bb.type,
                              title: bb.title ?? undefined,
                              content: bb.content,
                            })),
                          });
                          setSong(saved);
                        }}
                        style={{ padding: "8px 12px" }}
                      >
                        Suppr bloc
                      </button>

                      <button
                        onClick={async () => {
                          if (!song || idx === 0) return;
                          const blocks = [...song.blocks];
                          const tmp = blocks[idx - 1];
                          blocks[idx - 1] = blocks[idx];
                          blocks[idx] = tmp;
                          const normalized = blocks.map((x, i) => ({ ...x, order: i + 1 }));
                          const saved = await window.cp.songs.replaceBlocks({
                            songId: song.id,
                            blocks: normalized.map((bb) => ({
                              order: bb.order,
                              type: bb.type,
                              title: bb.title ?? undefined,
                              content: bb.content,
                            })),
                          });
                          setSong(saved);
                        }}
                        style={{ padding: "8px 12px" }}
                      >
                        ↑
                      </button>

                      <button
                        onClick={async () => {
                          if (!song || idx === song.blocks.length - 1) return;
                          const blocks = [...song.blocks];
                          const tmp = blocks[idx + 1];
                          blocks[idx + 1] = blocks[idx];
                          blocks[idx] = tmp;
                          const normalized = blocks.map((x, i) => ({ ...x, order: i + 1 }));
                          const saved = await window.cp.songs.replaceBlocks({
                            songId: song.id,
                            blocks: normalized.map((bb) => ({
                              order: bb.order,
                              type: bb.type,
                              title: bb.title ?? undefined,
                              content: bb.content,
                            })),
                          });
                          setSong(saved);
                        }}
                        style={{ padding: "8px 12px" }}
                      >
                        ↓
                      </button>
                    </div>

                    <textarea
                      value={b.content}
                      onChange={(e) => {
                        if (!song) return;
                        const blocks = song.blocks.map((x) => (x.id === b.id ? { ...x, content: e.target.value } : x));
                        setSong({ ...song, blocks });
                      }}
                      onBlur={async () => {
                        // Sauvegarde au blur pour éviter spam
                        if (!song) return;
                        const saved = await window.cp.songs.replaceBlocks({
                          songId: song.id,
                          blocks: song.blocks.map((bb, i) => ({
                            order: i + 1,
                            type: bb.type,
                            title: bb.title ?? undefined,
                            content: bb.content,
                          })),
                        });
                        setSong(saved);
                        await refreshList();
                      }}
                      rows={6}
                      style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 14 }}
                      placeholder="Tape les paroles (ligne par ligne)"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
