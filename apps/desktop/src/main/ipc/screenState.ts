import type {
  CpLiveState,
  CpProjectionMode,
  CpProjectionState,
  CpProjectionSetTextPayload,
  CpProjectionSetMediaPayload,
  CpProjectionSetAppearancePayload,
  ScreenKey,
  ScreenMirrorMode,
} from "../../shared/ipc";

// ---------------------------------------------------------------------------
// Context – injected by main.ts so logic stays pure & testable
// ---------------------------------------------------------------------------

export type ScreenContext = {
  screenStates: Record<ScreenKey, CpProjectionState>;
  mirrors: Record<ScreenKey, ScreenMirrorMode>;
  liveState: CpLiveState;
  /** Notify regie + projection window for a given screen */
  broadcast: (key: ScreenKey) => void;
  /** Broadcast live state to all windows */
  broadcastLive: () => void;
};

// ---------------------------------------------------------------------------
// Default factories (useful for tests & main.ts init)
// ---------------------------------------------------------------------------

export function createDefaultProjectionState(): CpProjectionState {
  return {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    textFont: "system-ui",
    textFontPath: "",
    background: "#050505",
    backgroundMode: "SOLID",
    backgroundGradientFrom: "#2563eb",
    backgroundGradientTo: "#7c3aed",
    backgroundGradientAngle: 135,
    backgroundImage: "",
    logoPath: "",
    logoPosition: "top-right",
    logoOpacity: 80,
    logoScale: 100,
    foregroundMode: "SOLID",
    foregroundGradientFrom: "#ffffff",
    foregroundGradientTo: "#93c5fd",
    foreground: "#ffffff",
    current: { kind: "EMPTY" },
    updatedAt: Date.now(),
  };
}

export function createDefaultLiveState(): CpLiveState {
  return {
    enabled: false,
    planId: null,
    cursor: 0,
    target: "A",
    black: false,
    white: false,
    lockedScreens: { A: false, B: false, C: false },
    updatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Mirror propagation
// ---------------------------------------------------------------------------

export function applyMirrorsFrom(ctx: ScreenContext, source: ScreenKey): void {
  (["A", "B", "C"] as ScreenKey[]).forEach((k) => {
    if (k === source) return;
    const m = ctx.mirrors[k];
    if (m.kind === "MIRROR" && m.from === source) {
      ctx.screenStates[k] = { ...ctx.screenStates[source], updatedAt: Date.now() };
      ctx.broadcast(k);
    }
  });
}

// ---------------------------------------------------------------------------
// Screen content mutations
// ---------------------------------------------------------------------------

export type ScreenMutationOk = { ok: true; state: CpProjectionState };
export type ScreenMutationErr = { ok: false; reason: "MIRROR" | "LOCKED"; state: CpProjectionState };
export type ScreenMutationResult = ScreenMutationOk | ScreenMutationErr;

function guardScreen(ctx: ScreenContext, key: ScreenKey): ScreenMutationErr | null {
  if (ctx.mirrors[key].kind === "MIRROR") return { ok: false, reason: "MIRROR", state: ctx.screenStates[key] };
  if (ctx.liveState.lockedScreens[key]) return { ok: false, reason: "LOCKED", state: ctx.screenStates[key] };
  return null;
}

export function setContentText(
  ctx: ScreenContext,
  key: ScreenKey,
  payload: CpProjectionSetTextPayload,
): ScreenMutationResult {
  const err = guardScreen(ctx, key);
  if (err) return err;

  ctx.screenStates[key] = {
    ...ctx.screenStates[key],
    mode: "NORMAL",
    current: { kind: "TEXT", title: payload.title, body: payload.body, metaSong: payload.metaSong, secondaryTexts: payload.secondaryTexts, backgroundOverride: payload.backgroundOverride },
    updatedAt: Date.now(),
  };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
  return { ok: true, state: ctx.screenStates[key] };
}

export function setContentMedia(
  ctx: ScreenContext,
  key: ScreenKey,
  payload: CpProjectionSetMediaPayload,
): ScreenMutationResult {
  const err = guardScreen(ctx, key);
  if (err) return err;

  ctx.screenStates[key] = {
    ...ctx.screenStates[key],
    mode: "NORMAL",
    current: { kind: "MEDIA", title: payload.title, mediaPath: payload.mediaPath, mediaType: payload.mediaType },
    updatedAt: Date.now(),
  };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
  return { ok: true, state: ctx.screenStates[key] };
}

export function setMode(
  ctx: ScreenContext,
  key: ScreenKey,
  mode: CpProjectionMode,
): ScreenMutationResult {
  const err = guardScreen(ctx, key);
  if (err) return err;

  ctx.screenStates[key] = { ...ctx.screenStates[key], mode, updatedAt: Date.now() };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
  return { ok: true, state: ctx.screenStates[key] };
}

export function setAppearance(
  ctx: ScreenContext,
  key: ScreenKey,
  patch: CpProjectionSetAppearancePayload,
): ScreenMutationResult {
  const err = guardScreen(ctx, key);
  if (err) return err;

  ctx.screenStates[key] = {
    ...ctx.screenStates[key],
    textScale: patch.textScale ?? ctx.screenStates[key].textScale ?? 1,
    titleTextScale: patch.titleTextScale !== undefined ? patch.titleTextScale : ctx.screenStates[key].titleTextScale,
    textFont: patch.textFont ?? ctx.screenStates[key].textFont ?? "system-ui",
    textFontPath: patch.textFontPath ?? ctx.screenStates[key].textFontPath ?? "",
    background: patch.background ?? ctx.screenStates[key].background ?? "#050505",
    backgroundMode: patch.backgroundMode ?? ctx.screenStates[key].backgroundMode ?? "SOLID",
    backgroundGradientFrom: patch.backgroundGradientFrom ?? ctx.screenStates[key].backgroundGradientFrom ?? "#2563eb",
    backgroundGradientTo: patch.backgroundGradientTo ?? ctx.screenStates[key].backgroundGradientTo ?? "#7c3aed",
    backgroundGradientAngle: patch.backgroundGradientAngle ?? ctx.screenStates[key].backgroundGradientAngle ?? 135,
    backgroundImage: patch.backgroundImage ?? ctx.screenStates[key].backgroundImage ?? "",
    logoPath: patch.logoPath ?? ctx.screenStates[key].logoPath ?? "",
    logoPosition: patch.logoPosition ?? ctx.screenStates[key].logoPosition ?? "top-right",
    logoOpacity: patch.logoOpacity ?? ctx.screenStates[key].logoOpacity ?? 80,
    logoScale: patch.logoScale !== undefined ? patch.logoScale : (ctx.screenStates[key].logoScale ?? 100),
    foregroundMode: patch.foregroundMode ?? ctx.screenStates[key].foregroundMode ?? "SOLID",
    foregroundGradientFrom: patch.foregroundGradientFrom ?? ctx.screenStates[key].foregroundGradientFrom ?? "#ffffff",
    foregroundGradientTo: patch.foregroundGradientTo ?? ctx.screenStates[key].foregroundGradientTo ?? "#93c5fd",
    foreground: patch.foreground ?? ctx.screenStates[key].foreground ?? "#ffffff",
    updatedAt: Date.now(),
  };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
  return { ok: true, state: ctx.screenStates[key] };
}

export function setStatePatch(
  ctx: ScreenContext,
  key: ScreenKey,
  patch: Partial<CpProjectionState>,
): ScreenMutationResult {
  const err = guardScreen(ctx, key);
  if (err) return err;

  ctx.screenStates[key] = { ...ctx.screenStates[key], ...patch, updatedAt: Date.now() };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
  return { ok: true, state: ctx.screenStates[key] };
}

export function setMirror(
  ctx: ScreenContext,
  key: ScreenKey,
  mirror: ScreenMirrorMode,
): { ok: true; mirror: ScreenMirrorMode } {
  ctx.mirrors[key] = mirror;
  if (mirror.kind === "MIRROR") {
    ctx.screenStates[key] = { ...ctx.screenStates[mirror.from], updatedAt: Date.now() };
    ctx.broadcast(key);
  }
  return { ok: true, mirror };
}

// ---------------------------------------------------------------------------
// Live state
// ---------------------------------------------------------------------------

export function applyLiveProjectionMode(ctx: ScreenContext): void {
  const mode: CpProjectionMode = ctx.liveState.black ? "BLACK" : ctx.liveState.white ? "WHITE" : "NORMAL";
  const key = ctx.liveState.target;

  if (ctx.liveState.lockedScreens[key]) return;
  if (ctx.mirrors[key]?.kind === "MIRROR") return;

  ctx.screenStates[key] = { ...ctx.screenStates[key], mode, updatedAt: Date.now() };
  ctx.broadcast(key);
  applyMirrorsFrom(ctx, key);
}

export function mergeLive(ctx: ScreenContext, patch: Partial<CpLiveState>): CpLiveState {
  const next: CpLiveState = { ...ctx.liveState, ...patch, updatedAt: Date.now() };

  // mutual exclusion
  if (patch.black === true) next.white = false;
  if (patch.white === true) next.black = false;

  // clamp
  if (next.cursor < 0) next.cursor = 0;
  if (!next.target) next.target = "A";

  ctx.liveState = next;

  applyLiveProjectionMode(ctx);
  ctx.broadcastLive();
  return ctx.liveState;
}
