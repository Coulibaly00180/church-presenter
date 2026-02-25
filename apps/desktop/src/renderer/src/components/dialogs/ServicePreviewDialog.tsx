import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KindBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { Clock, MessageSquare } from "lucide-react";

interface ServicePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  plan: CpPlan;
}

// ─── Duration estimation ───────────────────────────────────────────────────────

function estimateDurationSeconds(item: CpPlanItem): number {
  if (item.kind === "TIMER" && item.content) {
    const parts = item.content.split(":");
    const m = parseInt(parts[0] ?? "0", 10) || 0;
    const s = parseInt(parts[1] ?? "0", 10) || 0;
    return m * 60 + s;
  }
  switch (item.kind as CpPlanItemKind) {
    case "SONG_BLOCK":           return 3 * 60;
    case "BIBLE_VERSE":
    case "BIBLE_PASSAGE":
    case "VERSE_MANUAL":         return 2 * 60;
    case "ANNOUNCEMENT_TEXT":    return 60;
    case "ANNOUNCEMENT_IMAGE":
    case "ANNOUNCEMENT_PDF":     return 2 * 60;
    default:                     return 2 * 60;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m${s < 10 ? "0" : ""}${s}` : `${m} min`;
}

function formatTotal(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${String(m).padStart(2, "0")}` : "00"}`;
  return `${m} min`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServicePreviewDialog({ open, onClose, plan }: ServicePreviewDialogProps) {
  const items = plan.items;

  // Accumulate durations for running start times
  const starts: number[] = [];
  let cursor = 0;
  for (const item of items) {
    starts.push(cursor);
    cursor += estimateDurationSeconds(item);
  }
  const totalSeconds = cursor;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-muted" />
            Aperçu du service
            <span className="ml-auto text-sm font-normal text-text-muted">
              Durée estimée : {formatTotal(totalSeconds)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex flex-col divide-y divide-border">
            {items.map((item, index) => {
              const duration = estimateDurationSeconds(item);
              const startMin = Math.floor((starts[index] ?? 0) / 60);
              const startSec = (starts[index] ?? 0) % 60;
              const startLabel = `+${startMin}:${String(startSec).padStart(2, "0")}`;
              const displayTitle = item.title?.trim() || getPlanKindDefaultTitle(item.kind);
              const isTimer = item.kind === "TIMER";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  {/* Start time */}
                  <span className="text-xs tabular-nums text-text-muted w-10 shrink-0 text-right">
                    {startLabel}
                  </span>

                  {/* Kind badge */}
                  <KindBadge kind={item.kind as CpPlanItemKind} className="shrink-0" />

                  {/* Title + notes */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate leading-snug",
                      isTimer && "font-mono text-warning"
                    )}>
                      {displayTitle}
                    </p>
                    {item.notes && (
                      <p className="flex items-center gap-1 text-xs text-text-muted truncate mt-0.5">
                        <MessageSquare className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <span className={cn(
                    "text-xs tabular-nums shrink-0",
                    isTimer ? "text-warning font-semibold" : "text-text-muted"
                  )}>
                    {formatDuration(duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer: total */}
        <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          <span className="text-xs text-text-muted">
            {items.length} élément{items.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Clock className="h-3.5 w-3.5 text-text-muted" />
            {formatTotal(totalSeconds)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
