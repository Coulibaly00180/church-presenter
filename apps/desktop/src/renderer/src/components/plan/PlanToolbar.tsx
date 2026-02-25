import { useCallback, useRef, useState } from "react";
import { Check, Download, FileInput, LayoutList, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlan } from "@/hooks/usePlan";
import { isoToYmd } from "@/lib/date";

interface PlanToolbarProps {
  onAddItem?: () => void;
  onPreview?: () => void;
}

export function PlanToolbar({ onAddItem, onPreview }: PlanToolbarProps) {
  const { plan, updatePlan, deletePlan, selectedPlanId } = usePlan();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = plan?.title ?? (plan?.date ? isoToYmd(plan.date) : "Plan");

  const startEditing = useCallback(() => {
    setTitleValue(displayTitle);
    setEditingTitle(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }, [displayTitle]);

  const commitTitle = useCallback(async () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== displayTitle) {
      await updatePlan(trimmed);
    }
  }, [titleValue, displayTitle, updatePlan]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") void commitTitle();
    if (e.key === "Escape") setEditingTitle(false);
  }, [commitTitle]);

  const handleExport = useCallback(async () => {
    if (!selectedPlanId) return;
    const result = await window.cp.plans.export({ planId: selectedPlanId });
    if (result.ok) {
      toast.success("Plan exporté", { description: result.path });
    } else if (!result.canceled) {
      toast.error("Export échoué");
    }
  }, [selectedPlanId]);

  const handleImport = useCallback(async () => {
    if (!selectedPlanId) return;
    const result = await window.cp.plans.importFromFile(selectedPlanId);
    if (result.ok) {
      toast.success(`${result.added} élément(s) importé(s)`);
    } else if ("error" in result) {
      toast.error("Import échoué", { description: result.error });
    }
  }, [selectedPlanId]);

  const handleDelete = useCallback(async () => {
    if (!selectedPlanId) return;
    if (!window.confirm(`Supprimer "${displayTitle}" ?`)) return;
    await deletePlan(selectedPlanId);
    toast.success("Plan supprimé");
  }, [selectedPlanId, displayTitle, deletePlan]);

  if (!plan) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-surface">
      {/* Plan title — inline edit */}
      <div className="flex items-center gap-2 min-w-0">
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={handleKeyDown}
              className="text-sm font-medium text-text-primary bg-transparent border-b border-primary outline-none px-0.5 min-w-[120px] max-w-[240px]"
              aria-label="Titre du plan"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void commitTitle()}
              aria-label="Valider"
            >
              <Check className="h-3.5 w-3.5 text-success" />
            </Button>
          </div>
        ) : (
          <button
            className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate max-w-[240px]"
            onClick={startEditing}
            aria-label="Renommer le plan"
          >
            {displayTitle}
          </button>
        )}

        <span className="text-xs text-text-muted shrink-0">
          {plan.items.length} élément{plan.items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {onAddItem && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddItem}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Plus d'actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onPreview && (
              <>
                <DropdownMenuItem onClick={onPreview}>
                  <LayoutList className="h-4 w-4" />
                  Aperçu du service
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              Exporter le plan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleImport()}>
              <FileInput className="h-4 w-4" />
              Importer depuis fichier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:text-danger focus:bg-danger/10"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer le plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
