import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { ensureReadyForFreeProjection } from "@/lib/liveProjection";
import { cn } from "@/lib/utils";
import { projectMediaToScreen } from "@/projection/target";

type MediaFilter = "ALL" | "IMAGE" | "PDF" | "VIDEO";

interface MediaTabProps {
  onInspectFile?: (file: CpMediaFile) => void;
  selectedFilePath?: string | null;
}

export function MediaTab({ onInspectFile, selectedFilePath }: MediaTabProps) {
  const { live } = useLive();
  const { addItem } = usePlan();
  const [files, setFiles] = useState<CpMediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<MediaFilter>("ALL");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.cp.files.listMedia();
      if (result.ok) setFiles(result.files);
      else toast.error("Impossible de charger les medias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleAdd = useCallback(
    async (file: CpMediaFile) => {
      const kind =
        file.kind === "IMAGE"
          ? ("ANNOUNCEMENT_IMAGE" as const)
          : file.kind === "VIDEO"
            ? ("ANNOUNCEMENT_VIDEO" as const)
            : ("ANNOUNCEMENT_PDF" as const);
      const item = await addItem({
        kind,
        title: file.name,
        mediaPath: file.path,
      });
      if (item) toast.success("Ajoute au plan");
      else toast.error("Aucun plan ouvert");
    },
    [addItem],
  );

  const handleImport = useCallback(async () => {
    const result = await window.cp.files.pickMedia();
    if (!result.ok || !("path" in result)) return;
    await loadFiles();
    toast.success("Fichier importe dans la bibliotheque");
  }, [loadFiles]);

  const handleProject = useCallback(async (file: CpMediaFile) => {
    const mediaType: CpMediaType =
      file.kind === "IMAGE" ? "IMAGE" : file.kind === "VIDEO" ? "VIDEO" : "PDF";
    const currentLive = await ensureReadyForFreeProjection(live);
    if (currentLive?.enabled) {
      await projectMediaToScreen({
        target: currentLive.target,
        lockedScreens: currentLive.lockedScreens,
        title: file.name,
        mediaPath: file.path,
        mediaType,
      });
    } else {
      await window.cp.projection.setContentMedia({
        title: file.name,
        mediaPath: file.path,
        mediaType,
      });
    }
    toast.success("Media projete");
  }, [live]);

  const filtered =
    filter === "ALL"
      ? files.filter((file) => file.kind === "IMAGE" || file.kind === "PDF" || file.kind === "VIDEO")
      : files.filter((file) => file.kind === filter);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {(["ALL", "IMAGE", "PDF", "VIDEO"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              filter === value
                ? "bg-primary text-primary-fg"
                : "text-text-secondary hover:bg-bg-elevated",
            )}
            onClick={() => setFilter(value)}
          >
            {value === "ALL" ? "Tous" : value}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => void handleImport()}
            aria-label="Importer un media"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => void loadFiles()}
            aria-label="Actualiser la mediatheque"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-text-muted">
            <FileImage className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aucun media</p>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void handleImport()}>
              <Upload className="h-3.5 w-3.5" />
              Importer un fichier
            </Button>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((file) => (
              <div
                key={file.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 transition-colors",
                  selectedFilePath === file.path
                    ? "bg-primary/8 ring-1 ring-inset ring-primary/25"
                    : "hover:bg-bg-elevated",
                )}
              >
                {file.kind === "IMAGE" ? (
                  <FileImage className="h-4 w-4 shrink-0 text-kind-media" />
                ) : file.kind === "VIDEO" ? (
                  <FileVideo className="h-4 w-4 shrink-0 text-kind-media" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-kind-announcement" />
                )}

                <button
                  type="button"
                  className="flex-1 truncate text-left text-sm font-medium text-text-primary"
                  onClick={() => onInspectFile?.(file)}
                >
                  {file.name}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 rounded-lg text-text-secondary"
                    onClick={() => onInspectFile?.(file)}
                    aria-label={`Ouvrir le detail de ${file.name}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Apercu
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 rounded-lg text-text-secondary"
                    onClick={() => void handleProject(file)}
                    aria-label={`Projeter ${file.name}`}
                  >
                    <Monitor className="h-3 w-3" />
                    Projeter
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 rounded-lg text-text-secondary"
                    onClick={() => void handleAdd(file)}
                    aria-label={`Ajouter ${file.name} au plan`}
                  >
                    <Plus className="h-3 w-3" />
                    Plan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
