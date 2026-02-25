import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";
import { localNowYmd, isoToYmd } from "@/lib/date";

interface CreatePlanDialogProps {
  open: boolean;
  onClose: () => void;
  /** Date pré-sélectionnée (YYYY-MM-DD). Par défaut : aujourd'hui. */
  initialDate?: string;
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function CreatePlanDialog({ open, onClose, initialDate }: CreatePlanDialogProps) {
  const { createPlan, selectPlan, planList } = usePlan();
  const [dateValue, setDateValue] = useState(initialDate ?? localNowYmd());
  const [titleValue, setTitleValue] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setDateValue(initialDate ?? localNowYmd());
      setTitleValue("");
    }
  }, [open, initialDate]);

  const dateAlreadyExists = planList.some((p) => isoToYmd(p.date) === dateValue);

  const handleCreate = useCallback(async () => {
    if (!dateValue) return;
    setCreating(true);
    try {
      const plan = await createPlan({
        dateIso: dateValue,
        title: titleValue.trim() || undefined,
      });
      if (plan) {
        selectPlan(plan.id);
        toast.success(`Plan créé — ${formatDisplayDate(isoToYmd(plan.date) || dateValue)}`);
        onClose();
      }
    } finally {
      setCreating(false);
    }
  }, [dateValue, titleValue, createPlan, selectPlan, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleCreate();
    if (e.key === "Escape") onClose();
  }, [handleCreate, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Nouveau plan de culte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1" onKeyDown={handleKeyDown}>
          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="cp-plan-date" className="text-sm font-medium text-text-primary">
              Date du culte
            </label>
            <input
              id="cp-plan-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-bg-base text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {dateValue && (
              <p className="text-xs text-text-muted">
                {formatDisplayDate(dateValue)}
                {dateAlreadyExists && (
                  <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                    — un plan existe déjà, la date sera ajustée automatiquement
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Titre (optionnel) */}
          <div className="space-y-1.5">
            <label htmlFor="cp-plan-title" className="text-sm font-medium text-text-primary">
              Titre{" "}
              <span className="font-normal text-text-muted">(optionnel)</span>
            </label>
            <input
              id="cp-plan-title"
              type="text"
              placeholder="Ex : Culte du dimanche"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-bg-base text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => void handleCreate()}
            disabled={!dateValue || creating}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {creating ? "Création…" : "Créer le plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
