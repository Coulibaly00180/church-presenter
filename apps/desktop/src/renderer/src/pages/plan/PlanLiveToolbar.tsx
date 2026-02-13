import React from "react";
import { LiveState, ScreenKey } from "./types";
import { ActionRow, Panel } from "../../ui/primitives";

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

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PlanLiveToolbar(props: PlanLiveToolbarProps) {
  const { liveEnabled, target, live, filterSongsOnly, onUpdateLive, onSetLocked, onPrev, onNext, onSetFilterSongsOnly } = props;

  return (
    <Panel soft className="cp-mt-12">
      <ActionRow>
        <label className="cp-inline-field">
          <input type="checkbox" checked={liveEnabled} onChange={(e) => onUpdateLive({ enabled: e.target.checked })} />
          Live
        </label>

        <div className="cp-inline-row-tight">
          {(["A", "B", "C"] as ScreenKey[]).map((k) => (
            <button
              key={k}
              onClick={() => onUpdateLive({ target: k })}
              className={cls("cp-target-btn-live", target === k && "is-active")}
            >
              Ecran {k}
            </button>
          ))}
        </div>

        <div className="cp-chip-row">
          {(["A", "B", "C"] as ScreenKey[]).map((k) => (
            <label key={k} className="cp-inline-check cp-text-13">
              <input type="checkbox" checked={!!live?.lockedScreens?.[k]} onChange={(e) => onSetLocked(k, e.target.checked)} />
              Lock {k}
            </label>
          ))}
        </div>

        <div className="cp-inline-row-tight">
          <button onClick={onPrev}>{"< Prev"}</button>
          <button onClick={onNext}>{"Next >"}</button>
        </div>

        <label className="cp-inline-field">
          <input type="checkbox" checked={filterSongsOnly} onChange={(e) => onSetFilterSongsOnly(e.target.checked)} />
          Chants uniquement
        </label>
      </ActionRow>
    </Panel>
  );
}
