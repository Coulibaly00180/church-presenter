import React, { useCallback, useState } from "react";
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
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlanItem } from "./PlanItem";
import { cn } from "@/lib/utils";
import { reorderPlanItems } from "@/lib/reorder";
import type { PlanItem as PlanItemType } from "@/lib/types";
import { isCpPlanItemKind } from "../../../../shared/planKinds";

type PlanEditorProps = {
  items: PlanItemType[];
  liveCursor: number;
  liveEnabled?: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onProject: (item: PlanItemType) => void;
  onProjectToScreen?: (item: PlanItemType, screen: "A" | "B" | "C") => void;
  onDuplicate: (item: PlanItemType) => void;
  onEdit: (item: PlanItemType) => void;
  onRemove: (item: PlanItemType) => void;
  onReorder: (orderedItemIds: string[], newItems: PlanItemType[]) => void;
  onAddItem?: () => void;
  onDropItem?: (data: { kind: CpPlanItemKind; title?: string; content?: string; refId?: string; refSubId?: string; mediaPath?: string }) => void;
};

export function PlanEditor({
  items,
  liveCursor,
  liveEnabled = false,
  selectedIndex,
  onSelect,
  onProject,
  onProjectToScreen,
  onDuplicate,
  onEdit,
  onRemove,
  onReorder,
  onAddItem,
  onDropItem,
}: PlanEditorProps) {
  const [dropHover, setDropHover] = useState(false);

  const handleNativeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const raw = e.dataTransfer.getData("application/cp-item");
    if (!raw || !onDropItem) return;
    try {
      const data = JSON.parse(raw) as {
        kind?: unknown;
        title?: string;
        content?: string;
        refId?: string;
        refSubId?: string;
        mediaPath?: string;
      };
      if (!isCpPlanItemKind(data.kind)) return;
      onDropItem({
        kind: data.kind,
        title: data.title,
        content: data.content,
        refId: data.refId,
        refSubId: data.refSubId,
        mediaPath: data.mediaPath,
      });
    } catch { /* ignore invalid data */ }
  }, [onDropItem]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/cp-item")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropHover(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setDropHover(false), []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (liveEnabled) return;
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
    [items, liveEnabled, onReorder],
  );

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-muted-foreground transition-colors",
          dropHover && "bg-primary/10 border-2 border-dashed border-primary rounded-lg",
        )}
        onDrop={handleNativeDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p className="text-sm">{dropHover ? "Deposez ici pour ajouter" : "Aucun element dans ce plan."}</p>
        <p className="text-xs mt-1 mb-3">Ajoutez des chants, versets ou annonces pour commencer.</p>
        {onAddItem && (
          <Button variant="outline" size="sm" className="text-xs" onClick={onAddItem}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter un element
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col flex-1 min-h-0", dropHover && "ring-2 ring-primary/50 ring-dashed rounded-lg")}
      onDrop={handleNativeDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="px-1 pb-1">
        <div className={cn("rounded-md border px-2 py-1.5 text-[11px]", liveEnabled ? "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-muted bg-muted/30 text-muted-foreground")}>
          {liveEnabled
            ? "Live actif: la reorganisation est temporairement verrouillee pour garder le curseur stable."
            : "Astuce: double-clic ou bouton Projeter pour envoyer l'element en direct."}
        </div>
      </div>
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
                  onProjectToScreen={onProjectToScreen ? (screen) => onProjectToScreen(item, screen) : undefined}
                  onDuplicate={() => onDuplicate(item)}
                  onEdit={() => onEdit(item)}
                  onRemove={() => onRemove(item)}
                  dragDisabled={liveEnabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
      {onAddItem && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-1.5 text-xs border-dashed"
          onClick={onAddItem}
        >
          <Plus className="h-3 w-3 mr-1" /> Ajouter un element
        </Button>
      )}
    </div>
  );
}
