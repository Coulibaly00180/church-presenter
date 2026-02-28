import { resolveProjectionDestination, shouldSkipProjection } from "./routing";

type ProjectionTargetOptions = {
  target: ScreenKey;
  lockedScreens?: Partial<Record<ScreenKey, boolean>>;
};

type TextProjectionPayload = ProjectionTargetOptions & {
  title?: string;
  body: string;
  metaSong?: CpSongMeta;
  secondaryTexts?: Array<{ label: string; body: string }>;
  backgroundOverride?: CpItemBackground;
};

type MediaProjectionPayload = ProjectionTargetOptions & {
  title?: string;
  mediaPath: string;
  mediaType: CpMediaType;
};

type ResolvedProjectionTarget = {
  skip: boolean;
  destination: ScreenKey;
  screensApi: Window["cp"]["screens"] | null;
};

async function resolveProjectionTarget(options: ProjectionTargetOptions): Promise<ResolvedProjectionTarget> {
  const { target, lockedScreens } = options;
  if (shouldSkipProjection(target, lockedScreens)) {
    return { skip: true, destination: target, screensApi: window.cp.screens ?? null };
  }

  const screensApi = window.cp.screens ?? null;
  const list: CpScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow?.open?.();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const destination = resolveProjectionDestination(target, meta);
  return { skip: false, destination, screensApi };
}

export async function projectTextToScreen(payload: TextProjectionPayload) {
  const { title, body, metaSong, secondaryTexts, backgroundOverride, target, lockedScreens } = payload;
  const route = await resolveProjectionTarget({ target, lockedScreens });
  if (route.skip) return;

  if (route.destination === "A" || !route.screensApi) {
    await window.cp.projection.setContentText({ title, body, metaSong, secondaryTexts, backgroundOverride });
    return;
  }

  const res = await route.screensApi.setContentText(route.destination, { title, body, metaSong, secondaryTexts, backgroundOverride });
  if (!res.ok && res.reason === "MIRROR") {
    const list = await route.screensApi.list();
    const meta = list.find((screen) => screen.key === target);
    const fallback = resolveProjectionDestination(target, meta);
    if (fallback === "A") {
      await window.cp.projection.setContentText({ title, body, metaSong, secondaryTexts, backgroundOverride });
      return;
    }
    await route.screensApi.setContentText(fallback, { title, body, metaSong, secondaryTexts, backgroundOverride });
  }
}

export async function projectMediaToScreen(payload: MediaProjectionPayload) {
  const { title, mediaPath, mediaType, target, lockedScreens } = payload;
  const route = await resolveProjectionTarget({ target, lockedScreens });
  if (route.skip) return;

  if (route.destination === "A" || !route.screensApi) {
    await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
    return;
  }

  const res = await route.screensApi.setContentMedia(route.destination, { title, mediaPath, mediaType });
  if (!res.ok && res.reason === "MIRROR") {
    const list = await route.screensApi.list();
    const meta = list.find((screen) => screen.key === target);
    const fallback = resolveProjectionDestination(target, meta);
    if (fallback === "A") {
      await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
      return;
    }
    await route.screensApi.setContentMedia(fallback, { title, mediaPath, mediaType });
  }
}
