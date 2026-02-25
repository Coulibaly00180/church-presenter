import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/hooks/usePlan";

interface EditItemDialogProps {
  item: CpPlanItem | null;
  open: boolean;
  onClose: () => void;
}

function parseMMSS(str: string): { minutes: number; seconds: number } {
  const parts = str.split(":");
  return {
    minutes: parseInt(parts[0] ?? "0", 10) || 0,
    seconds: parseInt(parts[1] ?? "0", 10) || 0,
  };
}

function formatMMSS(m: number, s: number): string {
  return `${String(Math.max(0, m)).padStart(2, "0")}:${String(Math.min(59, Math.max(0, s))).padStart(2, "0")}`;
}

export function EditItemDialog({ item, open, onClose }: EditItemDialogProps) {
  const { updateItem } = usePlan();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  const isTimer = item?.kind === "TIMER";
  const hasContent = item?.kind === "ANNOUNCEMENT_TEXT" || item?.kind === "VERSE_MANUAL";

  useEffect(() => {
    if (!item || !open) return;
    setTitle(item.title ?? "");
    if (isTimer && item.content) {
      const { minutes: m, seconds: s } = parseMMSS(item.content);
      setMinutes(m);
      setSeconds(s);
    } else {
      setContent(item.content ?? "");
    }
  }, [item, open, isTimer]);

  const handleSave = useCallback(async () => {
    if (!item) return;
    setSaving(true);
    try {
      const newContent = isTimer
        ? formatMMSS(minutes, seconds)
        : hasContent
        ? content.trim()
        : undefined;
      await updateItem(item.id, {
        title: title.trim() || undefined,
        ...(newContent !== undefined && { content: newContent }),
      });
      toast.success("Élément mis à jour");
      onClose();
    } finally {
      setSaving(false);
    }
  }, [item, isTimer, hasContent, minutes, seconds, content, title, updateItem, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !hasContent) void handleSave();
  }, [handleSave, hasContent]);

  if (!item) return null;

  const dialogTitle =
    isTimer ? "Modifier la minuterie" :
    hasContent ? "Modifier le contenu" :
    "Modifier l'élément";

  const totalSeconds = minutes * 60 + seconds;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Titre de l'élément"
            />
          </div>

          {/* TIMER: duration picker */}
          {isTimer && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Durée</label>

              {/* Quick presets */}
              <div className="flex gap-1.5 flex-wrap">
                {[1, 5, 10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="px-2.5 py-1 rounded text-xs font-medium border border-border hover:bg-bg-elevated transition-colors"
                    onClick={() => { setMinutes(m); setSeconds(0); }}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              {/* Manual inputs */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text-muted">Minutes</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                  />
                </div>
                <span className="text-lg font-bold text-text-secondary mt-4">:</span>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text-muted">Secondes</label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="text-center"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center justify-center py-2 rounded-md bg-bg-elevated">
                <span className="text-2xl font-bold tabular-nums text-text-primary">
                  {formatMMSS(minutes, seconds)}
                </span>
              </div>
            </div>
          )}

          {/* Text / verse: content textarea */}
          {hasContent && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Contenu</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Contenu…"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || (isTimer && totalSeconds <= 0)}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
