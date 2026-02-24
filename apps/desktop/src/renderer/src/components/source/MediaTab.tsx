import { useCallback, useEffect, useState } from "react";
import { FileImage, FileText, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

export function MediaTab() {
  const { addItem } = usePlan();
  const [files, setFiles] = useState<CpMediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "IMAGE" | "PDF">("ALL");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.cp.files.listMedia();
      if (result.ok) setFiles(result.files);
      else toast.error("Impossible de charger les médias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleAdd = useCallback(async (file: CpMediaFile) => {
    const kind = file.kind === "IMAGE" ? "ANNOUNCEMENT_IMAGE" as const : "ANNOUNCEMENT_PDF" as const;
    const item = await addItem({
      kind,
      title: file.name,
      mediaPath: file.path,
    });
    if (item) toast.success("Ajouté au plan");
  }, [addItem]);

  const filtered = filter === "ALL" ? files : files.filter((f) => f.kind === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Filter + refresh */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        {(["ALL", "IMAGE", "PDF"] as const).map((f) => (
          <button
            key={f}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-fg"
                : "text-text-secondary hover:bg-bg-elevated"
            )}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "Tous" : f}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          onClick={() => void loadFiles()}
          aria-label="Actualiser"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-muted">
            <FileImage className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aucun média</p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((file) => (
              <div
                key={file.path}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors"
              >
                {file.kind === "IMAGE" ? (
                  <FileImage className="h-4 w-4 shrink-0 text-kind-media" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-kind-announcement" />
                )}
                <span className="flex-1 text-sm text-text-primary truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => void handleAdd(file)}
                  aria-label={`Ajouter ${file.name} au plan`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
