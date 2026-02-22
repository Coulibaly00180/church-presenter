import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { PlanItem } from "@/lib/types";
import { CP_PLAN_ITEM_KIND_LABELS } from "@/lib/planKinds";

type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  item: PlanItem | null;
  onSaved: () => void;
};

export function EditItemDialog({ open, onOpenChange, planId, item, onSaved }: EditItemDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [timerMin, setTimerMin] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const [saving, setSaving] = useState(false);

  const isMedia = item?.kind === "ANNOUNCEMENT_IMAGE" || item?.kind === "ANNOUNCEMENT_PDF";
  const isTimer = item?.kind === "TIMER";
  const isSong = item?.kind === "SONG_BLOCK";

  useEffect(() => {
    if (item && open) {
      setTitle(item.title ?? "");
      setContent(item.content ?? "");
      if (item.kind === "TIMER") {
        const secs = parseInt(item.content ?? "0", 10) || 0;
        setTimerMin(Math.floor(secs / 60));
        setTimerSec(secs % 60);
      }
    }
  }, [item, open]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const contentToSave = isTimer ? String(timerMin * 60 + timerSec) : content;
      await window.cp.plans.updateItem({ planId, itemId: item.id, title, content: contentToSave });
      toast.success("Element modifie");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const kindLabel = CP_PLAN_ITEM_KIND_LABELS[item.kind] ?? item.kind;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifier l'element
            <Badge variant="outline" className="text-[10px] font-normal">{kindLabel}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title — toujours editable */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
            />
          </div>

          {/* Media: nom du fichier en lecture seule */}
          {isMedia && item.mediaPath && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fichier</Label>
              <p className="text-xs bg-muted rounded px-3 py-2 truncate">
                {item.mediaPath.split(/[\\/]/).pop()}
              </p>
            </div>
          )}

          {/* Timer: inputs mm:ss */}
          {isTimer && (
            <div className="space-y-2">
              <Label>Duree</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    className="h-8 text-xs w-16 text-center"
                    value={timerMin}
                    onChange={(e) => setTimerMin(Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    className="h-8 text-xs w-16 text-center"
                    value={timerSec}
                    onChange={(e) => setTimerSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  />
                  <span className="text-xs text-muted-foreground">sec</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground ml-auto">
                  {String(timerMin).padStart(2, "0")}:{String(timerSec).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}

          {/* Chant: contenu editable avec note */}
          {isSong && (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <Label htmlFor="edit-song-content">Contenu</Label>
                <span className="text-[10px] text-muted-foreground">
                  surcharge locale — n'affecte pas le chant original
                </span>
              </div>
              <textarea
                id="edit-song-content"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                placeholder="Paroles du bloc..."
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}

          {/* Texte / Bible: titre + contenu */}
          {!isMedia && !isTimer && !isSong && (
            <div className="space-y-2">
              <Label htmlFor="edit-content">Contenu</Label>
              <textarea
                id="edit-content"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                placeholder="Contenu"
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
