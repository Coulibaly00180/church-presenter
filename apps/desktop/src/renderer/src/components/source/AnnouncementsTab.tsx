import { useCallback, useState } from "react";
import { FileImage, FileText, FileVideo, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const handleAddVideo = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (!result.ok || "canceled" in result) return;
    const item = await addItem({
      kind: "ANNOUNCEMENT_VIDEO",
      title: result.path.split(/[\\/]/).pop() ?? "Vidéo",
      mediaPath: result.path,
    });
    if (item) toast.success("Vidéo ajoutée au plan");
  }, [addItem]);

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Annonce texte</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Rédige une annonce rapide et ajoute-la directement au plan.
          </p>
        </div>
        <Input
          type="text"
          placeholder="Titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Titre de l'annonce"
        />
        <textarea
          placeholder="Texte de l'annonce…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="min-h-[120px] w-full resize-none rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Texte de l'annonce"
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
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Annonces médias</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Ajoute une image, un PDF ou une vidéo depuis la bibliothèque.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-1.5"
            onClick={() => void handleAddImage()}
          >
            <FileImage className="h-4 w-4" />
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-1.5"
            onClick={() => void handleAddPdf()}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-1.5"
            onClick={() => void handleAddVideo()}
          >
            <FileVideo className="h-4 w-4" />
            Vidéo
          </Button>
        </div>
      </section>
    </div>
  );
}
