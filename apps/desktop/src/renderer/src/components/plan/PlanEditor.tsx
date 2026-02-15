import React, { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlanItem } from "./PlanItem";
import { reorderPlanItems } from "@/lib/reorder";
import type { PlanItem as PlanItemType } from "@/lib/types";

type PlanEditorProps = {
  planId: string;
  items: PlanItemType[];
  liveCursor: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onProject: (item: PlanItemType) => void;
  onRemove: (item: PlanItemType) => void;
  onReorder: (orderedItemIds: string[], newItems: PlanItemType[]) => void;
};

export function PlanEditor({
  planId,
  items,
  liveCursor,
  selectedIndex,
  onSelect,
  onProject,
  onRemove,
  onReorder,
}: PlanEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const result = reorderPlanItems({
        items,
        visibleItems: items,
        filterSongsOnly: false,
        activeId: String(active.id),
        overId: String(over.id),
      });

      if (result) {
        onReorder(result.orderedItemIds, result.newItems);
      }
    },
    [items, onReorder],
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">Aucun element dans ce plan.</p>
        <p className="text-xs mt-1">Utilisez le panneau de gauche pour ajouter des chants, versets ou annonces.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 p-1">
            {items.map((item, index) => (
              <PlanItem
                key={item.id}
                item={item}
                isLiveCursor={liveCursor === item.order}
                isSelected={selectedIndex === index}
                onSelect={() => onSelect(index)}
                onProject={() => onProject(item)}
                onRemove={() => onRemove(item)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
}
