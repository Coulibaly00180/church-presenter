import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PlanItem } from "@/lib/types";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      setTitle(item.title ?? "");
      setContent(item.content ?? "");
    }
  }, [item, open]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await window.cp.plans.updateItem({ planId, itemId: item.id, title, content });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Modifier l'element</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
            />
          </div>
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
