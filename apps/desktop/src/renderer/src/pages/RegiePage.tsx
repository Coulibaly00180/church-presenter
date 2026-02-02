import React, { useEffect, useMemo, useState } from "react";

type ScreenKey = "A" | "B" | "C";
type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
type ProjectionState = { mode: string; lowerThirdEnabled: boolean; current: any };
type ScreenMeta = { key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode };
type LiveState = {
  enabled: boolean;
  planId: string | null;
  cursor: number;
  target: ScreenKey;
  black: boolean;
  white: boolean;
  lockedScreens: Record<ScreenKey, boolean>;
  updatedAt: number;
};

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function projectText(target: ScreenKey, title: string | undefined, body: string) {
  const screensApi = window.cp.screens;
  const list: ScreenMeta[] = screensApi ? await screensApi.list() : [];
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

  const res: any = await screensApi.setContentText(dest, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

export function RegiePage() {
  const [title, setTitle] = useState("Bienvenue");
  const [body, setBody] = useState("Tape ton texte ici, puis clique Afficher.");
  const [stateA, setStateA] = useState<ProjectionState | null>(null);
  const [screens, setScreens] = useState<ScreenMeta[]>([]);
  const [projOpenA, setProjOpenA] = useState(false);
  const [blockCursor, setBlockCursor] = useState<number>(-1);
  const [live, setLive] = useState<LiveState | null>(null);

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
    const off = window.cp.live.onUpdate((s: LiveState) => setLive(s));
    return () => off?.();
  }, []);

  async function updateLive(patch: Partial<LiveState>) {
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

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        window.cp.live?.prev();
      }
      if (e.key === "ArrowRight" || e.key === " ") {
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
    <div style={{ fontFamily: "system-ui", padding: 16, display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Live / Projection</div>
            <div style={{ opacity: 0.75 }}>{status}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!live?.enabled}
                onChange={(e) => updateLive({ enabled: e.target.checked })}
              />
              Live
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["A", "B", "C"] as ScreenKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => updateLive({ target: k })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: target === k ? "2px solid #111" : "1px solid #ddd",
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => window.cp.live?.toggleBlack()} style={{ padding: "10px 14px" }}>
            Noir (B)
          </button>
          <button onClick={() => window.cp.live?.toggleWhite()} style={{ padding: "10px 14px" }}>
            Blanc (W)
          </button>
          <button onClick={() => window.cp.live?.resume()} style={{ padding: "10px 14px" }}>
            Reprendre (R)
          </button>
          <button
            onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(stateA?.lowerThirdEnabled ?? false) })}
            style={{ padding: "10px 14px" }}
          >
            Lower Third (L)
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 10 }}>
            {(["A", "B", "C"] as ScreenKey[]).map((k) => (
              <label key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!locked[k]}
                  onChange={(e) => window.cp.live?.setLocked(k, e.target.checked)}
                />
                Lock {k}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900, marginBottom: 4 }}>Ecrans (ouvrir / miroir)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
                      if (!window.cp.screens) return;
                      const mirror = e.target.checked ? { kind: "MIRROR", from: "A" } : { kind: "FREE" };
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
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Astuce: B/C en miroir suivent A. Decoche pour utiliser en ecran libre (versets, annonces...).
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 900 }}>
        <h2 style={{ margin: 0 }}>Texte rapide</h2>

        <label>
          <div style={{ fontWeight: 700 }}>Titre</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 16 }} />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Texte</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
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
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Afficher
          </button>
          <button onClick={() => window.cp.devtools?.open?.("REGIE")} style={{ padding: "10px 14px" }}>
            DevTools Regie
          </button>
          <button onClick={() => window.cp.devtools?.open?.("PROJECTION")} style={{ padding: "10px 14px" }}>
            DevTools Projection
          </button>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
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
                      border: active ? "2px solid #111" : "1px solid #ddd",
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

        <div style={{ marginTop: 8, padding: 12, background: "#f5f5f5", borderRadius: 8, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>Raccourcis</div>
          <div>
            {"1/2/3 = cible A/B/C * <-/-> = plan live prev/next * B/W/R = noir/blanc/reprendre * ^/v = bloc * Entree/Espace = projeter bloc"}
          </div>
        </div>
      </div>
    </div>
  );
}
