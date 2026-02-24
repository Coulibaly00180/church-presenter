import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SHORTCUT_DEFS } from "@/lib/shortcuts";
import { formatBinding, getBindings } from "@/lib/shortcuts";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    label: "Navigation",
    actions: ["prev", "next"],
  },
  {
    label: "Écrans",
    actions: ["targetA", "targetB", "targetC"],
  },
  {
    label: "Affichage",
    actions: ["toggleBlack", "toggleWhite", "resume", "toggleProjection"],
  },
] as const;

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={gi}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {SHORTCUT_DEFS.filter((def) =>
                  (group.actions as readonly string[]).includes(def.action)
                ).map((def) => {
                  const bindings = getBindings(def.action);
                  return (
                    <div key={def.action} className="flex items-center justify-between py-1">
                      <span className="text-sm text-text-primary">{def.label}</span>
                      <div className="flex gap-1">
                        {bindings.slice(0, 2).map((b, bi) => (
                          <kbd
                            key={bi}
                            className="px-2 py-0.5 text-xs rounded border border-border bg-bg-elevated font-mono"
                          >
                            {formatBinding(b)}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {gi < SHORTCUT_GROUPS.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted text-center pb-2">
          Actifs uniquement hors champs de texte
        </p>
      </DialogContent>
    </Dialog>
  );
}
