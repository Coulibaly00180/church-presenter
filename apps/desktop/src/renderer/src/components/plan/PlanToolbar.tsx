import React from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Plan } from "@/lib/types";
import { isoToYmd } from "@/lib/date";

type PlanToolbarProps = {
  plan: Plan;
  onDeleted: () => void;
  onDuplicated: (newPlanId: string) => void;
};

export function PlanToolbar({ plan, onDeleted, onDuplicated }: PlanToolbarProps) {
  const handleExport = async () => {
    const result = await window.cp.plans.export({ planId: plan.id });
    if (result?.ok) {
      toast.success("Plan exporte avec succes");
    }
  };

  const handleDuplicate = async () => {
    const result = await window.cp.plans.duplicate({ planId: plan.id, dateIso: isoToYmd(plan.date) });
    if (result?.id) {
      toast.success("Plan duplique");
      onDuplicated(result.id);
    }
  };

  const handleDelete = async () => {
    await window.cp.plans.delete(plan.id);
    toast.success("Plan supprime");
    onDeleted();
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exporter JSON</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dupliquer le plan</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Supprimer le plan</TooltipContent>
      </Tooltip>
    </div>
  );
}
