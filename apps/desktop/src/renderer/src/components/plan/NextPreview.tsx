import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import type { PlanItem as PlanItemType } from "@/lib/types";

const KIND_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  SONG_BLOCK: { label: "Chant", variant: "default" },
  BIBLE_VERSE: { label: "Verset", variant: "secondary" },
  BIBLE_PASSAGE: { label: "Passage", variant: "secondary" },
  ANNOUNCEMENT_TEXT: { label: "Annonce", variant: "outline" },
  ANNOUNCEMENT_IMAGE: { label: "Image", variant: "outline" },
  ANNOUNCEMENT_PDF: { label: "PDF", variant: "outline" },
  VERSE_MANUAL: { label: "Verset", variant: "secondary" },
};

function PreviewCard({ item, label, icon, accent }: {
  item: PlanItemType | null;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
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

  const kind = KIND_CONFIG[item.kind] ?? { label: item.kind, variant: "outline" as const };
  const displayTitle = item.title || item.kind;
  const isMedia = item.kind === "ANNOUNCEMENT_IMAGE" || item.kind === "ANNOUNCEMENT_PDF";

  return (
    <div className={`flex-1 min-w-0 px-2 py-1.5 rounded-md border ${accent ? "border-primary/40 bg-primary/10" : "border-border/40 bg-muted/20"}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant={kind.variant} className="shrink-0 text-[9px] px-1 py-0">
          {kind.label}
        </Badge>
        <span className={`text-xs truncate ${accent ? "font-semibold" : "font-medium"}`}>{displayTitle}</span>
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

type NextPreviewProps = {
  prevItem: PlanItemType | null;
  currentItem: PlanItemType | null;
  nextItem: PlanItemType | null;
};

export function NextPreview({ prevItem, currentItem, nextItem }: NextPreviewProps) {
  return (
    <div className="flex gap-1.5 shrink-0">
      <PreviewCard
        item={prevItem}
        label="Precedent"
        icon={<ChevronLeft className="h-2.5 w-2.5" />}
      />
      <PreviewCard
        item={currentItem}
        label="Present"
        icon={<Radio className="h-2.5 w-2.5" />}
        accent
      />
      <PreviewCard
        item={nextItem}
        label="Suivant"
        icon={<ChevronRight className="h-2.5 w-2.5" />}
      />
    </div>
  );
}
