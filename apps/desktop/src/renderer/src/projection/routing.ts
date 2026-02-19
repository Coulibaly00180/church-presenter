type LockedScreens = Partial<Record<ScreenKey, boolean>> | undefined;

export function shouldSkipProjection(target: ScreenKey, lockedScreens: LockedScreens) {
  return !!lockedScreens?.[target];
}

export function resolveProjectionDestination(target: ScreenKey, meta?: CpScreenMeta) {
  if (target !== "A" && meta?.mirror?.kind === "MIRROR") {
    return meta.mirror.from;
  }
  return target;
}
