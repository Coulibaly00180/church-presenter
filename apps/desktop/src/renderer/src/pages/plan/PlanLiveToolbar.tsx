import React from "react";
import { LiveState, ScreenKey } from "./types";

type PlanLiveToolbarProps = {
  liveEnabled: boolean;
  target: ScreenKey;
  live: LiveState | null;
  filterSongsOnly: boolean;
  onUpdateLive: (patch: Partial<LiveState>) => void | Promise<unknown>;
  onSetLocked: (screen: ScreenKey, locked: boolean) => void | Promise<unknown>;
  onPrev: () => void;
  onNext: () => void;
  onSetFilterSongsOnly: (value: boolean) => void;
};

export function PlanLiveToolbar(props: PlanLiveToolbarProps) {
  const { liveEnabled, target, live, filterSongsOnly, onUpdateLive, onSetLocked, onPrev, onNext, onSetFilterSongsOnly } = props;

  return (
    <div className="panel cp-panel cp-panel-soft" style={{ marginTop: 12 }}>
      <div className="cp-actions">
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={liveEnabled} onChange={(e) => onUpdateLive({ enabled: e.target.checked })} />
          Live
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          {(["A", "B", "C"] as ScreenKey[]).map((k) => (
            <button
              key={k}
              onClick={() => onUpdateLive({ target: k })}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: target === k ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: target === k ? "var(--primary-soft)" : "#fff",
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              Ecran {k}
            </button>
          ))}
        </div>

        <div className="cp-chip-row">
          {(["A", "B", "C"] as ScreenKey[]).map((k) => (
            <label key={k} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={!!live?.lockedScreens?.[k]} onChange={(e) => onSetLocked(k, e.target.checked)} />
              Lock {k}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onPrev}>{"< Prev"}</button>
          <button onClick={onNext}>{"Next >"}</button>
        </div>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={filterSongsOnly} onChange={(e) => onSetFilterSongsOnly(e.target.checked)} />
          Chants uniquement
        </label>
      </div>
    </div>
  );
}
