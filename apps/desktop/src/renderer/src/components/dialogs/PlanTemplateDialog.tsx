import { useCallback, useEffect, useState } from "react";
import { BookOpen, LayoutList, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KindBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type PlanTemplate,
  getTemplates,
  deleteTemplate,
  saveAsTemplate,
  isBuiltinTemplate,
} from "@/lib/templates";
import { usePlan } from "@/hooks/usePlan";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

interface PlanTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlanTemplateDialog({ open, onClose }: PlanTemplateDialogProps) {
  const { plan, selectedPlanId, refreshPlan } = usePlan();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selected, setSelected] = useState<PlanTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    void getTemplates().then(setTemplates);
  }, [open]);

  const handleApply = useCallback(async () => {
    if (!selected || !selectedPlanId) return;
    setApplying(true);
    try {
      for (const item of selected.items) {
        await window.cp.plans.addItem({
          planId: selectedPlanId,
          kind: item.kind,
          title: item.title ?? undefined,
          content: item.content ?? undefined,
          refId: item.refId ?? undefined,
          refSubId: item.refSubId ?? undefined,
          mediaPath: item.mediaPath ?? undefined,
        });
      }
      await refreshPlan();
      toast.success(`Modèle "${selected.name}" appliqué — ${selected.items.length} élément(s) ajouté(s)`);
      onClose();
    } finally {
      setApplying(false);
    }
  }, [selected, selectedPlanId, refreshPlan, onClose]);

  const handleSaveCurrent = useCallback(async () => {
    if (!plan || plan.items.length === 0) {
      toast.error("Le plan est vide — ajoutez des éléments avant de sauvegarder comme modèle");
      return;
    }
    const name = window.prompt("Nom du modèle :", plan.title ?? "Mon modèle");
    if (!name?.trim()) return;
    setSaving(true);
    try {
      await saveAsTemplate(name.trim(), plan.items.map((item) => ({
        kind: item.kind,
        title: item.title ?? null,
        content: item.content ?? null,
        refId: item.refId ?? null,
        refSubId: item.refSubId ?? null,
        mediaPath: item.mediaPath ?? null,
      })));
      const updated = await getTemplates();
      setTemplates(updated);
      toast.success(`Modèle "${name.trim()}" sauvegardé`);
    } finally {
      setSaving(false);
    }
  }, [plan]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    await deleteTemplate(id);
    const updated = await getTemplates();
    setTemplates(updated);
    if (selected?.id === id) setSelected(null);
    setConfirmDelete(null);
    toast.success(`Modèle "${name}" supprimé`);
  }, [selected]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] flex flex-col max-h-[80vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Modèles de plans</DialogTitle>
          <DialogDescription>
            Choisissez un modèle pour pré-remplir votre plan de service.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 space-y-2 py-1">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className={cn(
                "w-full text-left rounded-lg border p-3 space-y-2 transition-colors",
                selected?.id === tpl.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-bg-elevated",
              )}
              onClick={() => setSelected(tpl.id === selected?.id ? null : tpl)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isBuiltinTemplate(tpl) ? (
                    <Star className="h-3.5 w-3.5 text-accent shrink-0" />
                  ) : (
                    <LayoutList className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{tpl.name}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {tpl.items.length} élément{tpl.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {!isBuiltinTemplate(tpl) && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${tpl.name}`}
                      className="text-text-muted hover:text-danger transition-colors shrink-0 p-0.5"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tpl.id, name: tpl.name }); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
              </div>

              {/* Items preview */}
              <div className="flex flex-wrap gap-1">
                {tpl.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <KindBadge kind={item.kind} />
                    {item.title && (
                      <span className="text-xs text-text-muted">{item.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleSaveCurrent()}
            disabled={saving || !plan || plan.items.length === 0}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {saving ? "Sauvegarde…" : "Sauvegarder ce plan comme modèle"}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void handleApply()}
              disabled={!selected || applying || !selectedPlanId}
            >
              <Plus className="h-3.5 w-3.5" />
              {applying ? "Application…" : "Appliquer"}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDelete !== null}
          title="Supprimer le modèle"
          description={confirmDelete ? `Supprimer le modèle "${confirmDelete.name}" ?` : ""}
          confirmLabel="Supprimer"
          confirmVariant="destructive"
          onConfirm={() => confirmDelete && void handleDelete(confirmDelete.id, confirmDelete.name)}
          onCancel={() => setConfirmDelete(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
