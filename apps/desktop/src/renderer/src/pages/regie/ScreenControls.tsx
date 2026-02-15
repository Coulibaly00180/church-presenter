import React from "react";
import { Panel, ToolbarRow } from "../../ui/primitives";

type ScreenControlsProps = {
  screens: CpScreenMeta[];
  projOpenA: boolean;
  onSetScreens: React.Dispatch<React.SetStateAction<CpScreenMeta[]>>;
  onSetProjOpenA: (open: boolean) => void;
};

export function ScreenControls({ screens, projOpenA, onSetScreens, onSetProjOpenA }: ScreenControlsProps) {
  return (
    <Panel>
      <div className="cp-section-label">Ecrans (ouverture / miroir)</div>
      <ToolbarRow>
        <button
          onClick={async () => {
            const r = await window.cp.projectionWindow.open();
            onSetProjOpenA(!!r?.isOpen);
          }}
        >
          {projOpenA ? "A ouvert" : "Ouvrir A"}
        </button>

        {(["B", "C"] as ScreenKey[]).map((k) => {
          const meta = screens.find((s) => s.key === k);
          const isOpen = !!meta?.isOpen;
          const isMirror = meta?.mirror?.kind === "MIRROR";
          return (
            <div key={k} className="cp-inline-row-tight">
              <button
                onClick={async () => {
                  if (!window.cp.screens) return;
                  const res = isOpen ? await window.cp.screens.close(k) : await window.cp.screens.open(k);
                  if (res) {
                    onSetScreens((prev) => prev.map((s) => (s.key === k ? { ...s, isOpen: !!res.isOpen } : s)));
                  }
                }}
              >
                {isOpen ? `Fermer ${k}` : `Ouvrir ${k}`}
              </button>
              <label className="cp-inline-check">
                <input
                  type="checkbox"
                  checked={isMirror}
                  onChange={async (e) => {
                    const mirror: ScreenMirrorMode = e.target.checked ? { kind: "MIRROR", from: "A" } : { kind: "FREE" };
                    await window.cp.screens.setMirror(k, mirror);
                    onSetScreens((prev) => prev.map((s) => (s.key === k ? { ...s, mirror } : s)));
                  }}
                />
                {k} miroir de A
              </label>
            </div>
          );
        })}

        <button onClick={() => window.cp.devtools?.open?.("SCREEN_A")}>Outils dev A</button>
        <button onClick={() => window.cp.devtools?.open?.("SCREEN_B")}>Outils dev B</button>
        <button onClick={() => window.cp.devtools?.open?.("SCREEN_C")}>Outils dev C</button>
      </ToolbarRow>
      <div className="cp-help-text">
        Astuce: B/C en miroir suivent A. Decoche pour utiliser en ecran libre (versets, annonces...).
      </div>
    </Panel>
  );
}
