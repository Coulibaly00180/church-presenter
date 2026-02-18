import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";

const PROJECTION_FONT_OPTIONS = [
  { label: "System UI", value: "system-ui" },
  { label: "Space Grotesk", value: "\"Space Grotesk\", system-ui, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "\"Trebuchet MS\", sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "\"Times New Roman\", Times, serif" },
] as const;

function fontFamilyFromFileName(fileName: string) {
  return fileName.replace(/\.(ttf|otf)$/i, "").trim() || "CustomFont";
}

function toFileUrl(p?: string) {
  if (!p) return "";
  if (p.startsWith("file://") || p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  const [pathOnly, frag] = p.split("#");
  const base =
    pathOnly.startsWith("\\\\")
      ? `file:${pathOnly.replace(/\\/g, "/")}`
      : `file:///${pathOnly.replace(/\\/g, "/")}`;
  return frag ? `${base}#${frag}` : base;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ProjectionSettings({ open, onOpenChange }: Props) {
  const [bg, setBg] = useState("#050505");
  const [bgMode, setBgMode] = useState<CpBackgroundFillMode>("SOLID");
  const [bgGradientFrom, setBgGradientFrom] = useState("#2563eb");
  const [bgGradientTo, setBgGradientTo] = useState("#7c3aed");
  const [bgGradientAngle, setBgGradientAngle] = useState(135);
  const [fg, setFg] = useState("#ffffff");
  const [fgMode, setFgMode] = useState<CpForegroundFillMode>("SOLID");
  const [fgGradientFrom, setFgGradientFrom] = useState("#ffffff");
  const [fgGradientTo, setFgGradientTo] = useState("#93c5fd");
  const [scale, setScale] = useState(1);
  const [textFont, setTextFont] = useState("system-ui");
  const [textFontPath, setTextFontPath] = useState("");
  const [bgImage, setBgImage] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [imageFiles, setImageFiles] = useState<CpMediaFile[]>([]);
  const [fontFiles, setFontFiles] = useState<CpMediaFile[]>([]);

  const loadImages = async () => {
    const media = await window.cp.files.listMedia();
    if (!media.ok) return;
    setImageFiles(media.files.filter((f) => f.kind === "IMAGE"));
    setFontFiles(media.files.filter((f) => f.kind === "FONT"));
  };

  useEffect(() => {
    if (!open) return;
    window.cp.projection.getState().then((s) => {
      setBg(s.background || "#050505");
      setBgMode(s.backgroundMode || "SOLID");
      setBgGradientFrom(s.backgroundGradientFrom || "#2563eb");
      setBgGradientTo(s.backgroundGradientTo || "#7c3aed");
      setBgGradientAngle(s.backgroundGradientAngle ?? 135);
      setFg(s.foreground || "#ffffff");
      setFgMode(s.foregroundMode || "SOLID");
      setFgGradientFrom(s.foregroundGradientFrom || "#ffffff");
      setFgGradientTo(s.foregroundGradientTo || "#93c5fd");
      setScale(s.textScale || 1);
      setTextFont(s.textFont || "system-ui");
      setTextFontPath(s.textFontPath || "");
      setBgImage(s.backgroundImage || "");
      setLogoPath(s.logoPath || "");
    });
    void loadImages();
  }, [open]);

  const apply = (patch: {
    background?: string;
    backgroundMode?: CpBackgroundFillMode;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientAngle?: number;
    backgroundImage?: string;
    logoPath?: string;
    foreground?: string;
    foregroundMode?: CpForegroundFillMode;
    foregroundGradientFrom?: string;
    foregroundGradientTo?: string;
    textScale?: number;
    textFont?: string;
    textFontPath?: string;
  }) => {
    window.cp.projection.setAppearance(patch);
  };

  const pickImage = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.mediaType === "IMAGE" && "path" in result) {
      setBgImage(result.path);
      apply({ backgroundImage: result.path });
      await loadImages();
    }
  };

  const pickLogo = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && result.mediaType === "IMAGE" && "path" in result) {
      setLogoPath(result.path);
      apply({ logoPath: result.path });
      await loadImages();
    }
  };

  const clearImage = () => {
    setBgImage("");
    apply({ backgroundImage: "" });
  };

  const clearLogo = () => {
    setLogoPath("");
    apply({ logoPath: "" });
  };

  const pickFont = async () => {
    const result = await window.cp.files.pickFont();
    if (result.ok && "path" in result) {
      const guessedFamily = fontFamilyFromFileName(result.path.split(/[\\/]/).pop() || "");
      setTextFont(guessedFamily);
      setTextFontPath(result.path);
      apply({ textFont: guessedFamily, textFontPath: result.path });
      await loadImages();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,760px)] max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Apparence projection</DialogTitle>
          <DialogDescription>Modifier les couleurs, la taille du texte et l'image de fond.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Background color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mode fond</Label>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={bgMode}
                onChange={(e) => {
                  const next = e.target.value as CpBackgroundFillMode;
                  setBgMode(next);
                  apply({ backgroundMode: next });
                }}
              >
                <option value="SOLID">Couleur unie</option>
                <option value="GRADIENT_LINEAR">Degrade lineaire</option>
                <option value="GRADIENT_RADIAL">Degrade radial</option>
              </select>
            </div>
            {bgMode === "SOLID" ? (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Couleur de fond</Label>
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => { setBg(e.target.value); apply({ background: e.target.value }); }}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Couleur A</Label>
                  <input
                    type="color"
                    value={bgGradientFrom}
                    onChange={(e) => {
                      setBgGradientFrom(e.target.value);
                      apply({ backgroundGradientFrom: e.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Couleur B</Label>
                  <input
                    type="color"
                    value={bgGradientTo}
                    onChange={(e) => {
                      setBgGradientTo(e.target.value);
                      apply({ backgroundGradientTo: e.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                {bgMode === "GRADIENT_LINEAR" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Angle</Label>
                      <span className="text-xs text-muted-foreground font-mono">{bgGradientAngle}deg</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={bgGradientAngle}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setBgGradientAngle(v);
                        apply({ backgroundGradientAngle: v });
                      }}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Foreground color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mode texte</Label>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={fgMode}
                onChange={(e) => {
                  const next = e.target.value as CpForegroundFillMode;
                  setFgMode(next);
                  apply({ foregroundMode: next });
                }}
              >
                <option value="SOLID">Couleur unie</option>
                <option value="GRADIENT">Degrade</option>
              </select>
            </div>
            {fgMode === "SOLID" ? (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Couleur du texte</Label>
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => { setFg(e.target.value); apply({ foreground: e.target.value }); }}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Couleur A</Label>
                  <input
                    type="color"
                    value={fgGradientFrom}
                    onChange={(e) => {
                      setFgGradientFrom(e.target.value);
                      apply({ foregroundGradientFrom: e.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Couleur B</Label>
                  <input
                    type="color"
                    value={fgGradientTo}
                    onChange={(e) => {
                      setFgGradientTo(e.target.value);
                      apply({ foregroundGradientTo: e.target.value });
                    }}
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Text scale */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Taille du texte</Label>
              <span className="text-xs text-muted-foreground font-mono">{scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setScale(v);
                apply({ textScale: v });
              }}
              className="w-full accent-primary"
            />
          </div>

          {/* Font */}
          <div className="space-y-1.5">
            <Label className="text-xs">Police du texte</Label>
            <select
              className="h-8 w-full rounded border bg-background px-2 text-xs"
              value={textFont}
              onChange={(e) => {
                const next = e.target.value;
                setTextFont(next);
                setTextFontPath("");
                apply({ textFont: next, textFontPath: "" });
              }}
            >
              {PROJECTION_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Police personnalisée (.ttf/.otf)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="h-8 min-w-[220px] flex-1 rounded border bg-background px-2 text-xs"
                value={textFontPath}
                onChange={(e) => {
                  const path = e.target.value;
                  if (!path) {
                    setTextFontPath("");
                    return;
                  }
                  const file = fontFiles.find((f) => f.path === path);
                  const family = fontFamilyFromFileName(file?.name || path.split(/[\\/]/).pop() || "");
                  setTextFont(family);
                  setTextFontPath(path);
                  apply({ textFont: family, textFontPath: path });
                }}
              >
                <option value="">Aucune</option>
                {fontFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={pickFont}>
                <ImagePlus className="h-3 w-3 mr-1" /> Importer
              </Button>
              {textFontPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => {
                    setTextFontPath("");
                    apply({ textFontPath: "" });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Background image */}
          <div className="space-y-1.5">
            <Label className="text-xs">Image de fond</Label>
            <div className="flex items-center gap-2">
              {bgImage && (
                <img
                  src={toFileUrl(bgImage)}
                  alt=""
                  className="h-10 w-16 object-cover rounded border"
                />
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickImage}>
                <ImagePlus className="h-3 w-3 mr-1" /> Choisir...
              </Button>
              {bgImage && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearImage}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {!bgImage && (
              <p className="text-[10px] text-muted-foreground">Aucune image selectionnee</p>
            )}
          </div>

          {/* Logo image */}
          <div className="space-y-1.5">
            <Label className="text-xs">Logo (haut droite)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="h-7 min-w-[220px] flex-1 rounded-md border bg-background px-2 text-xs"
                value={logoPath}
                onChange={(e) => {
                  const value = e.target.value;
                  setLogoPath(value);
                  apply({ logoPath: value });
                }}
              >
                <option value="">Aucun logo</option>
                {imageFiles.map((file) => (
                  <option key={file.path} value={file.path}>{file.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadImages} title="Rafraichir">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickLogo}>
                <ImagePlus className="h-3 w-3 mr-1" /> Importer
              </Button>
              {logoPath && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearLogo}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Selectionnez un logo depuis le dossier medias (images) pour l'afficher en haut a droite.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
