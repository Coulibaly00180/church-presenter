import { useCallback } from "react";
import { FileImage, FileText, FileVideo, Monitor, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { ensureReadyForFreeProjection } from "@/lib/liveProjection";
import { projectMediaToScreen } from "@/projection/target";

interface MediaDetailPanelProps {
  file: CpMediaFile;
  onClose: () => void;
}

export function MediaDetailPanel({ file, onClose }: MediaDetailPanelProps) {
  const { live } = useLive();
  const { addItem } = usePlan();

  const handleAdd = useCallback(async () => {
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
  }, [addItem, file]);

  const handleProject = useCallback(async () => {
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
  }, [file, live]);

  return (
    <div className="flex h-full flex-col bg-bg-base">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Media
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-text-primary">
            {file.name}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {file.kind === "IMAGE" ? "Image" : file.kind === "VIDEO" ? "Video" : "PDF"}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fermer l'inspecteur"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            {file.kind === "IMAGE" ? (
              <FileImage className="h-4 w-4 text-kind-media" />
            ) : file.kind === "VIDEO" ? (
              <FileVideo className="h-4 w-4 text-kind-media" />
            ) : (
              <FileText className="h-4 w-4 text-kind-announcement" />
            )}
            <span className="text-sm font-medium">{file.name}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-black/5">
            {file.kind === "IMAGE" && (
              <img
                src={`file://${file.path}`}
                alt={file.name}
                className="h-[260px] w-full object-contain bg-bg-elevated"
              />
            )}
            {file.kind === "PDF" && (
              <iframe
                src={`file://${file.path}`}
                title={file.name}
                className="h-[320px] w-full border-0 bg-white"
              />
            )}
            {file.kind === "VIDEO" && (
              <video
                src={`file://${file.path}`}
                controls
                className="h-[260px] w-full object-contain bg-black"
              />
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Actions
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2 rounded-xl" onClick={() => void handleProject()}>
                <Monitor className="h-4 w-4" />
                Projeter
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => void handleAdd()}
              >
                <Plus className="h-4 w-4" />
                Ajouter au plan
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-bg-elevated/40 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Fichier
            </p>
            <p className="mt-2 break-all text-sm text-text-secondary">{file.path}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
