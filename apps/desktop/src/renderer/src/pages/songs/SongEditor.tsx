import React from "react";
import { ActionRow, Field } from "../../ui/primitives";
import { projectTextToScreen } from "../../projection/target";

type SongEditorProps = {
  song: CpSongDetail;
  target: ScreenKey;
  planId: string;
  // meta form
  title: string; onSetTitle: (v: string) => void;
  artist: string; onSetArtist: (v: string) => void;
  album: string; onSetAlbum: (v: string) => void;
  year: string; onSetYear: (v: string) => void;
  saving: boolean;
  // actions
  onSaveMeta: () => void;
  onSaveBlocks: () => void;
  onDelete: () => void;
  onAddBlock: (type: string) => void;
  onRemoveBlock: (i: number) => void;
  onUpdateBlock: (i: number, patch: Partial<CpSongBlock>) => void;
  onAddBlockToPlan: (i: number) => void;
  onAddAllBlocksToPlan: () => void;
};

export function SongEditor({
  song, target, planId,
  title, onSetTitle, artist, onSetArtist, album, onSetAlbum, year, onSetYear,
  saving,
  onSaveMeta, onSaveBlocks, onDelete,
  onAddBlock, onRemoveBlock, onUpdateBlock,
  onAddBlockToPlan, onAddAllBlocksToPlan,
}: SongEditorProps) {
  async function projectBlock(i: number) {
    const b = song.blocks[i];
    const metaSong = {
      title: song.title,
      artist: song.artist ?? undefined,
      album: song.album ?? undefined,
      year: song.year ?? song.tags ?? undefined,
    };
    await projectTextToScreen({ target, title: song.title, body: b.content || "", metaSong });
  }

  async function projectAllAsFlow() {
    const text = song.blocks.map((b) => (b.content ?? "").trim()).filter(Boolean).join("\n\n");
    const metaSong = {
      title: song.title,
      artist: song.artist ?? undefined,
      album: song.album ?? undefined,
      year: song.year ?? song.tags ?? undefined,
    };
    await projectTextToScreen({ target, title: song.title, body: text, metaSong });
  }

  return (
    <>
      <ActionRow className="cp-mb-10">
        <b className="cp-flex-1">Édition</b>
        <button onClick={onSaveMeta} disabled={saving}>Sauver meta</button>
        <button onClick={onSaveBlocks} disabled={saving}>Sauver blocs</button>
        <button onClick={onDelete} disabled={saving}>Supprimer</button>
      </ActionRow>

      <div className="cp-song-meta-grid">
        <Field label="Titre"><input value={title} onChange={(e) => onSetTitle(e.target.value)} /></Field>
        <Field label="Artiste"><input value={artist} onChange={(e) => onSetArtist(e.target.value)} /></Field>
        <Field label="Album"><input value={album} onChange={(e) => onSetAlbum(e.target.value)} /></Field>
        <Field label="Annee"><input value={year} onChange={(e) => onSetYear(e.target.value)} /></Field>
      </div>

      <ActionRow className="cp-mb-12">
        <button onClick={() => onAddBlock("VERSE")}>+ Couplet</button>
        <button onClick={() => onAddBlock("CHORUS")}>+ Refrain</button>
        <button onClick={() => onAddBlock("BRIDGE")}>+ Pont</button>
        <button onClick={projectAllAsFlow}>Projeter tout</button>
        <button onClick={onAddAllBlocksToPlan} disabled={!planId}>Ajouter tout au plan</button>
      </ActionRow>

      <div className="cp-song-block-stack">
        {song.blocks.map((b, idx) => (
          <div key={idx} className="cp-song-block-card">
            <ActionRow className="cp-mb-8">
              <b className="cp-flex-1">
                {b.title || b.type} <span className="cp-song-block-index">#{idx + 1}</span>
              </b>
              <button onClick={() => projectBlock(idx)}>Projeter</button>
              <button onClick={() => onAddBlockToPlan(idx)} disabled={!planId}>Ajouter au plan</button>
              <button onClick={() => onRemoveBlock(idx)}>Supprimer</button>
            </ActionRow>

            <div className="cp-song-block-fields">
              <Field label="Type">
                <select value={b.type} onChange={(e) => onUpdateBlock(idx, { type: e.target.value })}>
                  <option value="VERSE">VERSE</option>
                  <option value="CHORUS">CHORUS</option>
                  <option value="BRIDGE">BRIDGE</option>
                  <option value="TAG">TAG</option>
                </select>
              </Field>
              <Field label="Titre du bloc">
                <input value={b.title ?? ""} onChange={(e) => onUpdateBlock(idx, { title: e.target.value })} />
              </Field>
            </div>

            <textarea
              value={b.content}
              onChange={(e) => onUpdateBlock(idx, { content: e.target.value })}
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
  );
}
