import React, { useEffect, useMemo, useState } from "react";

type LivePatch = {
  planId?: string | null;
  cursor?: number | null;
  enabled?: boolean;
  target?: ScreenKey;
  black?: boolean;
  white?: boolean;
};

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
      const blocks = splitBlocks(body);
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
  }, [body, blockCursor, target, title]);

  return (
    <div className="cp-page">
      <div className="panel cp-panel">
        <div className="cp-page-header">
          <div>
            <h1 className="cp-page-title" style={{ fontSize: 24, marginBottom: 4 }}>
              Live / Projection
            </h1>
            <div className="cp-page-subtitle">{status}</div>
          </div>
          <div className="cp-actions">
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={!!live?.enabled} onChange={(e) => updateLive({ enabled: e.target.checked })} />
              Live
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => updateLive({ target: k })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: target === k ? "2px solid #111" : "1px solid var(--border)",
                    background: target === k ? "#111" : "white",
                    color: target === k ? "white" : "#111",
                    fontWeight: 800,
                  }}
                >
                  {k}
                  {locked[k] ? " [LOCK]" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cp-actions" style={{ marginTop: 10 }}>
          <button onClick={() => window.cp.live?.toggleBlack()}>Noir (B)</button>
          <button onClick={() => window.cp.live?.toggleWhite()}>Blanc (W)</button>
          <button onClick={() => window.cp.live?.resume()}>Reprendre (R)</button>
          <button onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(stateA?.lowerThirdEnabled ?? false) })}>Lower Third (L)</button>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>Taille</span>
            <button
              onClick={() =>
                window.cp.projection.setAppearance({
                  textScale: Math.max(0.5, (stateA?.textScale ?? 1) - 0.1),
                })
              }
            >
              -
            </button>
            <div style={{ minWidth: 46, textAlign: "center" }}>{Math.round((stateA?.textScale ?? 1) * 100)}%</div>
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

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>Fond</span>
            <input
              type="color"
              value={stateA?.background || "#050505"}
              onChange={(e) => window.cp.projection.setAppearance({ background: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>Texte</span>
            <input
              type="color"
              value={stateA?.foreground || "#ffffff"}
              onChange={(e) => window.cp.projection.setAppearance({ foreground: e.target.value })}
            />
          </div>

          <div className="cp-chip-row" style={{ marginLeft: 10 }}>
            {(["A", "B", "C"] as ScreenKey[]).map((k) => (
              <label key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" checked={!!locked[k]} onChange={(e) => window.cp.live?.setLocked(k, e.target.checked)} />
                Lock {k}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="panel cp-panel">
        <div style={{ fontWeight: 900, marginBottom: 4 }}>Ecrans (ouvrir / miroir)</div>
        <div className="cp-actions">
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
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
                <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
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
        </div>
        <div className="cp-page-subtitle" style={{ fontSize: 12, marginTop: 6 }}>
          Astuce: B/C en miroir suivent A. Decoche pour utiliser en ecran libre (versets, annonces...).
        </div>
      </div>

      <div className="panel cp-panel" style={{ maxWidth: 980 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Texte rapide</h2>

        <label>
          <div style={{ fontWeight: 700 }}>Titre</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="cp-input-full" style={{ fontSize: 16 }} />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Texte</div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="cp-input-full" style={{ fontSize: 16 }} />
        </label>

        <div className="cp-actions">
          <button
            className="btn-primary"
            onClick={async () => {
              const blocks = splitBlocks(body);
              if (blocks.length === 0) {
                await projectText(target, title, "");
                setBlockCursor(-1);
                return;
              }
              setBlockCursor(0);
              await projectText(target, title, blocks[0]);
            }}
            style={{ fontSize: 16 }}
          >
            Afficher
          </button>
          <button onClick={() => window.cp.devtools?.open?.("REGIE")}>DevTools Regie</button>
          <button onClick={() => window.cp.devtools?.open?.("PROJECTION")}>DevTools Projection</button>
        </div>

        <div className="panel cp-panel cp-panel-soft" style={{ marginTop: 4 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Blocs (clic ou ^/v)</div>
          {splitBlocks(body).length === 0 ? (
            <div style={{ opacity: 0.7 }}>Aucun bloc (separe avec des lignes vides).</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {splitBlocks(body).map((b, idx) => {
                const active = idx === blockCursor;
                return (
                  <button
                    key={idx}
                    onClick={async () => {
                      setBlockCursor(idx);
                      await projectText(target, title, b);
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: active ? "2px solid #111" : "1px solid var(--border)",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>#{idx + 1}</div>
                    <div style={{ opacity: 0.8, whiteSpace: "pre-wrap" }}>{b.length > 120 ? `${b.slice(0, 120)}...` : b}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="cp-alert" style={{ marginTop: 8, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>Raccourcis</div>
          <div>{"1/2/3 = cible A/B/C * <-/-> = plan live prev/next * B/W/R = noir/blanc/reprendre * ^/v = bloc * Entree/Espace = projeter bloc"}</div>
        </div>
      </div>
    </div>
  );
}
