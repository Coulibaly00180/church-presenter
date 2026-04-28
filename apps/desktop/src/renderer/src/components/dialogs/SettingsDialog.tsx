import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ElementType } from "react";
import { Download, Monitor, Moon, Palette, Sun, Type, Upload, X } from "lucide-react";
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

type SettingsTab = "projection" | "screens" | "interface" | "data";

type ProjectionPreset = {
  id: string;
  label: string;
  description: string;
  backgroundMode: CpBackgroundFillMode;
  background: string;
  backgroundGradientFrom: string;
  backgroundGradientTo: string;
  backgroundGradientAngle: number;
  foregroundMode: CpForegroundFillMode;
  foreground: string;
  foregroundGradientFrom: string;
  foregroundGradientTo: string;
  textScale: number;
  titleTextScale: number;
  textFont: string;
};

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  description: string;
  icon: ElementType;
}> = [
  { id: "projection", label: "Projection", description: "Presets, fond, texte et logo.", icon: Palette },
  { id: "screens", label: "Ecrans", description: "Ouverture et modes miroir.", icon: Monitor },
  { id: "interface", label: "Interface", description: "Theme et confort d'usage.", icon: Sun },
  { id: "data", label: "Donnees", description: "Export et import de la bibliotheque.", icon: Download },
];

const PROJECTION_PRESETS: ProjectionPreset[] = [
  {
    id: "classic",
    label: "Lecture claire",
    description: "Fond sombre, texte clair, contraste stable.",
    backgroundMode: "SOLID",
    background: "#060606",
    backgroundGradientFrom: "#060606",
    backgroundGradientTo: "#060606",
    backgroundGradientAngle: 180,
    foregroundMode: "SOLID",
    foreground: "#ffffff",
    foregroundGradientFrom: "#ffffff",
    foregroundGradientTo: "#ffffff",
    textScale: 1,
    titleTextScale: 0.92,
    textFont: "system-ui",
  },
  {
    id: "warm",
    label: "Scene douce",
    description: "Gradient chaud pour louange et annonces.",
    backgroundMode: "GRADIENT_LINEAR",
    background: "#141414",
    backgroundGradientFrom: "#1f2937",
    backgroundGradientTo: "#7c2d12",
    backgroundGradientAngle: 155,
    foregroundMode: "SOLID",
    foreground: "#fff7ed",
    foregroundGradientFrom: "#fff7ed",
    foregroundGradientTo: "#fff7ed",
    textScale: 1.05,
    titleTextScale: 0.95,
    textFont: "Georgia, serif",
  },
  {
    id: "contrast",
    label: "Impact fort",
    description: "Texte plus grand pour salles lumineuses.",
    backgroundMode: "GRADIENT_RADIAL",
    background: "#0f172a",
    backgroundGradientFrom: "#0f172a",
    backgroundGradientTo: "#020617",
    backgroundGradientAngle: 180,
    foregroundMode: "GRADIENT",
    foreground: "#ffffff",
    foregroundGradientFrom: "#ffffff",
    foregroundGradientTo: "#38bdf8",
    textScale: 1.2,
    titleTextScale: 1.08,
    textFont: "Arial, sans-serif",
  },
];

function getPreviewBackgroundStyle(params: {
  bgMode: CpBackgroundFillMode;
  bg: string;
  bgFrom: string;
  bgTo: string;
  bgAngle: number;
  bgImage: string;
}): CSSProperties {
  if (params.bgImage) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(file://${params.bgImage})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }
  if (params.bgMode === "GRADIENT_LINEAR") {
    return { background: `linear-gradient(${params.bgAngle}deg, ${params.bgFrom}, ${params.bgTo})` };
  }
  if (params.bgMode === "GRADIENT_RADIAL") {
    return { background: `radial-gradient(circle, ${params.bgFrom}, ${params.bgTo})` };
  }
  return { backgroundColor: params.bg };
}

function getPreviewTextStyle(params: {
  fgMode: CpForegroundFillMode;
  fg: string;
  fgFrom: string;
  fgTo: string;
  textScale: number;
  textFont: string;
}): CSSProperties {
  if (params.fgMode === "GRADIENT") {
    return {
      background: `linear-gradient(90deg, ${params.fgFrom}, ${params.fgTo})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
      fontSize: `${Math.round(16 * params.textScale)}px`,
      fontFamily: params.textFont,
    };
  }
  return {
    color: params.fg,
    fontSize: `${Math.round(16 * params.textScale)}px`,
    fontFamily: params.textFont,
  };
}

function getLogoPreviewPositionClass(position: CpLogoPosition): string {
  switch (position) {
    case "top-left":
      return "left-3 top-3";
    case "top-right":
      return "right-3 top-3";
    case "bottom-left":
      return "left-3 bottom-3";
    case "center":
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    case "bottom-right":
    default:
      return "right-3 bottom-3";
  }
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("projection");
  const [bgMode, setBgMode] = useState<CpBackgroundFillMode>("SOLID");
  const [bg, setBg] = useState("#000000");
  const [bgFrom, setBgFrom] = useState("#000000");
  const [bgTo, setBgTo] = useState("#1e1b4b");
  const [bgAngle, setBgAngle] = useState(180);
  const [bgImage, setBgImage] = useState("");
  const [fgMode, setFgMode] = useState<CpForegroundFillMode>("SOLID");
  const [fg, setFg] = useState("#ffffff");
  const [fgFrom, setFgFrom] = useState("#ffffff");
  const [fgTo, setFgTo] = useState("#a5b4fc");
  const [textFont, setTextFont] = useState("system-ui");
  const [textFontPath, setTextFontPath] = useState("");
  const [textFontLabel, setTextFontLabel] = useState("");
  const [textScale, setTextScale] = useState(1);
  const [titleTextScale, setTitleTextScale] = useState(1);
  const [logoPath, setLogoPath] = useState("");
  const [logoPosition, setLogoPosition] = useState<CpLogoPosition>("bottom-right");
  const [logoOpacity, setLogoOpacity] = useState(80);
  const [logoScale, setLogoScale] = useState(100);
  const [theme, setTheme] = useState<CpTheme>("light");
  const [screens, setScreens] = useState<CpScreenMeta[]>([]);
  const [screensLoading, setScreensLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const previewBackgroundStyle = useMemo(
    () => getPreviewBackgroundStyle({ bgMode, bg, bgFrom, bgTo, bgAngle, bgImage }),
    [bgMode, bg, bgFrom, bgTo, bgAngle, bgImage],
  );
  const previewTextStyle = useMemo(
    () => getPreviewTextStyle({ fgMode, fg, fgFrom, fgTo, textScale, textFont }),
    [fgMode, fg, fgFrom, fgTo, textScale, textFont],
  );

  useEffect(() => {
    if (!open) return;
    void window.cp.projection.getState().then((state) => {
      setBgMode(state.backgroundMode ?? "SOLID");
      setBg(state.background ?? "#000000");
      setBgFrom(state.backgroundGradientFrom ?? "#000000");
      setBgTo(state.backgroundGradientTo ?? "#1e1b4b");
      setBgAngle(state.backgroundGradientAngle ?? 180);
      setBgImage(state.backgroundImage ?? "");
      setFgMode(state.foregroundMode ?? "SOLID");
      setFg(state.foreground ?? "#ffffff");
      setFgFrom(state.foregroundGradientFrom ?? "#ffffff");
      setFgTo(state.foregroundGradientTo ?? "#a5b4fc");
      setTextFont(state.textFont ?? "system-ui");
      setTextFontPath(state.textFontPath ?? "");
      setTextFontLabel(state.textFontPath ? state.textFontPath.split(/[\\/]/).pop() ?? "" : "");
      setTextScale(state.textScale ?? 1);
      setTitleTextScale(state.titleTextScale ?? state.textScale ?? 1);
      setLogoPath(state.logoPath ?? "");
      setLogoPosition((state.logoPosition as CpLogoPosition) ?? "bottom-right");
      setLogoOpacity(state.logoOpacity ?? 80);
      setLogoScale(state.logoScale ?? 100);
    });
    void window.cp.settings.getTheme().then((result) => {
      if (result.ok && result.theme) setTheme(result.theme);
    });
    setScreensLoading(true);
    void window.cp.screens.list().then((list) => {
      setScreens(list);
      setScreensLoading(false);
    });
  }, [open]);

  const refreshScreens = useCallback(async () => {
    const nextScreens = await window.cp.screens.list();
    setScreens(nextScreens);
  }, []);

  const handleApplyAppearance = useCallback(async () => {
    await window.cp.projection.setAppearance({
      background: bg,
      backgroundMode: bgMode,
      backgroundGradientFrom: bgFrom,
      backgroundGradientTo: bgTo,
      backgroundGradientAngle: bgAngle,
      backgroundImage: bgImage,
      foreground: fg,
      foregroundMode: fgMode,
      foregroundGradientFrom: fgFrom,
      foregroundGradientTo: fgTo,
      textFont,
      textFontPath,
      textScale,
      titleTextScale,
      logoPath,
      logoPosition,
      logoOpacity,
      logoScale,
    });
    toast.success("Apparence de projection appliquee");
  }, [bg, bgMode, bgFrom, bgTo, bgAngle, bgImage, fg, fgMode, fgFrom, fgTo, textFont, textFontPath, textScale, titleTextScale, logoPath, logoPosition, logoOpacity, logoScale]);

  const applyPreset = useCallback((preset: ProjectionPreset) => {
    setBgMode(preset.backgroundMode);
    setBg(preset.background);
    setBgFrom(preset.backgroundGradientFrom);
    setBgTo(preset.backgroundGradientTo);
    setBgAngle(preset.backgroundGradientAngle);
    setFgMode(preset.foregroundMode);
    setFg(preset.foreground);
    setFgFrom(preset.foregroundGradientFrom);
    setFgTo(preset.foregroundGradientTo);
    setTextScale(preset.textScale);
    setTitleTextScale(preset.titleTextScale);
    setTextFont(preset.textFont);
    setTextFontPath("");
    setTextFontLabel("");
    setBgImage("");
  }, []);

  const handleSetTheme = useCallback(async (nextTheme: CpTheme) => {
    setTheme(nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
    await window.cp.settings.setTheme(nextTheme);
  }, []);

  const handleToggleScreen = useCallback(async (key: ScreenKey, isOpen: boolean) => {
    if (isOpen) await window.cp.screens.close(key);
    else await window.cp.screens.open(key);
    await refreshScreens();
  }, [refreshScreens]);

  const handleSetMirror = useCallback(async (key: ScreenKey, mirror: ScreenMirrorMode) => {
    await window.cp.screens.setMirror(key, mirror);
    await refreshScreens();
  }, [refreshScreens]);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const result = await window.cp.data.exportAll();
      if (result.ok) toast.success("Donnees exportees", { description: result.path });
      else if (!result.canceled) toast.error("Export echoue");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleImportAll = useCallback(async () => {
    setImporting(true);
    try {
      const result = await window.cp.data.importAll({ mode: "MERGE" });
      if (result.ok) {
        toast.success(`Import termine - ${result.counts.songs} chant${result.counts.songs !== 1 ? "s" : ""}, ${result.counts.plans} plan${result.counts.plans !== 1 ? "s" : ""}`);
      } else if (!("canceled" in result)) {
        toast.error("Import echoue", { description: "error" in result ? result.error : undefined });
      }
    } finally {
      setImporting(false);
    }
  }, []);

  const handlePickLogo = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.path) setLogoPath(result.path);
  }, []);

  const handleClearLogo = useCallback(async () => {
    setLogoPath("");
    await window.cp.projection.setAppearance({ logoPath: "" });
    toast.success("Logo retire");
  }, []);

  const handlePickBgImage = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.path) setBgImage(result.path);
  }, []);

  const handlePickFont = useCallback(async () => {
    const result = await window.cp.files.pickFont();
    if (!result.ok || !result.path) return;
    const validation = await window.cp.files.validateFont({ path: result.path });
    if (!validation.ok || !validation.valid) return;
    setTextFontPath(result.path);
    setTextFontLabel(result.path.split(/[\\/]/).pop() ?? "");
    setTextFont(validation.family ?? "custom");
  }, []);

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0]!;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="h-[86vh] max-h-[86vh] w-[min(1120px,94vw)] max-w-[1120px] overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>Parametres</DialogTitle>
          <DialogDescription>Une seule fenetre pour regler projection, ecrans, interface et donnees.</DialogDescription>
        </DialogHeader>
        <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className="border-r border-border bg-bg-surface/70 px-3 py-4">
            <div className="px-3 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Preferences</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Reglages frequents visibles, options avancees ensuite.
              </p>
            </div>
            <div className="space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                    )}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{tab.label}</p>
                      <p className="mt-1 text-xs leading-relaxed">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{activeTabMeta.label}</p>
                <h2 className="mt-1 text-xl font-semibold text-text-primary">{activeTabMeta.description}</h2>
              </div>
              {activeTab === "projection" && (
                <>
                  <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-text-primary">Presets rapides</h3>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">Commencez par une base saine, puis ajustez seulement ce qui compte.</p>
                      </div>
                      <Button size="sm" onClick={() => void handleApplyAppearance()}>Appliquer</Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {PROJECTION_PRESETS.map((preset) => (
                        <button key={preset.id} type="button" className="rounded-2xl border border-border bg-bg-base px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5" onClick={() => applyPreset(preset)}>
                          <p className="text-sm font-semibold text-text-primary">{preset.label}</p>
                          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-4">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">Fond et contraste</h3>
                      <p className="mt-1 text-sm text-text-secondary">Choisissez un rendu simple et lisible avant les options avancees.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([["SOLID", "Uni"], ["GRADIENT_LINEAR", "Degrade lineaire"], ["GRADIENT_RADIAL", "Degrade radial"]] as Array<[CpBackgroundFillMode, string]>).map(([mode, label]) => (
                        <button key={mode} type="button" className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", bgMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-bg-elevated")} onClick={() => setBgMode(mode)}>{label}</button>
                      ))}
                    </div>
                    {bgMode === "SOLID" ? (
                      <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                        <label className="text-sm font-medium text-text-secondary">Couleur principale</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={bg} onChange={(event) => setBg(event.target.value)} aria-label="Couleur du fond" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" />
                          <span className="rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-muted">{bg}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-border bg-bg-base px-4 py-3"><label className="text-sm font-medium text-text-secondary">Couleur de depart</label><div className="mt-2 flex items-center gap-3"><input type="color" value={bgFrom} onChange={(event) => setBgFrom(event.target.value)} aria-label="Couleur de depart" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" /><span className="text-sm text-text-muted">{bgFrom}</span></div></div>
                          <div className="rounded-xl border border-border bg-bg-base px-4 py-3"><label className="text-sm font-medium text-text-secondary">Couleur d'arrivee</label><div className="mt-2 flex items-center gap-3"><input type="color" value={bgTo} onChange={(event) => setBgTo(event.target.value)} aria-label="Couleur d'arrivee" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" /><span className="text-sm text-text-muted">{bgTo}</span></div></div>
                        </div>
                        {bgMode === "GRADIENT_LINEAR" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between"><label className="text-sm font-medium text-text-secondary">Angle du degrade</label><span className="text-sm text-text-muted">{bgAngle} deg</span></div>
                            <input type="range" min={0} max={360} step={15} value={bgAngle} onChange={(event) => setBgAngle(Number(event.target.value))} aria-label="Angle du degrade" className="w-full accent-primary" />
                          </div>
                        )}
                      </>
                    )}
                    <details className="rounded-2xl border border-border bg-bg-base px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">Options avancees du fond</summary>
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => void handlePickBgImage()}><Upload className="h-4 w-4" />Choisir une image</Button>
                          {bgImage && (
                            <>
                              <span className="max-w-[260px] truncate text-sm text-text-secondary">{bgImage.split(/[\\/]/).pop()}</span>
                              <Button variant="ghost" size="sm" className="gap-2 text-text-secondary" onClick={() => setBgImage("")}><X className="h-4 w-4" />Retirer</Button>
                            </>
                          )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-border bg-bg-surface px-4 py-3">
                            <p className="text-sm font-semibold text-text-primary">Couleur du texte</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {([["SOLID", "Uni"], ["GRADIENT", "Degrade"]] as Array<[CpForegroundFillMode, string]>).map(([mode, label]) => (
                                <button key={mode} type="button" className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", fgMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-bg-elevated")} onClick={() => setFgMode(mode)}>{label}</button>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3">
                              <input type="color" value={fg} onChange={(event) => setFg(event.target.value)} aria-label="Couleur du texte" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" />
                              {fgMode === "GRADIENT" && (
                                <>
                                  <input type="color" value={fgFrom} onChange={(event) => setFgFrom(event.target.value)} aria-label="Couleur de debut du texte" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" />
                                  <input type="color" value={fgTo} onChange={(event) => setFgTo(event.target.value)} aria-label="Couleur de fin du texte" className="h-11 w-14 rounded-xl border border-border bg-transparent p-1" />
                                </>
                              )}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-bg-surface px-4 py-3">
                            <div className="flex items-center justify-between"><label className="text-sm font-medium text-text-secondary">Taille du titre</label><span className="text-sm text-text-muted">{Math.round(titleTextScale * 100)}%</span></div>
                            <input type="range" min={0.5} max={5} step={0.05} value={titleTextScale} onChange={(event) => setTitleTextScale(Number(event.target.value))} aria-label="Taille du titre" className="mt-2 w-full accent-primary" />
                          </div>
                        </div>
                      </div>
                    </details>
                  </section>
                  <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-4">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">Typographie et logo</h3>
                      <p className="mt-1 text-sm text-text-secondary">Les reglages frequents restent visibles, le reste descend dans des panneaux.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[{ value: "system-ui", label: "Systeme" }, { value: "Georgia, serif", label: "Serif" }, { value: "Arial, sans-serif", label: "Sans" }].map((fontOption) => (
                        <button key={fontOption.value} type="button" className={cn("rounded-xl border px-4 py-3 text-left transition-colors", textFont === fontOption.value && !textFontPath ? "border-primary bg-primary/10 text-primary" : "border-border bg-bg-base text-text-secondary hover:bg-bg-elevated")} onClick={() => { setTextFont(fontOption.value); setTextFontPath(""); setTextFontLabel(""); }}>
                          <p className="text-sm font-semibold">{fontOption.label}</p>
                          <p className="mt-1 text-sm">{fontOption.value}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => void handlePickFont()}><Type className="h-4 w-4" />Police personnalisee</Button>
                      {textFontPath && (
                        <>
                          <span className="max-w-[260px] truncate text-sm text-text-secondary">{textFontLabel}</span>
                          <Button variant="ghost" size="sm" className="gap-2 text-text-secondary" onClick={() => { setTextFont("system-ui"); setTextFontPath(""); setTextFontLabel(""); }}><X className="h-4 w-4" />Retirer</Button>
                        </>
                      )}
                    </div>
                    <div className="space-y-3 rounded-xl border border-border bg-bg-base px-4 py-3">
                      <div className="flex items-center justify-between"><label className="text-sm font-medium text-text-secondary">Taille du corps</label><span className="text-sm text-text-muted">{Math.round(textScale * 100)}%</span></div>
                      <input type="range" min={0.5} max={5} step={0.05} value={textScale} onChange={(event) => setTextScale(Number(event.target.value))} aria-label="Taille du corps" className="w-full accent-primary" />
                    </div>
                    <details className="rounded-2xl border border-border bg-bg-base px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">Reglages avances du logo</summary>
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => void handlePickLogo()}><Upload className="h-4 w-4" />{logoPath ? "Changer le logo" : "Choisir un logo"}</Button>
                          {logoPath && (
                            <>
                              <span className="max-w-[260px] truncate text-sm text-text-secondary">{logoPath.split(/[\\/]/).pop()}</span>
                              <Button variant="ghost" size="sm" className="gap-2 text-text-secondary" onClick={() => void handleClearLogo()}><X className="h-4 w-4" />Supprimer</Button>
                            </>
                          )}
                        </div>
                        {logoPath && (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-border bg-bg-surface px-4 py-3"><div className="flex items-center justify-between"><label className="text-sm font-medium text-text-secondary">Opacite</label><span className="text-sm text-text-muted">{logoOpacity}%</span></div><input type="range" min={10} max={100} step={5} value={logoOpacity} onChange={(event) => setLogoOpacity(Number(event.target.value))} aria-label="Opacite du logo" className="mt-2 w-full accent-primary" /></div>
                              <div className="rounded-xl border border-border bg-bg-surface px-4 py-3"><div className="flex items-center justify-between"><label className="text-sm font-medium text-text-secondary">Taille</label><span className="text-sm text-text-muted">{logoScale}%</span></div><input type="range" min={25} max={400} step={5} value={logoScale} onChange={(event) => setLogoScale(Number(event.target.value))} aria-label="Taille du logo" className="mt-2 w-full accent-primary" /></div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-text-secondary">Position</label>
                              <div className="flex flex-wrap gap-2">
                                {([["top-left", "Haut gauche"], ["top-right", "Haut droite"], ["center", "Centre"], ["bottom-left", "Bas gauche"], ["bottom-right", "Bas droite"]] as Array<[CpLogoPosition, string]>).map(([position, label]) => (
                                  <button key={position} type="button" className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", logoPosition === position ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-bg-elevated")} onClick={() => setLogoPosition(position)}>{label}</button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </details>
                  </section>
                </>
              )}
              {activeTab === "screens" && (
                <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-4">
                  {screensLoading ? (
                    <p className="text-sm text-text-muted">Chargement des ecrans...</p>
                  ) : screens.length === 0 ? (
                    <p className="text-sm text-text-muted">Aucun ecran disponible.</p>
                  ) : (
                    screens.map((screen) => (
                      <div key={screen.key} className="rounded-2xl border border-border bg-bg-base p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-text-primary">Ecran {screen.key}</p>
                            <p className="mt-1 text-sm text-text-secondary">{screen.isOpen ? "Projection ouverte" : "Projection fermee"}</p>
                          </div>
                          <Button variant={screen.isOpen ? "outline" : "default"} size="sm" onClick={() => void handleToggleScreen(screen.key, screen.isOpen)}>
                            {screen.isOpen ? "Fermer" : "Ouvrir"}
                          </Button>
                        </div>
                        {screen.key !== "A" && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", screen.mirror.kind === "FREE" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-bg-elevated")} onClick={() => void handleSetMirror(screen.key, { kind: "FREE" })}>Independant</button>
                            <button type="button" className={cn("rounded-xl border px-3 py-2 text-sm font-medium transition-colors", screen.mirror.kind === "MIRROR" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-bg-elevated")} onClick={() => void handleSetMirror(screen.key, { kind: "MIRROR", from: "A" })}>Miroir de A</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </section>
              )}
              {activeTab === "interface" && (
                <>
                  <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-4">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">Theme de l'application</h3>
                      <p className="mt-1 text-sm text-text-secondary">Choisissez le contraste general du poste operateur.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <button type="button" className={cn("rounded-2xl border px-4 py-5 text-left transition-colors", theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border bg-bg-base text-text-secondary hover:bg-bg-elevated")} onClick={() => void handleSetTheme("light")}><Sun className="h-5 w-5" /><p className="mt-3 text-base font-semibold">Clair</p><p className="mt-1 text-sm">Palette lumineuse pour les postes bien eclaires.</p></button>
                      <button type="button" className={cn("rounded-2xl border px-4 py-5 text-left transition-colors", theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border bg-bg-base text-text-secondary hover:bg-bg-elevated")} onClick={() => void handleSetTheme("dark")}><Moon className="h-5 w-5" /><p className="mt-3 text-base font-semibold">Sombre</p><p className="mt-1 text-sm">Meilleur confort visuel dans une regie plus obscure.</p></button>
                    </div>
                  </section>
                  <section className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-bg-surface p-4"><p className="text-sm font-semibold text-text-primary">Lisibilite</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">Les zones critiques restent au-dessus de 12 px et gardent des contrastes marques.</p></div>
                    <div className="rounded-2xl border border-border bg-bg-surface p-4"><p className="text-sm font-semibold text-text-primary">Raccourcis</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">La fenetre de raccourcis garde sa capture clavier avec des espacements et etats plus coherents.</p></div>
                  </section>
                </>
              )}
              {activeTab === "data" && (
                <section className="space-y-4 rounded-2xl border border-border bg-bg-surface p-4">
                  <div className="rounded-2xl border border-border bg-bg-base p-4">
                    <p className="text-base font-semibold text-text-primary">Exporter toutes les donnees</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">Sauvegarde chants et plans dans un seul fichier JSON.</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void handleExportAll()} disabled={exporting}><Download className="h-4 w-4" />{exporting ? "Export en cours..." : "Exporter"}</Button>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-base p-4">
                    <p className="text-base font-semibold text-text-primary">Importer une sauvegarde</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">Fusionne les donnees d'un export avec la bibliotheque existante.</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void handleImportAll()} disabled={importing}><Upload className="h-4 w-4" />{importing ? "Import en cours..." : "Importer"}</Button>
                  </div>
                </section>
              )}
            </div>
          </div>
          <aside className="border-l border-border bg-bg-surface/70 px-5 py-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Apercu projection</p>
                <h3 className="mt-1 text-base font-semibold text-text-primary">Controle permanent</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Le rendu projetable reste visible pendant tout le reglage.
                </p>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-border px-6 py-8 shadow-sm" style={previewBackgroundStyle}>
                <p className="max-w-[220px] font-semibold leading-snug" style={{ ...previewTextStyle, fontSize: `${Math.round(13 * titleTextScale)}px` }}>
                  Titre du slide
                </p>
                <p className="mt-6 max-w-[220px] leading-relaxed" style={previewTextStyle}>
                  Apercu du texte projete pour verifier contraste, taille et respiration.
                </p>
                {logoPath && (
                  <img
                    src={`file://${logoPath}`}
                    alt=""
                    aria-hidden
                    className={cn("pointer-events-none absolute object-contain", getLogoPreviewPositionClass(logoPosition))}
                    style={{ maxWidth: `${logoScale / 2}%`, maxHeight: `${logoScale / 2}%`, opacity: logoOpacity / 100 }}
                  />
                )}
              </div>
              <div className="space-y-3 rounded-2xl border border-border bg-bg-base p-4">
                <p className="text-sm font-semibold text-text-primary">Resume actif</p>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div className="flex items-center justify-between gap-3"><span>Theme</span><span className="font-medium text-text-primary">{theme === "dark" ? "Sombre" : "Clair"}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Corps</span><span className="font-medium text-text-primary">{Math.round(textScale * 100)}%</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Titre</span><span className="font-medium text-text-primary">{Math.round(titleTextScale * 100)}%</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Police</span><span className="max-w-[150px] truncate font-medium text-text-primary">{textFontLabel || textFont}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Logo</span><span className="font-medium text-text-primary">{logoPath ? "Actif" : "Inactif"}</span></div>
                </div>
              </div>
              {activeTab === "projection" && (
                <Button className="w-full" onClick={() => void handleApplyAppearance()}>
                  Appliquer la projection
                </Button>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
