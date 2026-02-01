type ScreenKey = "A" | "B" | "C";

import React, { useEffect, useMemo, useState } from "react";

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (t as any).isContentEditable;
}

function splitBlocks(text: string) {
  // Un "bloc" = paragraphes séparés par 1+ lignes vides
  return text
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}


async function projectTextToTarget(target: ScreenKey, title: string | undefined, body: string) {
  const screens = await window.cp.screens.list();
  const meta = screens.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen) {
    await window.cp.screens.open(target);
  }

  if (target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A") {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  if (target === "A") {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res: any = await window.cp.screens.setContentText(target, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

function isTypingTarget(t: EventTarget | null) {
  if (!t) return false;
  const el = t as HTMLElement;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}



export function RegiePage() {
  const [title, setTitle] = useState("Bienvenue");
  const [body, setBody] = useState("Tape ton texte ici, puis clique Afficher.");
  const [state, setState] = useState<any>(null);
  const [projOpen, setProjOpen] = useState<boolean>(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(() => localStorage.getItem("cp.live.planId"));
  const [liveEnabled, setLiveEnabled] = useState<boolean>(() => (localStorage.getItem("cp.live.enabled") ?? "1") === "1");
  const [liveTarget, setLiveTarget] = useState<ScreenKey>(() => (localStorage.getItem("cp.live.target") as ScreenKey) || "A");
  const [cursor, setCursor] = useState<number>(() => Number(localStorage.getItem("cp.live.cursor") ?? "-1"));
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [nextLabel, setNextLabel] = useState<string>("");

  const [screens, setScreens] = useState<any[]>([]);
  const [openB, setOpenB] = useState(false);
  const [openC, setOpenC] = useState(false);
  const [mirrorB, setMirrorB] = useState(true);
  const [mirrorC, setMirrorC] = useState(true);
  const [blockCursor, setBlockCursor] = useState<number>(-1);

  useEffect(() => {
    window.cp.projection.getState().then(setState);
    const offState = window.cp.projection.onState(setState);

    window.cp.projectionWindow.isOpen().then((r: any) => setProjOpen(!!r?.isOpen));

    // Multi-screens init
    if (window.cp.screens?.list) {
      window.cp.screens.list().then((list: any[]) => {
        setScreens(list);
        setOpenB(!!list.find((x) => x.key === "B")?.isOpen);
        setOpenC(!!list.find((x) => x.key === "C")?.isOpen);
        const mb = list.find((x) => x.key === "B")?.mirror;
        const mc = list.find((x) => x.key === "C")?.mirror;
        setMirrorB(mb?.kind !== "FREE");
        setMirrorC(mc?.kind !== "FREE");
      });

      const offB = window.cp.screens.onWindowState("B", (p: any) => setOpenB(!!p.isOpen));
      const offC = window.cp.screens.onWindowState("C", (p: any) => setOpenC(!!p.isOpen));

      return () => {
        offB();
        offC();
      };
    }

    const offWin = window.cp.projectionWindow.onWindowState((p) => setProjOpen(p.isOpen));

    return () => {
      offState();
      offWin();
    };
  }, []);

  // Load plans list for live control
  useEffect(() => {
    window.cp.plans.list().then(setPlans).catch(console.error);
  }, []);

  // Persist live settings
  useEffect(() => {
    if (activePlanId) localStorage.setItem("cp.live.planId", activePlanId);
    else localStorage.removeItem("cp.live.planId");
  }, [activePlanId]);

  useEffect(() => {
    localStorage.setItem("cp.live.enabled", liveEnabled ? "1" : "0");
  }, [liveEnabled]);

  useEffect(() => {
    localStorage.setItem("cp.live.target", liveTarget);
  }, [liveTarget]);

  useEffect(() => {
    localStorage.setItem("cp.live.cursor", String(cursor));
  }, [cursor]);

  async function ensureTargetOpen() {
    if (liveTarget === "A") {
      await window.cp.projectionWindow.open();
      return;
    }
    const s = await window.cp.screens.isOpen(liveTarget);
    if (!s?.isOpen) await window.cp.screens.open(liveTarget);
  }

  async function setBlack() {
    await ensureTargetOpen();
    if (liveTarget === "A") return window.cp.projection.setMode("BLACK");
    const res: any = await window.cp.screens.setMode(liveTarget, "BLACK");
    if (res?.ok === false) await window.cp.projection.setMode("BLACK");
  }

  async function setWhite() {
    await ensureTargetOpen();
    if (liveTarget === "A") return window.cp.projection.setMode("WHITE");
    const res: any = await window.cp.screens.setMode(liveTarget, "WHITE");
    if (res?.ok === false) await window.cp.projection.setMode("WHITE");
  }

  async function setNormal() {
    await ensureTargetOpen();
    if (liveTarget === "A") return window.cp.projection.setMode("NORMAL");
    const res: any = await window.cp.screens.setMode(liveTarget, "NORMAL");
    if (res?.ok === false) await window.cp.projection.setMode("NORMAL");
  }

  async function getActivePlan() {
    if (!activePlanId) return null;
    const p = await window.cp.plans.get(activePlanId);
    return p;
  }

  function labelForItem(item: any) {
    if (!item) return "";
    if (item.kind === "SONG_BLOCK") return `Chant • ${item.title || ""}`.trim();
    if (item.kind === "ANNOUNCEMENT_TEXT") return `Annonce • ${item.title || ""}`.trim();
    if (item.kind === "VERSE_MANUAL") return `Verset • ${item.title || ""}`.trim();
    if (item.kind === "VERSE_API") return `Verset • ${item.title || ""}`.trim();
    return `${item.kind} • ${item.title || ""}`.trim();
  }

  async function projectServiceItem(item: any) {
    if (!item) return;

    // SONG_BLOCK => fetch song + block
    if (item.kind === "SONG_BLOCK" && item.refId) {
      const s = await window.cp.songs.get(item.refId);
      const block = (s.blocks || []).find((b: any) => b.id === item.refSubId) || (s.blocks || [])[0];
      const body = block?.content || "";
      const t = item.title || s.title;
      await projectTextToTarget(liveTarget, t, body);
      return;
    }

    // Text-like
    if (item.kind === "ANNOUNCEMENT_TEXT" || item.kind === "VERSE_MANUAL" || item.kind === "VERSE_API") {
      await pr
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Live (Plan) : NEXT / PREV / Noir-Blanc</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Cible live
            <select value={liveTarget} onChange={(e) => setLiveTarget(e.target.value as ScreenKey)}>
              <option value="A">Écran A</option>
              <option value="B">Écran B</option>
              <option value="C">Écran C</option>
            </select>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Plan actif
            <select value={activePlanId ?? ""} onChange={(e) => setActivePlanId(e.target.value || null)}>
              <option value="">—</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.date?.slice(0, 10)} {p.title ? `- ${p.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={liveEnabled} onChange={(e) => setLiveEnabled(e.target.checked)} />
            Live activé
          </label>

          <button onClick={async () => { await ensureTargetOpen(); }}>Ouvrir cible</button>
          <button onClick={() => window.cp.devtools?.open?.("REGIE")}>DevTools Régie</button>

          <div style={{ flex: 1 }} />
          <button onClick={async () => { await setBlack(); }}>Noir (B)</button>
          <button onClick={async () => { await setWhite(); }}>Blanc (W)</button>
          <button onClick={async () => { await setNormal(); }}>Reprendre (R)</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>En cours</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{currentLabel || "—"}</div>
          </div>
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Suivant</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{nextLabel || "—"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={async () => { await goPrev(); }}>◀ Prev</button>
          <button onClick={async () => { await goNext(); }}>Next ▶</button>
          <button onClick={async () => { await projectCurrent(); }}>Projeter courant (Enter)</button>

          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Raccourcis : flèches / Enter / B/W/R (quand Régie est active) • Click gauche/droite sur projection = prev/next
          </div>
        </div>
      </div>
ojectTextToTarget(liveTarget, item.title || undefined, item.content || "");
      return;
    }

    // Fallback
    await projectTextToTarget(liveTarget, item.title || "Item", item.content || "");
  }

  async function refreshNowNext(p: any, idx: number) {
    const cur = idx >= 0 ? p?.items?.[idx] : null;
    const nxt = p?.items?.[idx + 1] ?? null;
    setCurrentLabel(cur ? labelForItem(cur) : "");
    setNextLabel(nxt ? labelForItem(nxt) : "");
  }

  async function projectIndex(i: number) {
    const p = await getActivePlan();
    if (!p) return;
    const item = p.items?.[i];
    if (!item) return;
    await projectServiceItem(item);
    setCursor(i);
    await refreshNowNext(p, i);
  }

  async function goNext() {
    if (!liveEnabled) return;
    const p = await getActivePlan();
    if (!p) return;
    const next = Math.min((cursor < 0 ? -1 : cursor) + 1, (p.items?.length ?? 0) - 1);
    if (next < 0) return;
    await projectIndex(next);
  }

  async function goPrev() {
    if (!liveEnabled) return;
    const p = await getActivePlan();
    if (!p) return;
    const prev = Math.max((cursor < 0 ? 0 : cursor) - 1, 0);
    await projectIndex(prev);
  }

  async function projectCurrent() {
    const p = await getActivePlan();
    if (!p) return;
    const idx = cursor >= 0 ? cursor : 0;
    await projectIndex(idx);
  }

  // Initialize now/next when plan changes
  useEffect(() => {
    (async () => {
      if (!activePlanId) {
        setCurrentLabel("");
        setNextLabel("");
        return;
      }
      const p = await getActivePlan();
      if (!p) return;
      const idx = cursor >= 0 ? cursor : -1;
      await refreshNowNext(p, idx);
    })().catch(console.error);
  }, [activePlanId]);

  // Keyboard shortcuts on Regie page
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if (!liveEnabled) return;
      if (!activePlanId) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        await goNext();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        await goPrev();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        await projectCurrent();
      }
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        await setBlack();
      }
      if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        await setWhite();
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        await setNormal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [liveEnabled, activePlanId, cursor, liveTarget]);

  // Controls from projection click/keys
  useEffect(() => {
    if (!window.cp?.projection?.onControl) return;
    const off = window.cp.projection.onControl(async (p) => {
      if (!liveEnabled) return;
      if (!activePlanId) return;
      // Only respond to controls from the currently targeted screen
      if (p?.screen && p.screen !== liveTarget) return;

      if (p.action === "NEXT") await goNext();
      if (p.action === "PREV") await goPrev();
    });
    return () => off();
  }, [liveEnabled, activePlanId, cursor, liveTarget]);


  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "b" || e.key === "B") window.cp.projection.setMode("BLACK");
      if (e.key === "w" || e.key === "W") window.cp.projection.setMode("WHITE");
      if (e.key === "r" || e.key === "R") window.cp.projection.setMode("NORMAL");
      if (e.key === "l" || e.key === "L") {
        window.cp.projection.setState({ lowerThirdEnabled: !(state?.lowerThirdEnabled ?? false) });
      }

      // Navigation blocs (↑ ↓) + Enter
      if (!projOpen) return;

      const blocks = splitBlocks(body);
      if (blocks.length === 0) return;

      const projectByIndex = async (i: number) => {
        const idx = Math.max(0, Math.min(i, blocks.length - 1));
        setBlockCursor(idx);
        await window.cp.projection.setContentText({
          title,
          body: blocks[idx],
        });
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min((blockCursor < 0 ? -1 : blockCursor) + 1, blocks.length - 1);
        void projectByIndex(next);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max((blockCursor < 0 ? 0 : blockCursor) - 1, 0);
        void projectByIndex(prev);
      }

      if (e.key === "Enter") {
        // Enter projette le bloc courant (ou le 1er)
        if (blocks.length > 0) {
          e.preventDefault();
          const idx = blockCursor >= 0 ? blockCursor : 0;
          void projectByIndex(idx);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, projOpen, body, title, blockCursor]);

  const status = useMemo(() => {
    if (!state) return "Loading…";
    return `Mode=${state.mode} | LowerThird=${state.lowerThirdEnabled ? "ON" : "OFF"} | Projection=${
      projOpen ? "OPEN" : "CLOSED"
    }`;
  }, [state, projOpen]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Écrans (A/B/C)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.open();
              setProjOpen(!!r?.isOpen);
            }}
          >
            Ouvrir A
          </button>

          <button
            onClick={async () => {
              if (!window.cp.screens) return;
              const r = openB ? await window.cp.screens.close("B") : await window.cp.screens.open("B");
              setOpenB(!!r?.isOpen);
            }}
          >
            {openB ? "Fermer B" : "Ouvrir B"}
          </button>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={mirrorB}
              onChange={async (e) => {
                const v = e.target.checked;
                setMirrorB(v);
                if (!window.cp.screens) return;
                await window.cp.screens.setMirror("B", v ? { kind: "MIRROR", from: "A" } : { kind: "FREE" });
              }}
            />
            B miroir de A
          </label>

          <button
            onClick={async () => {
              if (!window.cp.screens) return;
              const r = openC ? await window.cp.screens.close("C") : await window.cp.screens.open("C");
              setOpenC(!!r?.isOpen);
            }}
          >
            {openC ? "Fermer C" : "Ouvrir C"}
          </button>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={mirrorC}
              onChange={async (e) => {
                const v = e.target.checked;
                setMirrorC(v);
                if (!window.cp.screens) return;
                await window.cp.screens.setMirror("C", v ? { kind: "MIRROR", from: "A" } : { kind: "FREE" });
              }}
            />
            C miroir de A
          </label>

          <button onClick={() => window.cp.devtools?.open?.("SCREEN_A")}>DevTools A</button>
          <button onClick={() => window.cp.devtools?.open?.("SCREEN_B")}>DevTools B</button>
          <button onClick={() => window.cp.devtools?.open?.("SCREEN_C")}>DevTools C</button>
        </div>

        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
          Astuce : mets B/C en mode <b>Libre</b> pour afficher autre chose ensuite (versets/chant/plan). En mode miroir, ils suivent A.
        </div>
      </div>

      <h1 style={{ margin: 0 }}>Régie</h1>
      <p style={{ opacity: 0.75 }}>{status}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {!projOpen ? (
          <button
            onClick={async () => {
              try {
                console.log("[REGIE] open projection click");
                const r = await window.cp.projectionWindow.open();
                console.log("[REGIE] open result", r);
                setProjOpen(!!r?.isOpen);
              } catch (e) {
                console.error("[REGIE] open projection failed", e);
                alert("Impossible d'ouvrir la projection (voir console).");
              }
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Ouvrir Projection
          </button>
        ) : (
          <button
            onClick={async () => {
              const r = await window.cp.projectionWindow.close();
              setProjOpen(!!r?.isOpen);
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
          >
            Fermer Projection
          </button>
        )}

        <button
          onClick={() => window.cp.devtools.open("REGIE")}
          style={{ padding: "10px 14px", fontSize: 16 }}
        >
          DevTools Régie
        </button>

        <button
          onClick={() => window.cp.devtools.open("PROJECTION")}
          style={{ padding: "10px 14px", fontSize: 16 }}
          disabled={!projOpen}
          title={!projOpen ? "Ouvre la projection d’abord" : ""}
        >
          DevTools Projection
        </button>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <label>
          <div style={{ fontWeight: 600 }}>Titre</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Texte</div>
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
                await window.cp.projection.setContentText({ title, body: "" });
                setBlockCursor(-1);
                return;
              }
              setBlockCursor(0);
              await window.cp.projection.setContentText({ title, body: blocks[0] });
            }}
            style={{ padding: "10px 14px", fontSize: 16 }}
            disabled={!projOpen}
          >
            Afficher
          </button>

          <button onClick={() => window.cp.projection.setMode("BLACK")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Noir (B)
          </button>
          <button onClick={() => window.cp.projection.setMode("WHITE")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Blanc (W)
          </button>
          <button onClick={() => window.cp.projection.setMode("NORMAL")} style={{ padding: "10px 14px" }} disabled={!projOpen}>
            Reprendre (R)
          </button>

          <button
            onClick={() => window.cp.projection.setState({ lowerThirdEnabled: !(state?.lowerThirdEnabled ?? false) })}
            style={{ padding: "10px 14px" }}
            disabled={!projOpen}
          >
            Lower Third (L)
          </button>
        </div>

        <div style={{ marginTop: 6, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Blocs (clic ou ↑/↓)</div>
          {splitBlocks(body).length === 0 ? (
            <div style={{ opacity: 0.7 }}>Aucun bloc (sépare par des lignes vides).</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {splitBlocks(body).map((b, idx) => {
                const active = idx === blockCursor;
                return (
                  <button
                    key={idx}
                    onClick={async () => {
                      if (!projOpen) return;
                      setBlockCursor(idx);
                      await window.cp.projection.setContentText({ title, body: b });
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: active ? "2px solid #111" : "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                    title="Cliquer pour projeter"
                    disabled={!projOpen}
                  >
                    <div style={{ fontWeight: 800 }}>#{idx + 1}</div>
                    <div style={{ opacity: 0.8, whiteSpace: "pre-wrap" }}>
                      {b.length > 120 ? `${b.slice(0, 120)}…` : b}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Raccourcis</div>
          <div>B = Noir • W = Blanc • R = Reprendre • L = Lower third • ↑/↓ = bloc • Enter = projeter</div>
        </div>
      </div>
    </div>
  );
}
