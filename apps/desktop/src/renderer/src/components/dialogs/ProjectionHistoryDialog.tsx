import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type ProjectionLogEntry = {
  timestamp: number;
  title: string;
  kind: string;
  content?: string;
};

const KIND_LABELS: Record<string, string> = {
  SONG_BLOCK: "Chant",
  BIBLE_VERSE: "Verset",
  BIBLE_PASSAGE: "Passage",
  ANNOUNCEMENT_TEXT: "Annonce",
  ANNOUNCEMENT_IMAGE: "Image",
  ANNOUNCEMENT_PDF: "PDF",
  VERSE_MANUAL: "Verset",
  TIMER: "Timer",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ProjectionLogEntry[];
  onClear: () => void;
};

export function ProjectionHistoryDialog({ open, onOpenChange, entries, onClear }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Historique des projections</span>
            {entries.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onClear}>
                <Trash2 className="h-3 w-3 mr-1" /> Effacer
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune projection enregistree pour cette session.</p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-1">
              {[...entries].reverse().map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-md border text-xs">
                  <span className="font-mono text-muted-foreground shrink-0">{formatTime(entry.timestamp)}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                    {KIND_LABELS[entry.kind] ?? entry.kind}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{entry.title}</span>
                    {entry.content && (
                      <span className="text-muted-foreground truncate block">{entry.content.slice(0, 60)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
