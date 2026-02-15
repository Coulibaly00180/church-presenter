import { useEffect, useMemo, useState } from "react";
import { projectTextToScreen } from "../../projection/target";

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

export function useRegieState() {
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

  async function updateLive(patch: CpLiveSetPayload) {
    if (!window.cp.live) return;
    const next = await window.cp.live.set(patch);
    setLive(next);
  }

  const status = useMemo(() => {
    if (!stateA) return "Chargement...";
    return `Mode=${stateA.mode} * LowerThird=${stateA.lowerThirdEnabled ? "ON" : "OFF"} * A=${projOpenA ? "OUVERT" : "FERME"}`;
  }, [stateA, projOpenA]);

  const blocks = useMemo(() => splitBlocks(body), [body]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "1") { e.preventDefault(); updateLive({ target: "A" }); }
      if (e.key === "2") { e.preventDefault(); updateLive({ target: "B" }); }
      if (e.key === "3") { e.preventDefault(); updateLive({ target: "C" }); }

      if (e.key === "b" || e.key === "B") { e.preventDefault(); window.cp.live?.toggleBlack(); }
      if (e.key === "w" || e.key === "W") { e.preventDefault(); window.cp.live?.toggleWhite(); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); window.cp.live?.resume(); }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "q") { e.preventDefault(); window.cp.live?.prev(); }
      if (e.key === "ArrowRight" || e.key === " " || e.key.toLowerCase() === "d") { e.preventDefault(); window.cp.live?.next(); }

      if (blocks.length === 0) return;

      const projectByIndex = async (idx: number) => {
        const bounded = Math.max(0, Math.min(idx, blocks.length - 1));
        setBlockCursor(bounded);
        await projectTextToScreen({ target, title, body: blocks[bounded] });
      };

      if (e.key === "ArrowDown") { e.preventDefault(); projectByIndex(Math.min((blockCursor < 0 ? -1 : blockCursor) + 1, blocks.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); projectByIndex(Math.max((blockCursor < 0 ? 0 : blockCursor) - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); projectByIndex(blockCursor >= 0 ? blockCursor : 0); }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blocks, blockCursor, target, title]);

  return {
    title, setTitle, body, setBody,
    stateA, screens, setScreens, projOpenA, setProjOpenA,
    blockCursor, setBlockCursor,
    live, target, locked,
    updateLive, status, blocks,
  };
}
