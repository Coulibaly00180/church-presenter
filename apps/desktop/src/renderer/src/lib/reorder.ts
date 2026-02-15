import type { PlanItem } from "./types";

type ReorderPlanItemsArgs = {
  items: PlanItem[];
  visibleItems: PlanItem[];
  filterSongsOnly: boolean;
  activeId: string;
  overId: string;
};

type ReorderPlanItemsResult = {
  orderedItemIds: string[];
  newItems: PlanItem[];
};

function moveArray<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [moved] = copy.splice(from, 1);
  if (moved === undefined) return copy;
  copy.splice(to, 0, moved);
  return copy;
}

export function reorderPlanItems(args: ReorderPlanItemsArgs): ReorderPlanItemsResult | null {
  const { items, visibleItems, filterSongsOnly, activeId, overId } = args;
  let orderedItemIds: string[] = [];

  if (filterSongsOnly) {
    const visibleIds = visibleItems.map((item) => item.id);
    const oldVisibleIndex = visibleIds.indexOf(activeId);
    const newVisibleIndex = visibleIds.indexOf(overId);
    if (oldVisibleIndex < 0 || newVisibleIndex < 0) return null;

    const reorderedVisibleIds = moveArray(visibleIds, oldVisibleIndex, newVisibleIndex);
    const visibleSet = new Set(visibleIds);
    let cursor = 0;

    orderedItemIds = items.map((item) => {
      if (!visibleSet.has(item.id)) return item.id;
      const nextId = reorderedVisibleIds[cursor];
      cursor += 1;
      return nextId;
    });
  } else {
    const currentIds = items.map((item) => item.id);
    const oldIndex = currentIds.indexOf(activeId);
    const newIndex = currentIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return null;
    orderedItemIds = moveArray(currentIds, oldIndex, newIndex);
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const newItems = orderedItemIds.reduce<PlanItem[]>((acc, id, idx) => {
    const item = byId.get(id);
    if (item) acc.push({ ...item, order: idx + 1 });
    return acc;
  }, []);

  if (newItems.length !== items.length) return null;
  return { orderedItemIds, newItems };
}
