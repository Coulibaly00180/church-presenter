import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type MediaTabProps = {
  planId: string | null;
};

export function MediaTab({ planId }: MediaTabProps) {
  const [mediaFiles, setMediaFiles] = useState<CpMediaFile[]>([]);

  const loadMedia = async () => {
    const result = await window.cp.files.listMedia();
    if (result.ok) setMediaFiles(result.files);
  };

  useEffect(() => { loadMedia(); }, []);

  const pickMedia = async () => {
    const result = await window.cp.files.pickMedia();
    if (result?.ok) {
      await loadMedia();
      toast.success("Fichier importe.");
    }
  };

  const addToPlan = async (file: CpMediaFile) => {
    if (!planId) { toast.error("Selectionnez un plan d'abord."); return; }
    const isPdf = file.path.toLowerCase().endsWith(".pdf");
    await window.cp.plans.addItem({
      planId,
      kind: isPdf ? "ANNOUNCEMENT_PDF" : "ANNOUNCEMENT_IMAGE",
      title: file.name,
      mediaPath: file.path,
    });
    toast.success("Media ajoute au plan.");
  };

  const deleteMedia = async (file: CpMediaFile) => {
    await window.cp.files.deleteMedia({ path: file.path });
    await loadMedia();
    toast.success("Fichier supprime.");
  };

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickMedia}>
        <Upload className="h-3 w-3 mr-1" /> Importer un fichier
      </Button>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1">
          {mediaFiles.map((file) => (
            <div key={file.path} className="flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs bg-card">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => addToPlan(file)}>
                <Plus className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteMedia(file)}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
          {mediaFiles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun fichier media.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
