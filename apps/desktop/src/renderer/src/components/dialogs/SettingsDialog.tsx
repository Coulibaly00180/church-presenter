import { useCallback, useEffect, useState } from "react";
import { Download, Image, Monitor, Moon, Palette, Sun, Upload, X } from "lucide-react";
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

type Tab = "projection" | "screens" | "interface" | "data";

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>("projection");

  // Projection appearance
  const [bg, setBg] = useState("#000000");
  const [fg, setFg] = useState("#ffffff");
  const [textScale, setTextScale] = useState(1);
  const [logoPath, setLogoPath] = useState("");
  const [logoPosition, setLogoPosition] = useState<CpLogoPosition>("bottom-right");
  const [logoOpacity, setLogoOpacity] = useState(80);

  // Interface theme
  const [theme, setTheme] = useState<CpTheme>("light");

  // Screens
  const [screens, setScreens] = useState<CpScreenMeta[]>([]);
  const [screensLoading, setScreensLoading] = useState(false);

  // Data
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
      setLogoPosition((state.logoPosition as CpLogoPosition) ?? "bottom-right");
      setLogoOpacity(state.logoOpacity ?? 80);
    });
    void window.cp.settings.getTheme().then((r) => {
      if (r.ok && r.theme) setTheme(r.theme);
    });
    setScreensLoading(true);
    void window.cp.screens.list().then((s) => {
      setScreens(s);
      setScreensLoading(false);
    });
  }, [open]);

  // ─── Projection handlers ───────────────────────────────────────────────────
  const handleApplyAppearance = useCallback(async () => {
    await window.cp.projection.setAppearance({ background: bg, foreground: fg, textScale, logoPath, logoPosition, logoOpacity });
    toast.success("Apparence de projection appliquée");
  }, [bg, fg, textScale, logoPath, logoPosition, logoOpacity]);

  const handlePickLogo = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.path) setLogoPath(result.path);
  }, []);

  const handleClearLogo = useCallback(async () => {
    setLogoPath("");
    await window.cp.projection.setAppearance({ logoPath: "" });
    toast.success("Logo supprimé");
  }, []);

  // ─── Interface handlers ────────────────────────────────────────────────────
  const handleSetTheme = useCallback(async (t: CpTheme) => {
    setTheme(t);
    document.documentElement.classList.toggle("theme-dark", t === "dark");
    await window.cp.settings.setTheme(t);
  }, []);

  // ─── Screen handlers ───────────────────────────────────────────────────────
  const refreshScreens = useCallback(async () => {
    const s = await window.cp.screens.list();
    setScreens(s);
  }, []);

  const handleToggleScreen = useCallback(async (key: ScreenKey, isOpen: boolean) => {
    if (isOpen) {
      await window.cp.screens.close(key);
    } else {
      await window.cp.screens.open(key);
    }
    await refreshScreens();
  }, [refreshScreens]);

  const handleSetMirror = useCallback(async (key: ScreenKey, mirror: ScreenMirrorMode) => {
    await window.cp.screens.setMirror(key, mirror);
    await refreshScreens();
  }, [refreshScreens]);

  // ─── Data handlers ─────────────────────────────────────────────────────────
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

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "projection", label: "Projection", Icon: Palette },
    { id: "screens",    label: "Écrans",     Icon: Monitor },
    { id: "interface",  label: "Interface",  Icon: Sun },
    { id: "data",       label: "Données",    Icon: Download },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>Configurez l'interface et la projection.</DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-border -mx-6 px-6 shrink-0">
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

        {/* Scrollable tab content */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ── Projection tab ─────────────────────────────────────────────── */}
          {activeTab === "projection" && (
            <div className="space-y-4 pt-1 pb-2">
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

                {/* Logo position */}
                {logoPath && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">Position</label>
                    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[76px]">
                      {([
                        ["top-left",     "↖", "col-start-1 row-start-1"],
                        ["top-right",    "↗", "col-start-3 row-start-1"],
                        ["center",       "·", "col-start-2 row-start-2"],
                        ["bottom-left",  "↙", "col-start-1 row-start-3"],
                        ["bottom-right", "↘", "col-start-3 row-start-3"],
                      ] as [CpLogoPosition, string, string][]).map(([pos, arrow, gridCls]) => (
                        <button
                          key={pos}
                          type="button"
                          aria-label={pos}
                          className={cn(
                            "h-6 w-6 flex items-center justify-center rounded text-xs border transition-colors",
                            gridCls,
                            logoPosition === pos
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-bg-elevated text-text-muted",
                          )}
                          onClick={() => setLogoPosition(pos)}
                        >
                          {arrow}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Logo opacity */}
                {logoPath && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-text-secondary">Opacité</label>
                      <span className="text-xs text-text-muted tabular-nums">{logoOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Opacité du logo"
                      min={10}
                      max={100}
                      step={5}
                      value={logoOpacity}
                      onChange={(e) => setLogoOpacity(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div
                className="flex items-center justify-center rounded-md h-20 font-medium select-none relative overflow-hidden"
                ref={(el) => {
                  if (!el) return;
                  el.style.backgroundColor = bg;
                  el.style.color = fg;
                  el.style.fontSize = `${Math.round(16 * textScale)}px`;
                }}
              >
                Aperçu du texte projeté
                {logoPath && (() => {
                  const previewPosClass = {
                    "bottom-right": "bottom-1 right-1",
                    "bottom-left":  "bottom-1 left-1",
                    "top-right":    "top-1 right-1",
                    "top-left":     "top-1 left-1",
                    "center":       "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                  }[logoPosition] ?? "bottom-1 right-1";
                  return (
                    <img
                      src={`file://${logoPath}`}
                      alt=""
                      aria-hidden
                      className={`absolute max-h-[30%] max-w-[20%] object-contain pointer-events-none ${previewPosClass}`}
                      ref={(el) => { if (el) el.style.opacity = String(logoOpacity / 100); }}
                    />
                  );
                })()}
              </div>

              <Button className="w-full" onClick={() => void handleApplyAppearance()}>
                Appliquer
              </Button>
            </div>
          )}

          {/* ── Screens tab (US-101) ────────────────────────────────────────── */}
          {activeTab === "screens" && (
            <div className="space-y-3 pt-1 pb-2">
              {screensLoading ? (
                <p className="text-sm text-text-muted py-4 text-center">Chargement…</p>
              ) : screens.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">Aucun écran disponible.</p>
              ) : (
                screens.map((screen) => (
                  <div key={screen.key} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-text-secondary" />
                        <span className="text-sm font-semibold">Écran {screen.key}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-medium",
                          screen.isOpen
                            ? "bg-success/15 text-success"
                            : "bg-bg-elevated text-text-muted",
                        )}>
                          {screen.isOpen ? "Ouvert" : "Fermé"}
                        </span>
                      </div>
                      <Button
                        variant={screen.isOpen ? "outline" : "default"}
                        size="sm"
                        onClick={() => void handleToggleScreen(screen.key, screen.isOpen)}
                      >
                        {screen.isOpen ? "Fermer" : "Ouvrir"}
                      </Button>
                    </div>

                    {/* Mirror mode (only for B and C) */}
                    {screen.key !== "A" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary shrink-0">Mode :</span>
                        <button
                          type="button"
                          className={cn(
                            "text-xs px-2 py-1 rounded border transition-colors",
                            screen.mirror.kind === "FREE"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-text-muted hover:bg-bg-elevated",
                          )}
                          onClick={() => void handleSetMirror(screen.key, { kind: "FREE" })}
                        >
                          Indépendant
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "text-xs px-2 py-1 rounded border transition-colors",
                            screen.mirror.kind === "MIRROR"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-text-muted hover:bg-bg-elevated",
                          )}
                          onClick={() => void handleSetMirror(screen.key, { kind: "MIRROR", from: "A" })}
                        >
                          Miroir de A
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Interface tab ───────────────────────────────────────────────── */}
          {activeTab === "interface" && (
            <div className="space-y-4 pt-1 pb-2">
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

          {/* ── Data tab ────────────────────────────────────────────────────── */}
          {activeTab === "data" && (
            <div className="space-y-3 pt-1 pb-2">
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

        </div>
      </DialogContent>
    </Dialog>
  );
}
