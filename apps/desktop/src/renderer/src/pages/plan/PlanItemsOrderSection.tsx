import React, { useMemo } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableRow } from "./SortableRow";
import { PlanItem } from "./types";

type PlanItemsOrderSectionProps = {
  items: PlanItem[];
  onDragEnd: (event: DragEndEvent) => void | Promise<void>;
  onProject: (item: PlanItem) => void | Promise<void>;
  onRemove: (item: PlanItem) => void | Promise<void>;
};

export function PlanItemsOrderSection(props: PlanItemsOrderSectionProps) {
  const { items, onDragEnd, onProject, onRemove } = props;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const orderedIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Ordre</div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it) => (
              <SortableRow key={it.id} item={it} onProject={() => onProject(it)} onRemove={() => onRemove(it)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}
