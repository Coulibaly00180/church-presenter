import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MediaPreviewDialogProps {
  file: CpMediaFile | null;
  onClose: () => void;
}

export function MediaPreviewDialog({ file, onClose }: MediaPreviewDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showClose={false} className="max-w-[92vw] w-[92vw] h-[90vh] p-0 flex flex-col gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <span className="text-sm font-medium text-text-primary truncate">
            {file?.name ?? ""}
          </span>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden bg-black/5">
          {file?.kind === "IMAGE" && (
            <img
              src={`file://${file.path}`}
              alt={file.name}
              className="w-full h-full object-contain"
            />
          )}
          {file?.kind === "PDF" && (
            <iframe
              src={`file://${file.path}`}
              title={file.name}
              className="w-full h-full border-0 bg-white"
            />
          )}
          {file?.kind === "VIDEO" && (
            <video
              src={`file://${file.path}`}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
