import React from "react";
import { PageHeader, Panel, ToolbarRow } from "../ui/primitives";
import { LiveActionsRow, LiveLockChips, LiveModeButtons } from "../ui/liveControls";
import { useRegieState } from "./regie/useRegieState";
import { ScreenControls } from "./regie/ScreenControls";
import { QuickTextPanel } from "./regie/QuickTextPanel";

export function RegiePage() {
  const r = useRegieState();

  return (
    <div className="cp-page">
      <Panel>
        <PageHeader
          title="Live / Projection"
          subtitle={r.status}
          titleClassName="cp-page-title-lg"
          actions={
            <LiveActionsRow
              liveEnabled={!!r.live?.enabled}
              onSetEnabled={(enabled) => r.updateLive({ enabled })}
              target={r.target}
              onSetTarget={(screen) => r.updateLive({ target: screen as ScreenKey })}
              locked={r.locked}
              targetContainerClassName="cp-target-picker"
              targetButtonClassName="cp-target-btn"
              targetLabelFormatter={(screen, isLocked) => (
                <>
                  {screen}
                  {isLocked ? " [Lock]" : ""}
                </>
              )}
            />
          }
        />

        <ToolbarRow className="cp-mt-10">
          <LiveModeButtons
            onBlack={() => window.cp.live?.toggleBlack()}
            onWhite={() => window.cp.live?.toggleWhite()}
            onResume={() => window.cp.live?.resume()}
          />
          <button onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(r.stateA?.lowerThirdEnabled ?? false) })}>Lower Third (L)</button>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Taille</span>
            <button onClick={() => window.cp.projection.setAppearance({ textScale: Math.max(0.5, (r.stateA?.textScale ?? 1) - 0.1) })}>-</button>
            <div className="cp-value-badge">{Math.round((r.stateA?.textScale ?? 1) * 100)}%</div>
            <button onClick={() => window.cp.projection.setAppearance({ textScale: Math.min(2, (r.stateA?.textScale ?? 1) + 0.1) })}>+</button>
          </div>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Fond</span>
            <input type="color" value={r.stateA?.background || "#050505"} onChange={(e) => window.cp.projection.setAppearance({ background: e.target.value })} />
          </div>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Texte</span>
            <input type="color" value={r.stateA?.foreground || "#ffffff"} onChange={(e) => window.cp.projection.setAppearance({ foreground: e.target.value })} />
          </div>

          <LiveLockChips
            locked={r.locked}
            onToggle={(screen, isLocked) => window.cp.live?.setLocked(screen as ScreenKey, isLocked)}
            className="cp-chip-row cp-chip-row--offset"
            itemClassName="cp-inline-check"
          />
        </ToolbarRow>
      </Panel>

      <ScreenControls
        screens={r.screens}
        projOpenA={r.projOpenA}
        onSetScreens={r.setScreens}
        onSetProjOpenA={r.setProjOpenA}
      />

      <QuickTextPanel
        title={r.title}
        onSetTitle={r.setTitle}
        body={r.body}
        onSetBody={r.setBody}
        target={r.target}
        blocks={r.blocks}
        blockCursor={r.blockCursor}
        onSetBlockCursor={r.setBlockCursor}
      />
    </div>
  );
}
