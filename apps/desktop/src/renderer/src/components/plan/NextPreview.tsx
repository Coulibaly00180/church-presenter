import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { getPlanKindBadgeVariant, getPlanKindDefaultTitle, getPlanKindLabel, isPlanKindMedia } from "@/lib/planKinds";
import type { PlanItem as PlanItemType } from "@/lib/types";

function SideCard({ item, label, icon }: {
  item: PlanItemType | null;
  label: string;
  icon: React.ReactNode;
}) {
  if (!item) {
    return (
      <div className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-dashed border-muted-foreground/20 bg-muted/20">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">—</p>
      </div>
    );
  }

  const kindLabel = getPlanKindLabel(item.kind);
  const kindVariant = getPlanKindBadgeVariant(item.kind);
  const displayTitle = item.title || getPlanKindDefaultTitle(item.kind);
  const isMedia = isPlanKindMedia(item.kind);

  return (
    <div className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-border/40 bg-muted/20">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant={kindVariant} className="shrink-0 text-[9px] px-1 py-0">
          {kindLabel}
        </Badge>
        <span className="text-xs truncate font-medium">{displayTitle}</span>
      </div>
      {item.content && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {item.content.slice(0, 80)}
        </p>
      )}
      {isMedia && item.mediaPath && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate italic">
          {item.mediaPath.split(/[\\/]/).pop()}
        </p>
      )}
    </div>
  );
}

function LivePreviewCard({ item }: { item: PlanItemType | null }) {
  if (!item) {
    return (
      <div className="flex-[2] min-w-0 rounded-md border border-primary/40 bg-black/90 flex items-center justify-center aspect-video max-h-[120px]">
        <p className="text-[10px] text-white/40">Aucune projection</p>
      </div>
    );
  }

  const kindLabel = getPlanKindLabel(item.kind);
  const kindVariant = getPlanKindBadgeVariant(item.kind);
  const displayTitle = item.title || getPlanKindDefaultTitle(item.kind);
  const isMedia = isPlanKindMedia(item.kind);

  return (
    <div className="flex-[2] min-w-0 rounded-md border-2 border-primary/50 bg-black/90 overflow-hidden relative aspect-video max-h-[120px]">
      {/* Mini projection view */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
        {isMedia && item.mediaPath ? (
          <>
            <p className="text-[10px] text-white/80 font-medium truncate w-full">{displayTitle}</p>
            <p className="text-[9px] text-white/50 italic mt-0.5 truncate w-full">{item.mediaPath.split(/[\\/]/).pop()}</p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-white font-semibold truncate w-full leading-tight">{displayTitle}</p>
            {item.content && (
              <p className="text-[10px] text-white/80 mt-1 line-clamp-3 w-full leading-snug whitespace-pre-line">
                {item.content.slice(0, 200)}
              </p>
            )}
          </>
        )}
      </div>
      {/* Kind badge */}
      <div className="absolute top-1 left-1.5">
        <Badge variant={kindVariant} className="text-[8px] px-1 py-0 opacity-70">
          {kindLabel}
        </Badge>
      </div>
      {/* LIVE indicator */}
      <div className="absolute top-1 right-1.5 flex items-center gap-0.5">
        <Radio className="h-2 w-2 text-red-500" />
        <span className="text-[8px] text-red-400 font-bold">LIVE</span>
      </div>
    </div>
  );
}

type NextPreviewProps = {
  prevItem: PlanItemType | null;
  currentItem: PlanItemType | null;
  nextItem: PlanItemType | null;
};

export function NextPreview({ prevItem, currentItem, nextItem }: NextPreviewProps) {
  return (
    <div className="flex gap-1.5 items-stretch shrink-0">
      <SideCard
        item={prevItem}
        label="Precedent"
        icon={<ChevronLeft className="h-2.5 w-2.5" />}
      />
      <LivePreviewCard item={currentItem} />
      <SideCard
        item={nextItem}
        label="Suivant"
        icon={<ChevronRight className="h-2.5 w-2.5" />}
      />
    </div>
  );
}
