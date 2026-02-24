import { BookOpen, Clock, FileImage, FileText, MessageSquare, Music2, StickyNote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: CpPlanItemKind) => void;
}

const ITEM_TYPES: Array<{
  kind: CpPlanItemKind;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorVar: string;
}> = [
  {
    kind: "SONG_BLOCK",
    label: "Chant",
    description: "Bloc de chant depuis la bibliothèque",
    icon: Music2,
    colorVar: "var(--kind-song)",
  },
  {
    kind: "BIBLE_VERSE",
    label: "Verset",
    description: "Verset ou passage biblique",
    icon: BookOpen,
    colorVar: "var(--kind-bible)",
  },
  {
    kind: "ANNOUNCEMENT_TEXT",
    label: "Annonce texte",
    description: "Texte libre projeté",
    icon: MessageSquare,
    colorVar: "var(--kind-announcement)",
  },
  {
    kind: "ANNOUNCEMENT_IMAGE",
    label: "Image",
    description: "Fichier image",
    icon: FileImage,
    colorVar: "var(--kind-media)",
  },
  {
    kind: "ANNOUNCEMENT_PDF",
    label: "PDF",
    description: "Présentation PDF",
    icon: FileText,
    colorVar: "var(--kind-media)",
  },
  {
    kind: "VERSE_MANUAL",
    label: "Verset manuel",
    description: "Verset saisi manuellement",
    icon: StickyNote,
    colorVar: "var(--kind-bible)",
  },
  {
    kind: "TIMER",
    label: "Minuterie",
    description: "Décompte affiché en projection",
    icon: Clock,
    colorVar: "var(--kind-timer)",
  },
];

export function AddItemDialog({ open, onClose, onSelect }: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un élément</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 py-2">
          {ITEM_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.kind}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border border-border",
                  "hover:bg-bg-elevated transition-colors text-center group"
                )}
                onClick={() => { onSelect(type.kind); onClose(); }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${type.colorVar}20`, color: type.colorVar }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-text-primary">{type.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
