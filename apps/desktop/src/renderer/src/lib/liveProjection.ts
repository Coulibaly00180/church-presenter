export function shouldResetForFreeProjection(live: CpLiveState | null): live is CpLiveState {
  return Boolean(live?.enabled && (live.planId !== null || live.black || live.white));
}

export async function ensureReadyForFreeProjection(live: CpLiveState | null): Promise<CpLiveState | null> {
  if (!live?.enabled) return live;
  if (!shouldResetForFreeProjection(live)) return live;

  const payload: CpLiveSetPayload = {
    enabled: true,
    black: false,
    white: false,
  };

  if (live.planId !== null) {
    payload.planId = null;
    payload.cursor = 0;
  }

  return window.cp.live.set(payload);
}
