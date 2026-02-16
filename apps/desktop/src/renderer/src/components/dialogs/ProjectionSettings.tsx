import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2 } from "lucide-react";

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
  const [fg, setFg] = useState("#ffffff");
  const [scale, setScale] = useState(1);
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    if (!open) return;
    window.cp.projection.getState().then((s) => {
      setBg(s.background || "#050505");
      setFg(s.foreground || "#ffffff");
      setScale(s.textScale || 1);
      setBgImage(s.backgroundImage || "");
    });
  }, [open]);

  const apply = (patch: { background?: string; backgroundImage?: string; foreground?: string; textScale?: number }) => {
    window.cp.projection.setAppearance(patch);
  };

  const pickImage = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && "path" in result) {
      setBgImage(result.path);
      apply({ backgroundImage: result.path });
    }
  };

  const clearImage = () => {
    setBgImage("");
    apply({ backgroundImage: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apparence projection</DialogTitle>
          <DialogDescription>Modifier les couleurs, la taille du texte et l'image de fond.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Background color */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Couleur de fond</Label>
            <input
              type="color"
              value={bg}
              onChange={(e) => { setBg(e.target.value); apply({ background: e.target.value }); }}
              className="h-8 w-12 rounded border cursor-pointer"
            />
          </div>

          {/* Foreground color */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Couleur du texte</Label>
            <input
              type="color"
              value={fg}
              onChange={(e) => { setFg(e.target.value); apply({ foreground: e.target.value }); }}
              className="h-8 w-12 rounded border cursor-pointer"
            />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
