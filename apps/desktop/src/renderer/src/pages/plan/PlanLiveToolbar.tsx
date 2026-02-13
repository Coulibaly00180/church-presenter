import React from "react";
import { LiveState, ScreenKey } from "./types";
import { ActionRow, Panel } from "../../ui/primitives";
import { LiveEnabledToggle, LiveLockChips, LiveTargetButtons } from "../../ui/liveControls";

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
    <Panel soft className="cp-mt-12">
      <ActionRow>
        <LiveEnabledToggle value={liveEnabled} onChange={(enabled) => onUpdateLive({ enabled })} />

        <LiveTargetButtons
          target={target}
          locked={live?.lockedScreens}
          onChange={(screen) => onUpdateLive({ target: screen as ScreenKey })}
          className="cp-inline-row-tight"
          buttonClassName="cp-target-btn-live"
        />

        <LiveLockChips
          locked={live?.lockedScreens}
          onToggle={(screen, isLocked) => onSetLocked(screen as ScreenKey, isLocked)}
          className="cp-chip-row"
          itemClassName="cp-inline-check cp-text-13"
        />

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
