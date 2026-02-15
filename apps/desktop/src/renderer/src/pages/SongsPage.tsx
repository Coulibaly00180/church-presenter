import React from "react";
import { Alert, PageHeader, Panel, ToolbarPanel } from "../ui/primitives";
import { PlanSelectField, ProjectionTargetField } from "../ui/headerControls";
import { useSongsState } from "./songs/useSongsState";
import { SongList } from "./songs/SongList";
import { SongEditor } from "./songs/SongEditor";

export function SongsPage() {
  const s = useSongsState();

  return (
    <div className="cp-page">
      <PageHeader
        title="Chants"
        subtitle="Bibliotheque, projection, ajout au plan"
        className="cp-page-header-start"
        actions={
          <>
            <ProjectionTargetField value={s.target} onChange={s.setTarget} wide />
            <PlanSelectField
              value={s.planId}
              plans={s.plans}
              getPlanId={(p) => p.id}
              getPlanLabel={(p) => (
                <>
                  {p.title || "Culte"} {s.formatPlanDate(p) ? `(${s.formatPlanDate(p)})` : ""}
                </>
              )}
              onChange={s.setPlanId}
              wide
            />
          </>
        }
      />

      {s.err ? <Alert tone="error"><b>Erreur :</b> {s.err}</Alert> : null}
      {s.info ? <Alert tone={s.info.kind}>{s.info.text}</Alert> : null}

      <ToolbarPanel>
        <input
          value={s.newSongTitle}
          onChange={(e) => s.setNewSongTitle(e.target.value)}
          placeholder="Titre du nouveau chant"
          className="cp-input-min-180 cp-flex-1"
        />
        <button className="btn-primary" onClick={s.onCreate}>+ Nouveau chant</button>
        <button
          onClick={async () => {
            if (!s.selectedId) return;
            const r = await window.cp.songs.exportWord(s.selectedId);
            if (r?.ok) s.setInfo({ kind: "success", text: "Export Word termine." });
          }}
          disabled={!s.selectedId}
        >
          Exporter Word
        </button>
        <button
          onClick={async () => {
            s.setImporting(true);
            const r = await window.cp.songs.importAuto();
            s.setImporting(false);
            if (r?.ok) {
              await s.refresh(s.q);
              const count = r.imported || 0;
              const detail = `${count} chant${count > 1 ? "s" : ""} importe${count > 1 ? "s" : ""}`;
              s.setInfo({ kind: "success", text: `Import termine: ${detail}.` });
              if (r?.errors?.length) {
                console.warn("Import errors:", r.errors);
                s.setErr(`${r.errors.length} erreur(s) durant l'import (voir console)`);
              }
            } else if (r?.canceled) {
              s.setInfo({ kind: "info", text: "Import annule." });
            }
          }}
          disabled={s.importing}
        >
          Importer des chants (docx / odt / json)
        </button>
      </ToolbarPanel>

      <div className="cp-grid-main cp-grid-main--songs">
        <SongList
          q={s.q}
          onSetQ={s.setQ}
          filtered={s.filtered}
          selectedId={s.selectedId}
          onSelect={s.loadSong}
          onRefresh={s.refresh}
        />

        <Panel>
          {!s.song ? (
            <div className="cp-muted">Sélectionne un chant à gauche ou crée-en un.</div>
          ) : (
            <SongEditor
              song={s.song}
              target={s.target}
              planId={s.planId}
              title={s.title} onSetTitle={s.setTitle}
              artist={s.artist} onSetArtist={s.setArtist}
              album={s.album} onSetAlbum={s.setAlbum}
              year={s.year} onSetYear={s.setYear}
              saving={s.saving}
              onSaveMeta={s.onSaveMeta}
              onSaveBlocks={s.onSaveBlocks}
              onDelete={s.onDelete}
              onAddBlock={s.addBlock}
              onRemoveBlock={s.removeBlock}
              onUpdateBlock={s.updateBlock}
              onAddBlockToPlan={s.addBlockToPlan}
              onAddAllBlocksToPlan={s.addAllBlocksToPlan}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
