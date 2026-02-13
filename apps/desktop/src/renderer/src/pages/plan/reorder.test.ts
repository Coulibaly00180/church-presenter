import { describe, expect, it } from "vitest";
import { reorderPlanItems } from "./reorder";
import type { PlanItem } from "./types";

function mkItem(id: string, order: number, kind: string): PlanItem {
  return { id, order, kind };
}

describe("reorderPlanItems", () => {
  it("reorders the full plan when filter is disabled", () => {
    const items: PlanItem[] = [
      mkItem("a", 1, "ANNOUNCEMENT_TEXT"),
      mkItem("b", 2, "SONG_BLOCK"),
      mkItem("c", 3, "BIBLE_VERSE"),
    ];

    const result = reorderPlanItems({
      items,
      visibleItems: items,
      filterSongsOnly: false,
      activeId: "c",
      overId: "a",
    });

    expect(result).not.toBeNull();
    expect(result?.orderedItemIds).toEqual(["c", "a", "b"]);
    expect(result?.newItems.map((item) => ({ id: item.id, order: item.order }))).toEqual([
      { id: "c", order: 1 },
      { id: "a", order: 2 },
      { id: "b", order: 3 },
    ]);
  });

  it("reorders only visible song rows when songs-only filter is enabled", () => {
    const items: PlanItem[] = [
      mkItem("ann-1", 1, "ANNOUNCEMENT_TEXT"),
      mkItem("song-1", 2, "SONG_BLOCK"),
      mkItem("verse-1", 3, "BIBLE_VERSE"),
      mkItem("song-2", 4, "SONG_BLOCK"),
      mkItem("ann-2", 5, "ANNOUNCEMENT_TEXT"),
    ];
    const visibleItems = items.filter((item) => item.kind === "SONG_BLOCK");

    const result = reorderPlanItems({
      items,
      visibleItems,
      filterSongsOnly: true,
      activeId: "song-2",
      overId: "song-1",
    });

    expect(result).not.toBeNull();
    expect(result?.orderedItemIds).toEqual(["ann-1", "song-2", "verse-1", "song-1", "ann-2"]);
    expect(result?.newItems.map((item) => item.id)).toEqual(["ann-1", "song-2", "verse-1", "song-1", "ann-2"]);
  });

  it("returns null when ids are invalid for the selected mode", () => {
    const items: PlanItem[] = [
      mkItem("song-1", 1, "SONG_BLOCK"),
      mkItem("song-2", 2, "SONG_BLOCK"),
    ];

    const invalidGlobal = reorderPlanItems({
      items,
      visibleItems: items,
      filterSongsOnly: false,
      activeId: "missing",
      overId: "song-1",
    });
    const invalidFiltered = reorderPlanItems({
      items,
      visibleItems: [items[0]],
      filterSongsOnly: true,
      activeId: "song-2",
      overId: "song-1",
    });

    expect(invalidGlobal).toBeNull();
    expect(invalidFiltered).toBeNull();
  });
});
