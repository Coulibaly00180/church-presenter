import React, { useState } from "react";
import { BookmarkPlus, Clock, Copy, Download, Repeat, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Plan } from "@/lib/types";
import { localNowYmd } from "@/lib/date";
import { saveAsTemplate } from "@/lib/templates";

type PlanToolbarProps = {
  plan: Plan;
  onDeleted: () => void;
  onDuplicated: (newPlanId: string) => void;
  onShowHistory?: () => void;
  loopActive?: boolean;
  loopInterval?: number;
  onToggleLoop?: () => void;
  onSetLoopInterval?: (seconds: number) => void;
  onImportFromFile?: () => void;
};

export function PlanToolbar({ plan, onDeleted, onDuplicated, onShowHistory, loopActive, loopInterval, onToggleLoop, onSetLoopInterval, onImportFromFile }: PlanToolbarProps) {
  const [templateName, setTemplateName] = useState("");
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false);

  const handleExport = async () => {
    const result = await window.cp.plans.export({ planId: plan.id });
    if (result?.ok) {
      toast.success("Plan exporte avec succes");
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await window.cp.plans.duplicate({ planId: plan.id, dateIso: localNowYmd() });
      if (result?.id) {
        toast.success("Plan duplique");
        onDuplicated(result.id);
      }
    } catch {
      toast.error("Impossible de dupliquer : un plan existe deja pour cette date.");
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const items = plan.items.map(({ kind, title, content, refId, refSubId, mediaPath }) => ({
      kind, title, content, refId, refSubId, mediaPath,
    }));
    await saveAsTemplate(templateName.trim(), items);
    toast.success("Template sauvegarde");
    setTemplateName("");
    setTemplatePopoverOpen(false);
  };

  const handleDelete = async () => {
    setDeletePopoverOpen(false);
    await window.cp.plans.delete(plan.id);
    toast.success("Plan supprime");
    onDeleted();
  };

  return (
    <div className="flex items-center gap-1">
      {onShowHistory && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShowHistory}>
              <Clock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Historique des projections</TooltipContent>
        </Tooltip>
      )}

      {onToggleLoop && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant={loopActive ? "default" : "ghost"} size="icon" className="h-8 w-8">
                  <Repeat className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Mode boucle</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-52 p-3 space-y-2">
            <p className="text-xs font-medium">Mode boucle</p>
            <p className="text-[10px] text-muted-foreground">Fait defiler automatiquement les elements du plan.</p>
            <div className="flex items-center gap-2">
              <label className="text-xs">Intervalle</label>
              <Input
                type="number"
                min={3}
                max={120}
                className="h-7 text-xs w-16 text-center"
                value={loopInterval ?? 10}
                onChange={(e) => onSetLoopInterval?.(Math.max(3, Math.min(120, Number(e.target.value) || 10)))}
              />
              <span className="text-xs text-muted-foreground">sec</span>
            </div>
            <Button size="sm" className="w-full h-7 text-xs" variant={loopActive ? "destructive" : "default"} onClick={onToggleLoop}>
              {loopActive ? "Arreter la boucle" : "Demarrer la boucle"}
            </Button>
          </PopoverContent>
        </Popover>
      )}

      <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Sauvegarder comme template</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-56 p-3 space-y-2">
          <p className="text-xs font-medium">Sauvegarder comme template</p>
          <Input
            className="h-7 text-xs"
            placeholder="Nom du template..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSaveTemplate(); }}
          />
          <Button size="sm" className="w-full h-7 text-xs" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
            Sauvegarder
          </Button>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exporter JSON</TooltipContent>
      </Tooltip>

      {onImportFromFile && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onImportFromFile}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Importer depuis fichier (Word/TXT)</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dupliquer le plan</TooltipContent>
      </Tooltip>

      <Popover open={deletePopoverOpen} onOpenChange={setDeletePopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Supprimer le plan</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-52 p-3 space-y-2">
          <p className="text-xs font-medium">Supprimer « {plan.title || "Culte"} » ?</p>
          <p className="text-[10px] text-muted-foreground">Cette action est irreversible.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={handleDelete}>
              Supprimer
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setDeletePopoverOpen(false)}>
              Annuler
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
