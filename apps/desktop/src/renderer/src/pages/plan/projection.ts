import { LiveState, PlanItem, ScreenKey, ScreenMeta } from "./types";

function formatForProjection(item: PlanItem) {
  return {
    title: item.title || item.kind,
    body: (item.content ?? "").trim(),
  };
}

async function projectTextToTarget(target: ScreenKey, title: string | undefined, body: string, live: LiveState | null) {
  if (live?.lockedScreens?.[target]) return;

  const screensApi = window.cp.screens;
  const list: ScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
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

async function projectMediaToTarget(
  target: ScreenKey,
  title: string | undefined,
  mediaPath: string,
  mediaType: "IMAGE" | "PDF",
  live: LiveState | null
) {
  if (live?.lockedScreens?.[target]) return;

  const screensApi = window.cp.screens;
  const list: ScreenMeta[] = screensApi ? await screensApi.list() : [];
  const meta = list.find((s) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const isMirrorOfA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest: ScreenKey = isMirrorOfA ? "A" : target;

  if (dest === "A" || !screensApi) {
    await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
    return;
  }

  const res: any = await screensApi.setContentMedia(dest, { title, mediaPath, mediaType });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentMedia({ title, mediaPath, mediaType });
  }
}

export async function projectPlanItemToTarget(target: ScreenKey, item: PlanItem, live: LiveState | null) {
  const { title, body } = formatForProjection(item);
  if (item.kind === "ANNOUNCEMENT_IMAGE" && item.mediaPath) {
    await projectMediaToTarget(target, title, item.mediaPath, "IMAGE", live);
    return;
  }
  if (item.kind === "ANNOUNCEMENT_PDF" && item.mediaPath) {
    await projectMediaToTarget(target, title, item.mediaPath, "PDF", live);
    return;
  }
  await projectTextToTarget(target, title, body, live);
}
