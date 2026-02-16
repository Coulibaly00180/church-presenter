import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { getTemplates, deleteTemplate, type PlanTemplate } from "@/lib/templates";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (template: PlanTemplate) => void;
  onSkip: () => void;
};

export function TemplatePickerDialog({ open, onOpenChange, onSelect, onSkip }: Props) {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);

  useEffect(() => {
    if (open) setTemplates(getTemplates());
  }, [open]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteTemplate(id);
    setTemplates(getTemplates());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choisir un template</DialogTitle>
          <DialogDescription>Creer un plan a partir d'un template ou commencer avec un plan vide.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onSelect(t); onOpenChange(false); }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-xs text-left"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-medium truncate">{t.name}</span>
                <span className="text-muted-foreground shrink-0">({t.items.length} el.)</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                onClick={(e) => handleDelete(e, t.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </button>
          ))}
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun template sauvegarde.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { onSkip(); onOpenChange(false); }}>
          Plan vide
        </Button>
      </DialogContent>
    </Dialog>
  );
}
