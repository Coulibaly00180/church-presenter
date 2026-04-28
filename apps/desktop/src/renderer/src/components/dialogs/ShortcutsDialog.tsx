import { useCallback, useEffect, useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SHORTCUT_DEFS,
  formatBinding,
  getBindings,
  setBindings,
  resetBindings,
  resetAll,
  type ShortcutAction,
  type KeyBinding,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  { label: "Navigation", actions: ["prev", "next"] },
  { label: "Écrans", actions: ["targetA", "targetB", "targetC"] },
  {
    label: "Affichage",
    actions: ["toggleBlack", "toggleWhite", "resume", "toggleProjection"],
  },
] as const;

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  // version counter force re-render après setBindings (cache niveau module)
  const [version, setVersion] = useState(0);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  // Annule la capture à la fermeture du dialog
  useEffect(() => {
    if (!open) setCapturing(null);
  }, [open]);

  // Écoute globale clavier pendant la capture
  useEffect(() => {
    if (!capturing) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore les touches modificatrices seules
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

      if (e.key === "Escape") {
        setCapturing(null);
        return;
      }

      const binding: KeyBinding = { key: e.key };
      if (e.ctrlKey) binding.ctrlKey = true;
      if (e.shiftKey) binding.shiftKey = true;

      setBindings(capturing, [binding]);
      toast.success("Raccourci mis à jour");
      setCapturing(null);
      setVersion((v) => v + 1);
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [capturing]);

  const handleReset = useCallback((action: ShortcutAction) => {
    resetBindings(action);
    setVersion((v) => v + 1);
    toast.success("Raccourci réinitialisé");
  }, []);

  const handleResetAll = useCallback(() => {
    resetAll();
    setVersion((v) => v + 1);
    toast.success("Tous les raccourcis réinitialisés");
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>

        {/* Bannière capture active */}
        {capturing && (
          <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm text-primary text-center animate-pulse">
            Appuyez sur une touche… (Échap pour annuler)
          </div>
        )}

        <div className="max-h-[58vh] overflow-y-auto py-1" key={version}>
          <div className="grid gap-4 md:grid-cols-2">
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={gi} className="rounded-2xl border border-border bg-bg-surface p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {SHORTCUT_DEFS.filter((def) =>
                  (group.actions as readonly string[]).includes(def.action)
                ).map((def) => {
                  const bindings = getBindings(def.action);
                  const isCapturing = capturing === def.action;

                  return (
                    <div
                      key={def.action}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-transparent px-2 py-2",
                        isCapturing && "bg-primary/5 ring-1 ring-primary/30"
                      )}
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                        {def.label}
                      </span>

                      {/* Affichage de la touche ou prompt capture */}
                      <div className="flex gap-1 items-center">
                        {isCapturing ? (
                          <span className="text-xs text-primary font-medium px-2">
                            En attente…
                          </span>
                        ) : (
                          bindings.slice(0, 2).map((b, bi) => (
                            <kbd
                              key={bi}
                              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-1 text-xs font-mono"
                            >
                              {formatBinding(b)}
                            </kbd>
                          ))
                        )}
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex shrink-0 gap-1">
                        {isCapturing ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setCapturing(null)}
                          >
                            Annuler
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setCapturing(def.action)}
                              aria-label={`Modifier : ${def.label}`}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleReset(def.action)}
                              aria-label={`Réinitialiser : ${def.label}`}
                              className="px-1.5 text-text-muted"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-text-muted">
            Actifs uniquement hors champs de texte
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleResetAll}
            className="gap-1 text-text-muted hover:text-danger"
          >
            <RotateCcw className="h-3 w-3" />
            Tout réinitialiser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
