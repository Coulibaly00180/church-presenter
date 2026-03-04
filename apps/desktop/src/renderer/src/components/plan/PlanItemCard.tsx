import { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, FileImage, FileVideo, GripVertical, MessageSquare, Palette, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KindBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { projectPlanItemToTarget, parsePlanBackground } from "@/lib/projection";

interface PlanItemCardProps {
  item: CpPlanItem;
  index: number;
  isCurrentLive?: boolean;
  isSelected?: boolean;
  onEdit?: (item: CpPlanItem) => void;
  onEditBackground?: (item: CpPlanItem) => void;
  onToggleSelect?: (id: string) => void;
  onCopy?: (item: CpPlanItem) => void;
}

/** Returns a short subtitle describing the item content. */
function getItemSubtitle(item: CpPlanItem): string | null {
  const firstLine = (s: string | null | undefined): string | null =>
    s?.split("\n")[0]?.trim().slice(0, 80) || null;

  switch (item.kind as CpPlanItemKind) {
    case "SONG_BLOCK":
    case "BIBLE_VERSE":
    case "BIBLE_PASSAGE":
    case "VERSE_MANUAL":
    case "ANNOUNCEMENT_TEXT":
    case "TIMER":
      return firstLine(item.content);
    case "ANNOUNCEMENT_IMAGE":
    case "ANNOUNCEMENT_PDF":
      if (item.mediaPath) {
        const filename = item.mediaPath.split(/[\\/]/).pop() ?? null;
        if (filename && filename !== item.title?.trim()) return filename;
      }
      return null;
    default:
      return null;
  }
}

export function PlanItemCard({ item, index, isCurrentLive = false, isSelected = false, onEdit, onEditBackground, onToggleSelect, onCopy }: PlanItemCardProps) {
  const { live } = useLive();
  const { plan, removeItem } = usePlan();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const subtitle = getItemSubtitle(item);
  const displayTitle = item.title?.trim() || getPlanKindDefaultTitle(item.kind);

  const handleClick = useCallback(async () => {
    if (!live) return;
    await projectPlanItemToTarget(live.target, item as import("@/lib/types").PlanItem, live, parsePlanBackground(plan?.backgroundConfig));
  }, [item, live, plan]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeItem(item.id);
  }, [item.id, removeItem]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  }, [item, onEdit]);

  const handleEditBackground = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEditBackground?.(item);
  }, [item, onEditBackground]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy?.(item);
  }, [item, onCopy]);

  return (
    <div
      ref={setNodeRef}
      // dnd-kit transform MUST be inline — no CSS-only alternative
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-kind={item.kind}
      className={cn(
        "group relative flex items-center gap-2 px-2 rounded-md border border-border bg-bg-surface",
        "cursor-pointer select-none border-l-[3px] min-h-[56px]",
        "hover:bg-bg-elevated hover:shadow-sm transition-all duration-100",
        isDragging && "opacity-50 shadow-lg rotate-[0.5deg] z-10",
        isCurrentLive && "bg-primary/5 ring-1 ring-primary/40",
      )}
      tabIndex={0}
      aria-label={`${displayTitle} — ${item.kind}`}
      aria-current={isCurrentLive ? "true" : undefined}
      onClick={() => void handleClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void handleClick();
      }}
    >
      {/* Drag handle — hidden until hover; replaced by checkbox when onToggleSelect provided */}
      {onToggleSelect ? (
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded border shrink-0 transition-all focus:outline-none",
            "opacity-0 group-hover:opacity-100",
            isSelected
              ? "opacity-100 bg-primary border-primary text-white"
              : "border-border bg-transparent text-transparent hover:border-text-muted",
          )}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
          aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
          tabIndex={-1}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
      ) : (
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-6 w-4 text-text-muted opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 focus:outline-none transition-opacity"
          aria-label="Déplacer"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Position index */}
      <span className="text-[11px] text-text-muted tabular-nums w-4 text-right shrink-0">
        {index + 1}
      </span>

      {/* Kind badge */}
      <KindBadge kind={item.kind as CpPlanItemKind} className="shrink-0" />
      {item.backgroundConfig && (() => {
        const bg = parsePlanBackground(item.backgroundConfig);
        if (!bg) return null;
        if (bg.backgroundMediaType === "VIDEO") return <FileVideo className="h-3 w-3 shrink-0 text-text-muted" />;
        if (bg.backgroundMediaType === "IMAGE") return <FileImage className="h-3 w-3 shrink-0 text-text-muted" />;
        return <span className="w-2 h-2 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: bg.background ?? bg.backgroundGradientFrom ?? "#888" }} />;
      })()}

      {/* Title + subtitle + notes indicator */}
      <div className="flex flex-col flex-1 min-w-0 py-2">
        <span
          className={cn(
            "text-sm font-medium truncate leading-snug",
            isCurrentLive ? "text-primary" : "text-text-primary",
          )}
        >
          {displayTitle}
        </span>
        {subtitle && (
          <span className="text-xs text-text-muted truncate leading-snug mt-0.5 italic">
            {subtitle}
          </span>
        )}
        {item.notes && (
          <span className="flex items-center gap-1 text-xs text-text-muted truncate leading-snug mt-0.5">
            <MessageSquare className="h-2.5 w-2.5 shrink-0" aria-hidden />
            <span className="truncate">{item.notes}</span>
          </span>
        )}
      </div>

      {/* Live indicator dot */}
      {isCurrentLive && (
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse" aria-hidden />
      )}

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onEditBackground && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleEditBackground}
            aria-label="Fond du chant"
            className="h-6 w-6"
          >
            <Palette className="h-3 w-3" />
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleEdit}
            aria-label="Modifier"
            className="h-6 w-6"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        {onCopy && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label="Copier"
            className="h-6 w-6"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => void handleRemove(e)}
          aria-label="Supprimer"
          className="h-6 w-6 hover:text-danger hover:bg-danger/10"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/** Phantom card shown while dragging */
export function PlanItemCardGhost({ item }: { item: CpPlanItem }) {
  const subtitle = getItemSubtitle(item);
  return (
    <div
      data-kind={item.kind}
      className="flex items-center gap-2 px-2 rounded-md border border-primary/30 bg-primary/5 border-l-[3px] opacity-70 min-h-[56px] shadow-lg"
    >
      <GripVertical className="h-3.5 w-3.5 text-text-muted" />
      <KindBadge kind={item.kind as CpPlanItemKind} />
      <div className="flex flex-col flex-1 min-w-0 py-2">
        <span className="text-sm font-medium text-text-primary truncate leading-snug">
          {item.title?.trim() || getPlanKindDefaultTitle(item.kind)}
        </span>
        {subtitle && (
          <span className="text-xs text-text-muted truncate italic leading-snug mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
