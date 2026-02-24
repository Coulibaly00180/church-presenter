import { useCallback, useState } from "react";
import { MessageSquarePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";

export function AnnouncementsTab() {
  const { addItem } = usePlan();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  const handleAddText = useCallback(async () => {
    if (!text.trim()) return;
    const item = await addItem({
      kind: "ANNOUNCEMENT_TEXT",
      title: title.trim() || "Annonce",
      content: text.trim(),
    });
    if (item) {
      toast.success("Annonce ajoutée au plan");
      setText("");
      setTitle("");
    }
  }, [addItem, text, title]);

  const handleAddImage = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (!result.ok || "canceled" in result) return;
    const item = await addItem({
      kind: "ANNOUNCEMENT_IMAGE",
      title: result.path.split(/[\\/]/).pop() ?? "Image",
      mediaPath: result.path,
    });
    if (item) toast.success("Image ajoutée au plan");
  }, [addItem]);

  const handleAddPdf = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (!result.ok || "canceled" in result) return;
    const item = await addItem({
      kind: "ANNOUNCEMENT_PDF",
      title: result.path.split(/[\\/]/).pop() ?? "PDF",
      mediaPath: result.path,
    });
    if (item) toast.success("PDF ajouté au plan");
  }, [addItem]);

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Text announcement */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">Annonce texte</p>
        <input
          type="text"
          placeholder="Titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          placeholder="Texte de l'annonce…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          disabled={!text.trim()}
          onClick={() => void handleAddText()}
        >
          <Plus className="h-4 w-4" />
          Ajouter au plan
        </Button>
      </div>

      {/* Media */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">Médias</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => void handleAddImage()}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => void handleAddPdf()}
          >
            <MessageSquarePlus className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
