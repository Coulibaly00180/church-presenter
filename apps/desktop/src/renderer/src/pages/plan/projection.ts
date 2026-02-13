import { projectMediaToScreen, projectTextToScreen } from "../../projection/target";
import { LiveState, PlanItem, ScreenKey } from "./types";

function formatForProjection(item: PlanItem) {
  return {
    title: item.title || item.kind,
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
  await projectTextToScreen({ target, title, body, lockedScreens });
}
