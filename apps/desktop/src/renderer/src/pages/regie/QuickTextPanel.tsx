import React from "react";
import { Alert, Field, Panel, ToolbarRow } from "../../ui/primitives";
import { cls } from "../../ui/cls";
import { projectTextToScreen } from "../../projection/target";

type QuickTextPanelProps = {
  title: string;
  onSetTitle: (v: string) => void;
  body: string;
  onSetBody: (v: string) => void;
  target: ScreenKey;
  blocks: string[];
  blockCursor: number;
  onSetBlockCursor: (cursor: number) => void;
};

export function QuickTextPanel({
  title, onSetTitle, body, onSetBody,
  target, blocks, blockCursor, onSetBlockCursor,
}: QuickTextPanelProps) {
  return (
    <Panel className="cp-panel-max-980">
      <h2 className="cp-section-title">Texte rapide</h2>

      <Field label="Titre">
        <input value={title} onChange={(e) => onSetTitle(e.target.value)} className="cp-input-full cp-input-lg" />
      </Field>

      <Field label="Texte">
        <textarea value={body} onChange={(e) => onSetBody(e.target.value)} rows={8} className="cp-input-full cp-input-lg" />
      </Field>

      <ToolbarRow>
        <button
          className="btn-primary cp-btn-lg"
          onClick={async () => {
            if (blocks.length === 0) {
              await projectTextToScreen({ target, title, body: "" });
              onSetBlockCursor(-1);
              return;
            }
            onSetBlockCursor(0);
            await projectTextToScreen({ target, title, body: blocks[0] });
          }}
        >
          Afficher
        </button>
        <button onClick={() => window.cp.devtools?.open?.("REGIE")}>Outils dev Regie</button>
        <button onClick={() => window.cp.devtools?.open?.("PROJECTION")}>Outils dev Projection</button>
      </ToolbarRow>

      <Panel soft className="cp-mt-4">
        <div className="cp-soft-heading">Blocs (clic ou ^/v)</div>
        {blocks.length === 0 ? (
          <div className="cp-muted">Aucun bloc (separe avec des lignes vides).</div>
        ) : (
          <div className="cp-block-list">
            {blocks.map((b, idx) => {
              const active = idx === blockCursor;
              return (
                <button
                  key={idx}
                  onClick={async () => {
                    onSetBlockCursor(idx);
                    await projectTextToScreen({ target, title, body: b });
                  }}
                  className={cls("cp-block-button", active && "is-active")}
                >
                  <div className="cp-field-label">#{idx + 1}</div>
                  <div className="cp-prewrap cp-muted-80">{b.length > 120 ? `${b.slice(0, 120)}...` : b}</div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Alert className="cp-alert-compact">
        <div className="cp-field-label">Raccourcis</div>
        <div>{"1/2/3 = cible A/B/C * <-/-> = plan live prev/next * B/W/R = noir/blanc/reprendre * ^/v = bloc * Entree/Espace = projeter bloc"}</div>
      </Alert>
    </Panel>
  );
}
