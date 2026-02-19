import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, MonitorSmartphone, Pencil, Play, Radio, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPlanKindBadgeVariant, getPlanKindDefaultTitle, getPlanKindLabel } from "@/lib/planKinds";
import type { PlanItem as PlanItemType } from "@/lib/types";

type PlanItemProps = {
  item: PlanItemType;
  isLiveCursor: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onProject: () => void;
  onProjectToScreen?: (screen: "A" | "B" | "C") => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onRemove: () => void;
  dragDisabled?: boolean;
};

export function PlanItem({
  item,
  isLiveCursor,
  isSelected,
  onSelect,
  onProject,
  onProjectToScreen,
  onDuplicate,
  onEdit,
  onRemove,
  dragDisabled = false,
}: PlanItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: dragDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const kindLabel = getPlanKindLabel(item.kind);
  const kindVariant = getPlanKindBadgeVariant(item.kind);
  const songOrphaned = item.kind === "SONG_BLOCK" && !item.songId && !item.refId;
  const displayTitle = songOrphaned ? "[Chant supprime]" : (item.title || getPlanKindDefaultTitle(item.kind));

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      onDoubleClick={onProject}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer",
        "hover:bg-accent/50",
        isDragging && "opacity-50 shadow-lg",
        isLiveCursor && "border-primary bg-primary/10",
        isSelected && !isLiveCursor && "border-ring bg-accent",
        !isLiveCursor && !isSelected && "border-transparent bg-card",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "p-1 text-muted-foreground",
          dragDisabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing hover:text-foreground"
        )}
        title={dragDisabled ? "Reorganisation desactivee pendant le live" : "Reorganiser"}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">
        {item.order}
      </span>

      <Badge variant={kindVariant} className="shrink-0 text-[10px]">
        {kindLabel}
      </Badge>
      {isLiveCursor && (
        <Badge variant="default" className="shrink-0 text-[9px] px-1.5 gap-1">
          <Radio className="h-2.5 w-2.5" />
          LIVE
        </Badge>
      )}

      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", songOrphaned && "text-destructive")}>
          {displayTitle}
        </div>
        {item.content && (
          <div className="text-xs text-muted-foreground truncate">
            {item.content.slice(0, 80)}{item.content.length > 80 ? "..." : ""}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm" className="h-7 px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); onProject(); }}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Projeter
            </Button>
          </TooltipTrigger>
          <TooltipContent>Projeter cet element sur la cible live</TooltipContent>
        </Tooltip>

        {onProjectToScreen && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-5" onClick={(e) => e.stopPropagation()}>
                <MonitorSmartphone className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onProjectToScreen("A"); }}>
                Ecran A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onProjectToScreen("B"); }}>
                Ecran B
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onProjectToScreen("C"); }}>
                Ecran C
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Dupliquer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Supprimer</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
