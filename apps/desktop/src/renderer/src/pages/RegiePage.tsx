import React, { useEffect, useMemo, useState } from "react";
import { ActionRow, Alert, Field, PageHeader, Panel } from "../ui/primitives";

type LivePatch = {
  planId?: string | null;
  cursor?: number | null;
  enabled?: boolean;
  target?: ScreenKey;
  black?: boolean;
  white?: boolean;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function projectText(target: ScreenKey, title: string | undefined, body: string) {
  const screensApi = window.cp.screens;
  const list: CpScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow?.open?.();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const isMirrorOfA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest: ScreenKey = isMirrorOfA ? "A" : target;

  if (dest === "A" || !screensApi) {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res = (await screensApi.setContentText(dest, { title, body })) as { ok?: boolean; reason?: string };
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

export function RegiePage() {
  const [title, setTitle] = useState("Bienvenue");
  const [body, setBody] = useState("Tape ton texte ici, puis clique Afficher.");
  const [stateA, setStateA] = useState<CpProjectionState | null>(null);
  const [screens, setScreens] = useState<CpScreenMeta[]>([]);
  const [projOpenA, setProjOpenA] = useState(false);
  const [blockCursor, setBlockCursor] = useState<number>(-1);
  const [live, setLive] = useState<CpLiveState | null>(null);

  const target = live?.target ?? "A";
  const locked = live?.lockedScreens ?? { A: false, B: false, C: false };

  useEffect(() => {
    window.cp.projection.getState().then(setStateA);
    const offProjection = window.cp.projection.onState(setStateA);

    const screensApi = window.cp.screens;
    if (screensApi) {
      screensApi.list().then(setScreens);
      const offA = screensApi.onWindowState("A", (p) => setProjOpenA(!!p.isOpen));
      const offB = screensApi.onWindowState("B", (p) =>
        setScreens((prev) => prev.map((s) => (s.key === "B" ? { ...s, isOpen: !!p.isOpen } : s)))
      );
      const offC = screensApi.onWindowState("C", (p) =>
        setScreens((prev) => prev.map((s) => (s.key === "C" ? { ...s, isOpen: !!p.isOpen } : s)))
      );
      return () => {
        offProjection();
        offA?.();
        offB?.();
        offC?.();
      };
    }

    window.cp.projectionWindow?.isOpen?.().then((r) => setProjOpenA(!!r?.isOpen));
    const offWin = window.cp.projectionWindow?.onWindowState?.((p) => setProjOpenA(!!p.isOpen));
    return () => {
      offProjection();
      offWin?.();
    };
  }, []);

  useEffect(() => {
    if (!window.cp.live) return;
    window.cp.live.get().then(setLive).catch(() => null);
    const off = window.cp.live.onUpdate(setLive);
    return () => off?.();
  }, []);

  async function updateLive(patch: LivePatch) {
    if (!window.cp.live) return;
    const next = await window.cp.live.set(patch);
    setLive(next);
  }

  const status = useMemo(() => {
    if (!stateA) return "Chargement...";
    return `Mode=${stateA.mode} * LowerThird=${stateA.lowerThirdEnabled ? "ON" : "OFF"} * A=${projOpenA ? "OUVERT" : "FERME"}`;
  }, [stateA, projOpenA]);
  const blocks = useMemo(() => splitBlocks(body), [body]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "1") {
        e.preventDefault();
        updateLive({ target: "A" });
      }
      if (e.key === "2") {
        e.preventDefault();
        updateLive({ target: "B" });
      }
      if (e.key === "3") {
        e.preventDefault();
        updateLive({ target: "C" });
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        window.cp.live?.toggleBlack();
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        window.cp.live?.toggleWhite();
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        window.cp.live?.resume();
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "q") {
        e.preventDefault();
        window.cp.live?.prev();
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key.toLowerCase() === "d") {
        e.preventDefault();
        window.cp.live?.next();
      }

      // Manual text navigation (up/down + Enter/Space)
      if (blocks.length === 0) return;

      const projectByIndex = async (idx: number) => {
        const bounded = Math.max(0, Math.min(idx, blocks.length - 1));
        setBlockCursor(bounded);
        await projectText(target, title, blocks[bounded]);
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        projectByIndex(Math.min((blockCursor < 0 ? -1 : blockCursor) + 1, blocks.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        projectByIndex(Math.max((blockCursor < 0 ? 0 : blockCursor) - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        projectByIndex(blockCursor >= 0 ? blockCursor : 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blocks, blockCursor, target, title]);

  return (
    <div className="cp-page">
      <Panel>
        <PageHeader
          title="Live / Projection"
          subtitle={status}
          titleClassName="cp-page-title-lg"
          actions={
            <ActionRow>
              <label className="cp-inline-field">
                <input type="checkbox" checked={!!live?.enabled} onChange={(e) => updateLive({ enabled: e.target.checked })} />
                <span>Live</span>
              </label>
              <div className="cp-target-picker">
                {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                  <button key={k} onClick={() => updateLive({ target: k })} className={cls("cp-target-btn", target === k && "is-active")}>
                    {k}
                    {locked[k] ? " [LOCK]" : ""}
                  </button>
                ))}
              </div>
            </ActionRow>
          }
        />

        <ActionRow className="cp-mt-10">
          <button onClick={() => window.cp.live?.toggleBlack()}>Noir (B)</button>
          <button onClick={() => window.cp.live?.toggleWhite()}>Blanc (W)</button>
          <button onClick={() => window.cp.live?.resume()}>Reprendre (R)</button>
          <button onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(stateA?.lowerThirdEnabled ?? false) })}>Lower Third (L)</button>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Taille</span>
            <button
              onClick={() =>
                window.cp.projection.setAppearance({
                  textScale: Math.max(0.5, (stateA?.textScale ?? 1) - 0.1),
                })
              }
            >
              -
            </button>
            <div className="cp-value-badge">{Math.round((stateA?.textScale ?? 1) * 100)}%</div>
            <button
              onClick={() =>
                window.cp.projection.setAppearance({
                  textScale: Math.min(2, (stateA?.textScale ?? 1) + 0.1),
                })
              }
            >
              +
            </button>
          </div>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Fond</span>
            <input
              type="color"
              value={stateA?.background || "#050505"}
              onChange={(e) => window.cp.projection.setAppearance({ background: e.target.value })}
            />
          </div>

          <div className="cp-inline-row-tight">
            <span className="cp-field-label">Texte</span>
            <input
              type="color"
              value={stateA?.foreground || "#ffffff"}
              onChange={(e) => window.cp.projection.setAppearance({ foreground: e.target.value })}
            />
          </div>

          <div className="cp-chip-row cp-chip-row--offset">
            {(["A", "B", "C"] as ScreenKey[]).map((k) => (
              <label key={k} className="cp-inline-check">
                <input type="checkbox" checked={!!locked[k]} onChange={(e) => window.cp.live?.setLocked(k, e.target.checked)} />
                Lock {k}
              </label>
            ))}
          </div>
        </ActionRow>
      </Panel>

      <Panel>
        <div className="cp-section-label">Ecrans (ouvrir / miroir)</div>
        <ActionRow>
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.open();
              setProjOpenA(!!r?.isOpen);
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
                      setScreens((prev) => prev.map((s) => (s.key === k ? { ...s, isOpen: !!res.isOpen } : s)));
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
                      setScreens((prev) => prev.map((s) => (s.key === k ? { ...s, mirror } : s)));
                    }}
                  />
                  {k} miroir de A
                </label>
              </div>
            );
          })}

          <button onClick={() => window.cp.devtools?.open?.("SCREEN_A")}>DevTools A</button>
          <button onClick={() => window.cp.devtools?.open?.("SCREEN_B")}>DevTools B</button>
          <button onClick={() => window.cp.devtools?.open?.("SCREEN_C")}>DevTools C</button>
        </ActionRow>
        <div className="cp-help-text">
          Astuce: B/C en miroir suivent A. Decoche pour utiliser en ecran libre (versets, annonces...).
        </div>
      </Panel>

      <Panel className="cp-panel-max-980">
        <h2 className="cp-section-title">Texte rapide</h2>

        <Field label="Titre">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="cp-input-full cp-input-lg" />
        </Field>

        <Field label="Texte">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="cp-input-full cp-input-lg" />
        </Field>

        <ActionRow>
          <button
            className="btn-primary cp-btn-lg"
            onClick={async () => {
              if (blocks.length === 0) {
                await projectText(target, title, "");
                setBlockCursor(-1);
                return;
              }
              setBlockCursor(0);
              await projectText(target, title, blocks[0]);
            }}
          >
            Afficher
          </button>
          <button onClick={() => window.cp.devtools?.open?.("REGIE")}>DevTools Regie</button>
          <button onClick={() => window.cp.devtools?.open?.("PROJECTION")}>DevTools Projection</button>
        </ActionRow>

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
                      setBlockCursor(idx);
                      await projectText(target, title, b);
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
    </div>
  );
}
