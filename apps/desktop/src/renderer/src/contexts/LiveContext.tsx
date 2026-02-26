import React, { createContext, useContext, useEffect, useState } from "react";

interface LiveContextValue {
  live: CpLiveState | null;
  loading: boolean;
  toggle: () => Promise<void>;
  /** Activate free mode (no plan required). Auto-switches from plan mode if needed. */
  startFreeMode: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  setCursor: (cursor: number) => Promise<void>;
  setTarget: (target: ScreenKey) => Promise<void>;
  toggleBlack: () => Promise<void>;
  toggleWhite: () => Promise<void>;
  resume: () => Promise<void>;
  setLocked: (key: ScreenKey, locked: boolean) => Promise<void>;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<CpLiveState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void window.cp.live.get().then((state) => {
      setLive(state);
      setLoading(false);
    });

    const unsub = window.cp.live.onUpdate((state) => {
      setLive(state);
    });

    return unsub;
  }, []);

  // Sync .mode-live class on body
  useEffect(() => {
    if (live === null) return;
    if (live.enabled) {
      document.body.classList.add("mode-live");
    } else {
      document.body.classList.remove("mode-live");
    }
    return () => {
      document.body.classList.remove("mode-live");
    };
  }, [live?.enabled]);

  const withUpdate = (fn: () => Promise<CpLiveState>) => async () => {
    const state = await fn();
    setLive(state);
  };

  const value: LiveContextValue = {
    live,
    loading,
    toggle: withUpdate(() => window.cp.live.toggle()),
    startFreeMode: withUpdate(() => window.cp.live.set({ enabled: true, planId: null, cursor: 0 })),
    next: withUpdate(() => window.cp.live.next()),
    prev: withUpdate(() => window.cp.live.prev()),
    setCursor: (cursor) => withUpdate(() => window.cp.live.setCursor(cursor))(),
    setTarget: (target) => withUpdate(() => window.cp.live.setTarget(target))(),
    toggleBlack: withUpdate(() => window.cp.live.toggleBlack()),
    toggleWhite: withUpdate(() => window.cp.live.toggleWhite()),
    resume: withUpdate(() => window.cp.live.resume()),
    setLocked: (key, locked) => withUpdate(() => window.cp.live.setLocked(key, locked))(),
  };

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLiveContext(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLiveContext must be used within LiveProvider");
  return ctx;
}
