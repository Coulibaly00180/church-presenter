import { projectMediaToScreen, projectTextToScreen } from "../projection/target";
import { getPlanKindDefaultTitle, isPlanKindBible } from "./planKinds";
import { LiveState, PlanItem, ScreenKey } from "./types";

function formatBibleTitle(item: PlanItem): string {
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  const reference = (item.refId || "").trim();
  if (!reference) return getPlanKindDefaultTitle(item.kind);
  const translation = (item.refSubId || "").trim();
  return translation ? `${reference} (${translation})` : reference;
}

function inferProjectionTitle(item: PlanItem): string {
  if (isPlanKindBible(item.kind)) {
    return formatBibleTitle(item);
  }
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  return getPlanKindDefaultTitle(item.kind);
}

function formatForProjection(item: PlanItem) {
  return {
    title: inferProjectionTitle(item),
    body: (item.content ?? "").trim(),
  };
}

export async function projectPlanItemToTarget(target: ScreenKey, item: PlanItem, live: LiveState | null) {
  const { title, body } = formatForProjection(item);
  const lockedScreens = live?.lockedScreens;
  if (item.kind === "ANNOUNCEMENT_IMAGE" && item.mediaPath) {
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "IMAGE", lockedScreens });
    return;
  }
  if (item.kind === "ANNOUNCEMENT_PDF" && item.mediaPath) {
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "PDF", lockedScreens });
    return;
  }
  if (item.kind === "ANNOUNCEMENT_VIDEO" && item.mediaPath) {
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "VIDEO", lockedScreens });
    return;
  }
  if (item.kind === "TIMER") {
    await projectTextToScreen({ target, title: `TIMER:${title}`, body, lockedScreens });
    return;
  }
  const secondaryTexts = (() => {
    if (!item.secondaryContent) return undefined;
    try { return JSON.parse(item.secondaryContent) as Array<{ label: string; body: string }>; }
    catch { return undefined; }
  })();
  await projectTextToScreen({ target, title, body, secondaryTexts, lockedScreens });
}
