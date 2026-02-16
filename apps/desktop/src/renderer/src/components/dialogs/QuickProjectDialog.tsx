import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import { projectTextToScreen, projectMediaToScreen } from "@/projection/target";

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

export function QuickProjectDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [imagePath, setImagePath] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setImagePath("");
      setTimeout(() => textRef.current?.focus(), 50);
    }
  }, [open]);

  const getLiveTarget = async (): Promise<{ target: ScreenKey; lockedScreens: Partial<Record<ScreenKey, boolean>> }> => {
    const live = await window.cp.live?.get();
    return {
      target: live?.target ?? "A",
      lockedScreens: live?.lockedScreens ?? {},
    };
  };

  const projectText = async () => {
    if (!text.trim()) return;
    const { target, lockedScreens } = await getLiveTarget();
    await projectTextToScreen({ target, lockedScreens, body: text.trim() });
  };

  const projectImage = async () => {
    if (!imagePath) return;
    const { target, lockedScreens } = await getLiveTarget();
    await projectMediaToScreen({ target, lockedScreens, mediaPath: imagePath, mediaType: "IMAGE" });
  };

  const pickImage = async () => {
    const result = await window.cp.files.pickMedia();
    if (result.ok && "path" in result) {
      setImagePath(result.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      projectText();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Projection rapide</DialogTitle>
          <DialogDescription>Projeter un texte libre ou une image instantanement.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Free text */}
          <div className="space-y-1.5">
            <Label className="text-xs">Texte libre</Label>
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez votre message..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Ctrl+Entree pour projeter</span>
              <Button size="sm" className="h-7 text-xs" onClick={projectText} disabled={!text.trim()}>
                <Send className="h-3 w-3 mr-1" /> Projeter texte
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label className="text-xs">Image</Label>
            <div className="flex items-center gap-2">
              {imagePath && (
                <img
                  src={toFileUrl(imagePath)}
                  alt=""
                  className="h-12 w-20 object-cover rounded border"
                />
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickImage}>
                <ImagePlus className="h-3 w-3 mr-1" /> Choisir...
              </Button>
              {imagePath && (
                <>
                  <Button size="sm" className="h-7 text-xs" onClick={projectImage}>
                    <Send className="h-3 w-3 mr-1" /> Projeter
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setImagePath("")}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
            {!imagePath && (
              <p className="text-[10px] text-muted-foreground">Selectionnez une image a projeter</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
