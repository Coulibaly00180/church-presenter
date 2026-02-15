import React from "react";
import { ActionRow, Panel } from "../../ui/primitives";
import { cls } from "../../ui/cls";

type SongListProps = {
  q: string;
  onSetQ: (q: string) => void;
  filtered: CpSongListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: (q: string) => void;
};

export function SongList({ q, onSetQ, filtered, selectedId, onSelect, onRefresh }: SongListProps) {
  return (
    <Panel className="cp-panel-flat">
      <div className="cp-song-list-head">
        <input
          value={q}
          onChange={(e) => onSetQ(e.target.value)}
          placeholder="Rechercher (titre, artiste, paroles…)"
          className="cp-input-full"
        />
        <ActionRow className="cp-mt-8">
          <button onClick={() => onRefresh(q)}>Rechercher</button>
          <button onClick={() => { onSetQ(""); onRefresh(""); }}>Reinitialiser</button>
        </ActionRow>
        {filtered.length > 0 && q.trim().length > 0 ? (
          <div className="cp-song-suggest-list">
            {filtered.slice(0, 8).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
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
            onClick={() => onSelect(s.id)}
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
  );
}
