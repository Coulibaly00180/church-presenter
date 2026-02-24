import { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KindBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { projectPlanItemToTarget } from "@/lib/projection";

interface PlanItemCardProps {
  item: CpPlanItem;
  index: number;
  isCurrentLive?: boolean;
  onEdit?: (item: CpPlanItem) => void;
}

const KIND_CSS_VAR: Partial<Record<CpPlanItemKind, string>> = {
  SONG_BLOCK: "var(--kind-song)",
  BIBLE_VERSE: "var(--kind-bible)",
  BIBLE_PASSAGE: "var(--kind-bible)",
  VERSE_MANUAL: "var(--kind-bible)",
  ANNOUNCEMENT_TEXT: "var(--kind-announcement)",
  ANNOUNCEMENT_IMAGE: "var(--kind-media)",
  ANNOUNCEMENT_PDF: "var(--kind-media)",
  TIMER: "var(--kind-timer)",
};

export function PlanItemCard({ item, index, isCurrentLive = false, onEdit }: PlanItemCardProps) {
  const { live } = useLive();
  const { removeItem } = usePlan();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: KIND_CSS_VAR[item.kind as CpPlanItemKind] ?? "transparent",
    height: "var(--plan-item-height-compact)",
  };

  const displayTitle =
    item.title?.trim() || getPlanKindDefaultTitle(item.kind);

  const handleClick = useCallback(async () => {
    if (!live) return;
    await projectPlanItemToTarget(live.target, item as import("@/lib/types").PlanItem, live);
  }, [item, live]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeItem(item.id);
  }, [item.id, removeItem]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  }, [item, onEdit]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 px-3 rounded-md border border-border bg-bg-surface",
        "cursor-pointer select-none border-l-[3px]",
        "hover:bg-bg-elevated hover:shadow-sm transition-all duration-fast",
        isDragging && "opacity-50 shadow-lg z-10",
        isCurrentLive && "bg-bg-elevated ring-1 ring-primary/50",
      )}
      role="button"
      aria-label={`${displayTitle} — ${item.kind}`}
      aria-current={isCurrentLive ? "true" : undefined}
      tabIndex={0}
      onClick={() => void handleClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void handleClick();
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-6 w-5 text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing shrink-0 focus:outline-none"
        aria-label="Déplacer"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Position index */}
      <span className="text-xs text-text-muted tabular-nums w-5 text-center shrink-0">
        {index + 1}
      </span>

      {/* Kind badge */}
      <KindBadge kind={item.kind as CpPlanItemKind} className="shrink-0" />

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-text-primary truncate">
        {displayTitle}
      </span>

      {/* Content preview */}
      {item.content && (
        <span className="text-xs text-text-muted truncate max-w-[160px] hidden md:block">
          {item.content.slice(0, 60)}
        </span>
      )}

      {/* Actions (shown on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleEdit}
            aria-label="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => void handleRemove(e)}
          aria-label="Supprimer"
          className="hover:text-danger hover:bg-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Phantom card shown while dragging */
export function PlanItemCardGhost({ item }: { item: CpPlanItem }) {
  return (
    <div
      className="flex items-center gap-2 px-3 rounded-md border border-primary/30 bg-primary/5 border-l-[3px] opacity-60"
      style={{
        height: "var(--plan-item-height-compact)",
        borderLeftColor: KIND_CSS_VAR[item.kind as CpPlanItemKind] ?? "transparent",
      }}
    >
      <GripVertical className="h-4 w-4 text-text-muted" />
      <KindBadge kind={item.kind as CpPlanItemKind} />
      <span className="flex-1 text-sm font-medium text-text-primary truncate">
        {item.title?.trim() || getPlanKindDefaultTitle(item.kind)}
      </span>
    </div>
  );
}
