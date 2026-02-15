import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

type AnnouncementsTabProps = {
  planId: string | null;
};

export function AnnouncementsTab({ planId }: AnnouncementsTabProps) {
  const [title, setTitle] = useState("Annonce");
  const [content, setContent] = useState("");

  const addTextToPlan = async () => {
    if (!planId) { toast.error("Selectionnez un plan d'abord."); return; }
    if (!content.trim()) { toast.error("Ecrivez du contenu."); return; }
    await window.cp.plans.addItem({
      planId,
      kind: "ANNOUNCEMENT_TEXT",
      title: title.trim() || "Annonce",
      content: content.trim(),
    });
    toast.success("Annonce ajoutee au plan.");
    setContent("");
  };

  const importPdf = async () => {
    if (!planId) { toast.error("Selectionnez un plan d'abord."); return; }
    const result = await window.cp.files.pickMedia();
    if (!result?.ok || !result.path) return;
    const isPdf = result.path.toLowerCase().endsWith(".pdf");
    await window.cp.plans.addItem({
      planId,
      kind: isPdf ? "ANNOUNCEMENT_PDF" : "ANNOUNCEMENT_IMAGE",
      title: result.path.split(/[\\/]/).pop() || "Media",
      mediaPath: result.path,
    });
    toast.success("Media ajoute au plan.");
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" /> Annonce texte
      </h3>

      <Input
        className="h-7 text-xs"
        placeholder="Titre de l'annonce"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[100px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Contenu de l'annonce..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <Button size="sm" className="h-7 text-xs" onClick={addTextToPlan}>
        <Plus className="h-3 w-3 mr-1" /> Ajouter au plan
      </Button>

      <Separator />

      <h3 className="text-xs font-medium">PDF / Image</h3>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={importPdf}>
        Importer un fichier...
      </Button>
    </div>
  );
}
