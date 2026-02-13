type LockedScreens = Partial<Record<ScreenKey, boolean>> | undefined;

export function shouldSkipProjection(target: ScreenKey, lockedScreens: LockedScreens) {
  return !!lockedScreens?.[target];
}

export function resolveProjectionDestination(target: ScreenKey, meta?: CpScreenMeta) {
  const isMirrorOfA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  return isMirrorOfA ? ("A" as ScreenKey) : target;
}
