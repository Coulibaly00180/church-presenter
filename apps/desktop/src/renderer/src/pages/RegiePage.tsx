import React, { useEffect, useMemo, useState } from "react";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

type SongListItem = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  updatedAt: string;
};

type SongBlock = {
  id: string;
  order: number;
  type: string;
  title?: string | null;
  content: string;
};

type Song = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  blocks: SongBlock[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function RegiePage() {
  const canUse = !!window.cp?.songs && !!window.cp?.projection && !!window.cp?.projectionWindow;

  const [projOpen, setProjOpen] = useState(false);
  const [projState, setProjState] = useState<any>(null);

  // songs
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);

  // edit meta
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");

  // blocks cursor for live navigation
  const [blockCursor, setBlockCursor] = useState<number>(-1);

  async function refreshSongs(search?: string) {
    const list = await window.cp.songs.list(search);
    setSongs(list);
  }

  async function loadSong(id: string) {
    const s = await window.cp.songs.get(id);
    setSong(s);
    setSelectedId(id);
    setTitle(s.title ?? "");
    setArtist(s.artist ?? "");
    setAlbum(s.album ?? "");
    setBlockCursor(-1);
  }

  async function projectBlockByIndex(i: number) {
    if (!song) return;
    if (!projOpen) return;

    const blocks = song.blocks ?? [];
    if (blocks.length === 0) return;

    const idx = clamp(i, 0, blocks.length - 1);
    const b = blocks[idx];

    await window.cp.projection.setContentText({
      title: `${song.title}${b.title ? ` — ${b.title}` : ""}`,
      body: b.content ?? "",
    });
    setBlockCursor(idx);
  }

  useEffect(() => {
    if (!canUse) return;

    window.cp.projection.getState().then(setProjState);
    const offState = window.cp.projection.onState(setProjState);

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));
    const offWin = window.cp.projectionWindow.onWindowState((p: any) => setProjOpen(!!p.isOpen));

    refreshSongs("");

    return () => {
      offState();
      offWin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard shortcuts: B/W/R + arrows + Enter
  useEffect(() => {
    if (!canUse) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // global projection shortcuts
      if (e.key === "b" || e.key === "B") void window.cp.projection.setMode("BLACK");
      if (e.key === "w" || e.key === "W") void window.cp.projection.setMode("WHITE");
      if (e.key === "r" || e.key === "R") void window.cp.projection.setMode("NORMAL");

      // Navigation blocs uniquement si projection ouverte + song chargée
      if (!projOpen || !song) return;

      const blocks = song.blocks ?? [];
      if (blocks.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = clamp((blockCursor < 0 ? -1 : blockCursor) + 1, 0, blocks.length - 1);
        void projectBlockByIndex(next);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = clamp((blockCursor < 0 ? 0 : blockCursor) - 1, 0, blocks.length - 1);
        void projectBlockByIndex(prev);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const idx = blockCursor >= 0 ? blockCursor : 0;
        void projectBlockByIndex(idx);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUse, projOpen, song, blockCursor]);


  // remote control from projection window (click left/right or ArrowLeft/Right)
  useEffect(() => {
    if (!canUse) return;
    if (!window.cp?.projection?.onControl) return;

    const off = window.cp.projection.onControl((action: "NEXT" | "PREV") => {
      if (!projOpen || !song) return;
      const blocks = song.blocks ?? [];
      if (blocks.length === 0) return;

      if (action === "NEXT") {
        const next = clamp((blockCursor < 0 ? -1 : blockCursor) + 1, 0, blocks.length - 1);
        void projectBlockByIndex(next);
      } else {
        const prev = clamp((blockCursor < 0 ? 0 : blockCursor) - 1, 0, blocks.length - 1);
        void projectBlockByIndex(prev);
      }
    });

    return () => off();
  }, [canUse, projOpen, song, blockCursor]);

  const status = useMemo(() => {
    const mode = projState?.mode ?? "NORMAL";
    return `Mode=${mode} | Projection=${projOpen ? "OPEN" : "CLOSED"}`;
  }, [projState, projOpen]);

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Régie</h1>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.songs indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Chants</h1>
          <p style={{ opacity: 0.75, marginTop: 6 }}>{status}</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12, marginTop: 12 }}>
        {/* LEFT: list */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche (titre, artiste, paroles...)"
              style={{ flex: 1, padding: 10 }}
            />
            <button onClick={() => refreshSongs(q)} style={{ padding: "10px 14px" }}>
              Rechercher
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                const created = await window.cp.songs.create({ title: "Nouveau chant" });
                await refreshSongs(q);
                await loadSong(created.id);
              }}
              style={{ padding: "10px 14px" }}
            >
              + Chant
            </button>

            <button
              onClick={async () => {
                setQ("");
                await refreshSongs("");
              }}
              style={{ padding: "10px 14px" }}
            >
              Reset
            </button>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflow: "auto" }}>
            {songs.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSong(s.id)}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border: selectedId === s.id ? "2px solid #111" : "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 900 }}>{s.title}</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  {(s.artist || "—") + (s.album ? ` • ${s.album}` : "")}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: editor */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          {!song ? (
            <div style={{ opacity: 0.75 }}>Sélectionne un chant à gauche.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Édition</div>
                <button
                  onClick={async () => {
                    if (!confirm("Supprimer ce chant ?")) return;
                    await window.cp.songs.delete(song.id);
                    setSong(null);
                    setSelectedId(null);
                    await refreshSongs(q);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Supprimer
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <label>
                  <div style={{ fontWeight: 700 }}>Titre</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
                <label>
                  <div style={{ fontWeight: 700 }}>Artiste</div>
                  <input value={artist} onChange={(e) => setArtist(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
                <label style={{ gridColumn: "1 / span 2" }}>
                  <div style={{ fontWeight: 700 }}>Album</div>
                  <input value={album} onChange={(e) => setAlbum(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  onClick={async () => {
                    const updated = await window.cp.songs.updateMeta({
                      id: song.id,
                      title: title.trim() || "Sans titre",
                      artist: artist.trim() || undefined,
                      album: album.trim() || undefined,
                    });
                    setSong(updated);
                    await refreshSongs(q);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Enregistrer meta
                </button>

                <button
                  onClick={async () => {
                    if (!projOpen) return alert("Ouvre la projection d’abord.");
                    if (!song.blocks?.length) return alert("Aucun bloc.");
                    await projectBlockByIndex(0);
                  }}
                  style={{ padding: "10px 14px" }}
                >
                  Projeter 1er bloc
                </button>

                <div style={{ opacity: 0.7, alignSelf: "center" }}>
                  Raccourcis: ↑/↓ blocs, Enter projeter, B/W/R modes
                </div>
              </div>

              <hr style={{ margin: "14px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>Blocs</div>
                <button
                  onClick={async () => {
                    const nextOrder = (song.blocks?.length ?? 0) + 1;
                    const newBlocks = [
                      ...(song.blocks ?? []),
                      { order: nextOrder, type: "VERSE", title: `Couplet ${nextOrder}`, content: "" },
                    ];
                    const updated = await window.cp.songs.replaceBlocks({ songId: song.id, blocks: newBlocks });
                    setSong(updated);
                  }}
                  style={{ padding: "8px 10px" }}
                >
                  + Bloc
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {(song.blocks ?? []).map((b, idx) => {
                  const selected = idx === blockCursor;
                  return (
                    <div
                      key={b.id ?? `${b.order}-${idx}`}
                      style={{
                        border: selected ? "2px solid #111" : "1px solid #ddd",
                        borderRadius: 12,
                        padding: 10,
                        background: "white",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>
                          #{b.order} — {b.title || b.type}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={async () => {
                              if (!projOpen) return alert("Ouvre la projection d’abord.");
                              await projectBlockByIndex(idx);
                            }}
                            style={{ padding: "8px 10px" }}
                          >
                            Projeter
                          </button>
                          <button
                            onClick={async () => {
                              const copy = [...(song.blocks ?? [])];
                              copy.splice(idx, 1);
                              const reOrdered = copy.map((x, i) => ({ ...x, order: i + 1 }));
                              const updated = await window.cp.songs.replaceBlocks({ songId: song.id, blocks: reOrdered });
                              setSong(updated);
                              setBlockCursor((c) => (c === idx ? -1 : c > idx ? c - 1 : c));
                            }}
                            style={{ padding: "8px 10px" }}
                          >
                            Suppr
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8, marginTop: 8 }}>
                        <label>
                          <div style={{ fontWeight: 700 }}>Type</div>
                          <select
                            value={b.type}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSong((prev) => {
                                if (!prev) return prev;
                                const blocks = prev.blocks.map((x, i) => (i === idx ? { ...x, type: next } : x));
                                return { ...prev, blocks };
                              });
                            }}
                            style={{ width: "100%", padding: 10 }}
                          >
                            <option value="VERSE">VERSE</option>
                            <option value="CHORUS">CHORUS</option>
                            <option value="BRIDGE">BRIDGE</option>
                            <option value="INTRO">INTRO</option>
                            <option value="OUTRO">OUTRO</option>
                            <option value="TAG">TAG</option>
                          </select>
                        </label>

                        <label>
                          <div style={{ fontWeight: 700 }}>Titre bloc</div>
                          <input
                            value={b.title ?? ""}
                            onChange={(e) => {
                              const next = e.target.value;
                              setSong((prev) => {
                                if (!prev) return prev;
                                const blocks = prev.blocks.map((x, i) => (i === idx ? { ...x, title: next } : x));
                                return { ...prev, blocks };
                              });
                            }}
                            style={{ width: "100%", padding: 10 }}
                          />
                        </label>
                      </div>

                      <label style={{ display: "block", marginTop: 8 }}>
                        <div style={{ fontWeight: 700 }}>Paroles</div>
                        <textarea
                          value={b.content ?? ""}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSong((prev) => {
                              if (!prev) return prev;
                              const blocks = prev.blocks.map((x, i) => (i === idx ? { ...x, content: next } : x));
                              return { ...prev, blocks };
                            });
                          }}
                          rows={5}
                          style={{ width: "100%", padding: 10 }}
                        />
                      </label>

                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={async () => {
                            // persist all blocks
                            const payloadBlocks = (song.blocks ?? []).map((x, i) => ({
                              order: i + 1,
                              type: x.type,
                              title: x.title ?? undefined,
                              content: x.content ?? "",
                            }));
                            const updated = await window.cp.songs.replaceBlocks({ songId: song.id, blocks: payloadBlocks });
                            setSong(updated);
                          }}
                          style={{ padding: "8px 10px" }}
                        >
                          Enregistrer blocs
                        </button>

                        <button
                          onClick={() => {
                            setBlockCursor(idx);
                            if (projOpen) void projectBlockByIndex(idx);
                          }}
                          style={{ padding: "8px 10px" }}
                        >
                          Sélectionner
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
