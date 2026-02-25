import { useCallback, useEffect, useState } from "react";
import { Download, Image, Moon, Palette, Sun, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "projection" | "interface" | "data";

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("projection");
  const [theme, setTheme] = useState<CpTheme>("light");
  const [bg, setBg] = useState("#000000");
  const [fg, setFg] = useState("#ffffff");
  const [textScale, setTextScale] = useState(1);
  const [logoPath, setLogoPath] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Reload state each time dialog opens
  useEffect(() => {
    if (!open) return;
    void window.cp.projection.getState().then((state) => {
      setBg(state.background ?? "#000000");
      setFg(state.foreground ?? "#ffffff");
      setTextScale(state.textScale ?? 1);
      setLogoPath(state.logoPath ?? "");
    });
    void window.cp.settings.getTheme().then((r) => {
      if (r.ok && r.theme) setTheme(r.theme);
    });
  }, [open]);

  const handleSetTheme = useCallback(async (t: CpTheme) => {
    setTheme(t);
    await window.cp.settings.setTheme(t);
  }, []);

  const handleApplyAppearance = useCallback(async () => {
    await window.cp.projection.setAppearance({ background: bg, foreground: fg, textScale, logoPath });
    toast.success("Apparence de projection appliquée");
  }, [bg, fg, textScale, logoPath]);

  const handlePickLogo = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.path) setLogoPath(result.path);
  }, []);

  const handleClearLogo = useCallback(async () => {
    setLogoPath("");
    await window.cp.projection.setAppearance({ logoPath: "" });
    toast.success("Logo supprimé");
  }, []);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const result = await window.cp.data.exportAll();
      if (result.ok) toast.success("Données exportées", { description: result.path });
      else if (!result.canceled) toast.error("Export échoué");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImportAll = useCallback(async () => {
    setImporting(true);
    try {
      const result = await window.cp.data.importAll({ mode: "MERGE" });
      if (result.ok) {
        toast.success(
          `Import terminé — ${result.counts.songs} chant${result.counts.songs !== 1 ? "s" : ""}, ${result.counts.plans} plan${result.counts.plans !== 1 ? "s" : ""}`,
        );
      } else if (!("canceled" in result)) {
        toast.error("Import échoué", { description: "error" in result ? result.error : undefined });
      }
    } finally {
      setImporting(false);
    }
  }, []);

  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "projection", label: "Projection", Icon: Palette },
    { id: "interface", label: "Interface", Icon: Sun },
    { id: "data", label: "Données", Icon: Download },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>Configurez l'interface et la projection.</DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-border -mx-6 px-6">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-text-muted hover:text-text-primary",
              )}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Projection tab */}
        {activeTab === "projection" && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Fond</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Couleur de fond"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="h-8 w-10 rounded border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <span className="text-xs text-text-muted font-mono uppercase">{bg}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Texte</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Couleur du texte"
                    value={fg}
                    onChange={(e) => setFg(e.target.value)}
                    className="h-8 w-10 rounded border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <span className="text-xs text-text-muted font-mono uppercase">{fg}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Taille du texte</label>
                <span className="text-xs text-text-muted tabular-nums">{Math.round(textScale * 100)}%</span>
              </div>
              <input
                type="range"
                aria-label="Taille du texte"
                min={0.5}
                max={2}
                step={0.05}
                value={textScale}
                onChange={(e) => setTextScale(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Logo (overlay projection)</label>
                {logoPath && (
                  <button
                    type="button"
                    className="text-xs text-danger hover:underline flex items-center gap-0.5"
                    onClick={() => void handleClearLogo()}
                  >
                    <X className="h-3 w-3" />
                    Supprimer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {logoPath ? (
                  <img
                    src={`file://${logoPath}`}
                    alt="Logo"
                    className="h-10 rounded border border-border object-contain bg-bg-elevated px-1"
                  />
                ) : (
                  <div className="flex h-10 w-14 items-center justify-center rounded border border-dashed border-border bg-bg-elevated">
                    <Image className="h-4 w-4 text-text-muted opacity-50" />
                  </div>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handlePickLogo()}>
                  <Upload className="h-3.5 w-3.5" />
                  {logoPath ? "Changer" : "Choisir un logo"}
                </Button>
              </div>
              {logoPath && (
                <p className="text-[10px] text-text-muted truncate font-mono">{logoPath.split(/[\\/]/).pop()}</p>
              )}
            </div>

            {/* Live preview */}
            <div
              className="flex items-center justify-center rounded-md h-20 font-medium select-none relative overflow-hidden"
              style={{ backgroundColor: bg, color: fg, fontSize: `${Math.round(16 * textScale)}px` }}
            >
              Aperçu du texte projeté
              {logoPath && (
                <img
                  src={`file://${logoPath}`}
                  alt=""
                  aria-hidden
                  className="absolute bottom-1 right-1 max-h-[30%] max-w-[20%] object-contain opacity-80"
                />
              )}
            </div>

            <Button className="w-full" onClick={() => void handleApplyAppearance()}>
              Appliquer
            </Button>
          </div>
        )}

        {/* Interface tab */}
        {activeTab === "interface" && (
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Thème de l'interface</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-colors",
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-bg-elevated",
                  )}
                  onClick={() => void handleSetTheme("light")}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-xs font-medium">Clair</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-colors",
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-bg-elevated",
                  )}
                  onClick={() => void handleSetTheme("dark")}
                >
                  <Moon className="h-6 w-6" />
                  <span className="text-xs font-medium">Sombre</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data tab */}
        {activeTab === "data" && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Exporter toutes les données</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Sauvegarde chants et plans dans un fichier JSON.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleExportAll()}
                disabled={exporting}
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Export en cours…" : "Exporter"}
              </Button>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Importer des données</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Importe un fichier JSON exporté (fusion avec les données existantes).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleImportAll()}
                disabled={importing}
              >
                <Upload className="h-3.5 w-3.5" />
                {importing ? "Import en cours…" : "Importer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
