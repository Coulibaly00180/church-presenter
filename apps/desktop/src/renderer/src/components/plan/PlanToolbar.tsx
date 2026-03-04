import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, Download, FileImage, FileInput, FileVideo, LayoutList, Loader2, MoreHorizontal, Palette, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PlanTemplateDialog } from "@/components/dialogs/PlanTemplateDialog";
import { usePlan } from "@/hooks/usePlan";
import { isoToYmd } from "@/lib/date";
import { parsePlanBackground } from "@/lib/projection";

interface PlanToolbarProps {
  onAddItem?: () => void;
  onPreview?: () => void;
}

type BgMode = "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE" | "VIDEO";

const BG_MODE_BUTTONS: { value: BgMode; label: string }[] = [
  { value: "SOLID", label: "Uni" },
  { value: "GRADIENT_LINEAR", label: "Dégr. lin." },
  { value: "GRADIENT_RADIAL", label: "Dégr. rad." },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Vidéo" },
];

export function PlanToolbar({ onAddItem, onPreview }: PlanToolbarProps) {
  const { plan, updatePlan, deletePlan, selectedPlanId, refreshPlan } = usePlan();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Plan background dialog state
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>("SOLID");
  const [bgColor, setBgColor] = useState("#050505");
  const [bgFrom, setBgFrom] = useState("#2563eb");
  const [bgTo, setBgTo] = useState("#7c3aed");
  const [bgAngle, setBgAngle] = useState(135);
  const [fgEnabled, setFgEnabled] = useState(false);
  const [fgColor, setFgColor] = useState("#ffffff");
  const [bgSaving, setBgSaving] = useState(false);

  // Media background state
  const [bgMediaPath, setBgMediaPath] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<CpMediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const displayTitle = plan?.title ?? (plan?.date ? isoToYmd(plan.date) : "Plan");

  // Load media files when image/video mode selected in dialog
  useEffect(() => {
    if (!bgDialogOpen || !bgEnabled || (bgMode !== "IMAGE" && bgMode !== "VIDEO")) return;
    setMediaLoading(true);
    window.cp.files.listMedia().then((result) => {
      if (result.ok) {
        const kind = bgMode === "IMAGE" ? "IMAGE" : "VIDEO";
        setMediaFiles(result.files.filter((f) => f.kind === kind));
      }
      setMediaLoading(false);
    }).catch(() => setMediaLoading(false));
  }, [bgDialogOpen, bgEnabled, bgMode]);

  const openBgDialog = useCallback(() => {
    if (plan?.backgroundConfig) {
      const bg = parsePlanBackground(plan.backgroundConfig);
      if (bg) {
        setBgEnabled(true);
        if (bg.backgroundMediaType && bg.backgroundMedia) {
          setBgMode(bg.backgroundMediaType === "VIDEO" ? "VIDEO" : "IMAGE");
          setBgMediaPath(bg.backgroundMedia);
        } else {
          setBgMode((bg.backgroundMode as BgMode | undefined) ?? "SOLID");
          setBgMediaPath(null);
        }
        setBgColor(bg.background ?? "#050505");
        setBgFrom(bg.backgroundGradientFrom ?? "#2563eb");
        setBgTo(bg.backgroundGradientTo ?? "#7c3aed");
        setBgAngle(bg.backgroundGradientAngle ?? 135);
        if (bg.foreground) { setFgEnabled(true); setFgColor(bg.foreground); }
        else { setFgEnabled(false); setFgColor("#ffffff"); }
      }
    } else {
      setBgEnabled(false);
      setBgMode("SOLID");
      setBgMediaPath(null);
      setBgColor("#050505");
      setBgFrom("#2563eb");
      setBgTo("#7c3aed");
      setBgAngle(135);
      setFgEnabled(false);
      setFgColor("#ffffff");
    }
    setBgDialogOpen(true);
  }, [plan]);

  const handleSavePlanBg = useCallback(async () => {
    if (!selectedPlanId) return;
    setBgSaving(true);
    try {
      let backgroundConfig: string | null = null;
      if (bgEnabled) {
        const bg: CpItemBackground = {};
        if (bgMode === "IMAGE" || bgMode === "VIDEO") {
          if (bgMediaPath) {
            bg.backgroundMedia = bgMediaPath;
            bg.backgroundMediaType = bgMode;
          }
        } else {
          bg.backgroundMode = bgMode;
          if (bgMode === "SOLID") bg.background = bgColor;
          else { bg.backgroundGradientFrom = bgFrom; bg.backgroundGradientTo = bgTo; bg.backgroundGradientAngle = bgAngle; }
        }
        if (fgEnabled) bg.foreground = fgColor;
        if (Object.keys(bg).length > 0) backgroundConfig = JSON.stringify(bg);
      }
      await window.cp.plans.update({ planId: selectedPlanId, backgroundConfig });
      await refreshPlan();
      toast.success("Fond du plan mis à jour");
      setBgDialogOpen(false);
    } catch {
      toast.error("Impossible de mettre à jour le fond du plan");
    } finally {
      setBgSaving(false);
    }
  }, [selectedPlanId, refreshPlan, bgEnabled, bgMode, bgColor, bgFrom, bgTo, bgAngle, fgEnabled, fgColor, bgMediaPath]);

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

  const hasPlanBg = Boolean(plan.backgroundConfig);
  const _planBg = parsePlanBackground(plan.backgroundConfig);
  const planBgIsMedia = hasPlanBg && Boolean(_planBg?.backgroundMediaType);
  const planBgSwatchColor = (!hasPlanBg || planBgIsMedia) ? "#888" : (_planBg?.background ?? _planBg?.backgroundGradientFrom ?? "#888");

  const isMediaMode = bgMode === "IMAGE" || bgMode === "VIDEO";

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

        {hasPlanBg && (
          <button
            className="flex items-center justify-center w-4 h-4 rounded-full border border-white/30 shrink-0 overflow-hidden"
            title="Fond du plan personnalisé"
            aria-label="Modifier le fond du plan"
            onClick={openBgDialog}
            style={planBgIsMedia ? undefined : { backgroundColor: planBgSwatchColor }}
          >
            {planBgIsMedia && (
              <FileImage className="h-2.5 w-2.5 text-text-muted" />
            )}
          </button>
        )}
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
            <DropdownMenuItem onClick={openBgDialog}>
              <Palette className="h-4 w-4" />
              Fond du plan…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
              <BookOpen className="h-4 w-4" />
              Modèles de plans
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

      <PlanTemplateDialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} />

      {/* Plan background dialog */}
      <Dialog open={bgDialogOpen} onOpenChange={(v) => !v && setBgDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fond du plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-xs text-text-muted">
              S'applique à tous les éléments sans fond personnalisé.
            </p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bgEnabled}
                onChange={(e) => setBgEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-medium text-text-secondary">Fond personnalisé</span>
            </label>

            {bgEnabled && (
              <div className="space-y-2 pl-1">
                {/* Mode buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {BG_MODE_BUTTONS.map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setBgMode(btn.value)}
                      className={`px-1 py-1 rounded text-[10px] font-medium border transition-colors ${
                        bgMode === btn.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-bg-elevated"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Color inputs */}
                {!isMediaMode && bgMode === "SOLID" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted w-16 shrink-0">Couleur</label>
                    <input aria-label="Couleur de fond" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                    <span className="text-xs text-text-muted font-mono">{bgColor}</span>
                  </div>
                )}
                {!isMediaMode && bgMode !== "SOLID" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-16 shrink-0">Début</label>
                      <input aria-label="Couleur de début" type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                      <span className="text-xs text-text-muted font-mono">{bgFrom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-16 shrink-0">Fin</label>
                      <input aria-label="Couleur de fin" type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                      <span className="text-xs text-text-muted font-mono">{bgTo}</span>
                    </div>
                    {bgMode === "GRADIENT_LINEAR" && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted w-16 shrink-0">Angle</label>
                        <input
                          aria-label="Angle du dégradé"
                          type="range" min={0} max={360} value={bgAngle}
                          onChange={(e) => setBgAngle(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-text-muted w-8 text-right">{bgAngle}°</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview swatch (non-media) */}
                {!isMediaMode && (
                  <div
                    className="h-5 rounded border border-border"
                    style={{
                      background: bgMode === "SOLID"
                        ? bgColor
                        : bgMode === "GRADIENT_LINEAR"
                        ? `linear-gradient(${bgAngle}deg, ${bgFrom}, ${bgTo})`
                        : `radial-gradient(circle, ${bgFrom}, ${bgTo})`,
                    }}
                  />
                )}

                {/* Media file picker */}
                {isMediaMode && (
                  <div className="space-y-1">
                    {bgMediaPath && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30">
                        {bgMode === "IMAGE"
                          ? <FileImage className="h-3 w-3 shrink-0 text-primary" />
                          : <FileVideo className="h-3 w-3 shrink-0 text-primary" />}
                        <span className="text-xs text-primary truncate">
                          {bgMediaPath.split(/[\\/]/).pop()}
                        </span>
                      </div>
                    )}
                    {mediaLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                      </div>
                    ) : mediaFiles.length === 0 ? (
                      <p className="text-xs text-text-muted py-2 text-center">
                        Aucun fichier {bgMode === "IMAGE" ? "image" : "vidéo"} dans la médiathèque
                      </p>
                    ) : (
                      <ScrollArea className="h-28 border border-border rounded-md">
                        <div className="py-0.5">
                          {mediaFiles.map((f) => (
                            <button
                              key={f.path}
                              type="button"
                              onClick={() => setBgMediaPath(f.path)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors text-left",
                                bgMediaPath === f.path
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-bg-elevated text-text-secondary"
                              )}
                            >
                              {f.kind === "IMAGE"
                                ? <FileImage className="h-3 w-3 shrink-0" />
                                : <FileVideo className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {/* Foreground (text color) */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fgEnabled}
                    onChange={(e) => setFgEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-text-muted">Couleur texte personnalisée</span>
                </label>
                {fgEnabled && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted w-16 shrink-0">Texte</label>
                    <input aria-label="Couleur du texte" type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                    <span className="text-xs text-text-muted font-mono">{fgColor}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBgDialogOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => void handleSavePlanBg()} disabled={bgSaving}>
              {bgSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
