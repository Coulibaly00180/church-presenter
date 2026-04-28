import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScreenSelector } from "@/components/live/ScreenSelector";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { ensureReadyForFreeProjection } from "@/lib/liveProjection";
import { projectTextToScreen } from "@/projection/target";

interface QuickTextDialogProps {
  open: boolean;
  onClose: () => void;
}

export function QuickTextDialog({ open, onClose }: QuickTextDialogProps) {
  const { live } = useLive();
  const { addItem } = usePlan();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setTitle("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const handleProject = useCallback(async () => {
    if (!text.trim()) return;
    const currentLive = await ensureReadyForFreeProjection(live);
    if (!currentLive?.enabled) { toast.error("Mode Direct inactif"); return; }
    await projectTextToScreen({
      target: currentLive.target,
      lockedScreens: currentLive.lockedScreens,
      title: title.trim() || undefined,
      body: text.trim(),
    });
    toast.success("Texte projeté");
    onClose();
  }, [text, title, live, onClose]);

  const handleAdd = useCallback(async () => {
    if (!text.trim()) return;
    const item = await addItem({
      kind: "ANNOUNCEMENT_TEXT",
      title: title.trim() || "Texte libre",
      content: text.trim(),
    });
    if (item) {
      toast.success("Ajouté au plan");
      onClose();
    }
  }, [text, title, addItem, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      void handleProject();
    }
  }, [handleProject]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Texte libre</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <input
            type="text"
            placeholder="Titre (optionnel)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            ref={textareaRef}
            placeholder="Entrez votre texte ici…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {live?.enabled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Écran :</span>
              <ScreenSelector />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!text.trim()}
            onClick={() => void handleAdd()}
          >
            Ajouter au plan
          </Button>
          {live?.enabled && (
            <Button
              variant="default"
              size="sm"
              disabled={!text.trim()}
              onClick={() => void handleProject()}
            >
              ▶ Projeter (Ctrl+↵)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
