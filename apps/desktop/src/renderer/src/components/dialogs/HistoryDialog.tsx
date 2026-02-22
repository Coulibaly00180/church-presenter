import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Upload, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isoToYmd, localNowYmd } from "@/lib/date";

type ImportDetail = { counts: CpDataImportCounts; errors: CpDataImportError[] };

type HistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HistoryDialog({ open, onOpenChange }: HistoryDialogProps) {
  const [plans, setPlans] = useState<CpPlanListItem[]>([]);
  const [importMode, setImportMode] = useState<CpDataImportMode>("MERGE");
  const [importAtomicity, setImportAtomicity] = useState<CpDataImportAtomicity>("ENTITY");
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      window.cp.plans.list().then(setPlans).catch(() => null);
      setImportDetail(null);
    }
  }, [open]);

  const handleExportAll = async () => {
    try {
      const r = await window.cp.data.exportAll();
      if (r.ok) toast.success(`Export termine: ${r.path}`);
      else if (r.canceled) toast.info("Export annule.");
    } catch (e) {
      toast.error(`Export echoue: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleImportAll = async () => {
    try {
      const replace = importMode === "REPLACE";
      const atomicity: CpDataImportAtomicity = replace ? "STRICT" : importAtomicity;

      if (replace) {
        const bk = await window.cp.data.exportAll();
        if (!bk.ok) {
          toast.error(bk.canceled ? "Import annule: sauvegarde obligatoire en mode REPLACE." : "Sauvegarde echouee.");
          return;
        }
      }

      const r = await window.cp.data.importAll({ mode: importMode, atomicity });
      if (r.ok) {
        setPlans(await window.cp.plans.list());
        setImportDetail({ counts: r.counts, errors: r.errors });
        toast.success(`Import termine (${r.counts.songs} chants, ${r.counts.plans} plans).`);
      } else if ("canceled" in r && r.canceled) {
        toast.info("Import annule.");
      } else {
        toast.error(`Import echoue${"error" in r ? `: ${r.error}` : "."}`);
      }
    } catch (e) {
      toast.error(`Import echoue: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDuplicate = async (planId: string) => {
    try {
      const duplicated = await window.cp.plans.duplicate({ planId, dateIso: localNowYmd() });
      if (!duplicated) { toast.error("Duplication echouee."); return; }
      setPlans(await window.cp.plans.list());
      toast.success("Plan duplique.");
    } catch (e) {
      toast.error(`Duplication echouee: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    setDeletingPlanId(null);
    await window.cp.plans.delete(planId);
    toast.success("Plan supprime.");
    setPlans(await window.cp.plans.list());
  };

  const handleExportPlan = async (planId: string) => {
    try {
      const res = await window.cp.plans.export({ planId });
      if (res.ok) toast.success(`Plan exporte: ${res.path}`);
      else if (res.canceled) toast.info("Export annule.");
    } catch (e) {
      toast.error(`Export echoue: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import / Export</DialogTitle>
          <DialogDescription>Gestion des donnees: export et import JSON global, duplication de plans.</DialogDescription>
        </DialogHeader>

        {/* Import detail banner */}
        {importDetail && (
          <div className="rounded-md border p-3 text-sm space-y-2">
            <p className="font-medium">
              Recapitulatif: {importDetail.counts.songs} chants, {importDetail.counts.plans} plans.
            </p>
            {importDetail.errors.length === 0 ? (
              <p className="text-green-600 dark:text-green-400">Aucune erreur.</p>
            ) : (
              <ScrollArea className="max-h-[120px]">
                {importDetail.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">[{e.kind}] {e.title || "??"} — {e.message}</p>
                ))}
              </ScrollArea>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setImportDetail(null)}>
              Fermer
            </Button>
          </div>
        )}

        {/* Import/export controls */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Mode</label>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as CpDataImportMode)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MERGE">MERGE</SelectItem>
                <SelectItem value="REPLACE">REPLACE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Atomicite</label>
            <Select
              value={importMode === "REPLACE" ? "STRICT" : importAtomicity}
              onValueChange={(v) => setImportAtomicity(v as CpDataImportAtomicity)}
              disabled={importMode === "REPLACE"}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTITY">ENTITY</SelectItem>
                <SelectItem value="STRICT">STRICT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleExportAll}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export global
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleImportAll}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Import global
          </Button>
        </div>

        <Separator />

        {/* Plan list */}
        <div className="space-y-1">
          <p className="text-xs font-medium">Plans existants</p>
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-1">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs">
                  <span className="flex-1 truncate">
                    <span className="font-medium">{p.title || "Culte"}</span>
                    <span className="text-muted-foreground ml-2">{isoToYmd(p.date)}</span>
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(p.id)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExportPlan(p.id)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  <Popover open={deletingPlanId === p.id} onOpenChange={(v) => { if (!v) setDeletingPlanId(null); }}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeletingPlanId(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-48 p-3 space-y-2">
                      <p className="text-xs font-medium">Supprimer « {p.title || "Culte"} » ?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="flex-1 h-6 text-[10px]" onClick={() => handleDeletePlan(p.id)}>
                          Supprimer
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px]" onClick={() => setDeletingPlanId(null)}>
                          Annuler
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
              {plans.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Aucun plan.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
