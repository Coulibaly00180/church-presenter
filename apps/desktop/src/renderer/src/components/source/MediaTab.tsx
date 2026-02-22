import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, Trash2, Image as ImageIcon, FileText, FolderOpen, RefreshCw, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type MediaTabProps = {
  planId: string | null;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function MediaTab({ planId }: MediaTabProps) {
  const [mediaFiles, setMediaFiles] = useState<CpMediaFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [libraryDir, setLibraryDir] = useState<string>("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pdfPreviewImage, setPdfPreviewImage] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadMedia = async () => {
    const result = await window.cp.files.listMedia();
    if (!result.ok) {
      toast.error(result.error || "Impossible de charger les medias.");
      return;
    }
    setLibraryDir(result.rootDir);
    setMediaFiles(result.files);
    setSelectedPath((prev) => {
      if (result.files.length === 0) return null;
      if (prev && result.files.some((f) => f.path === prev)) return prev;
      return result.files[0].path;
    });
  };

  useEffect(() => { loadMedia(); }, []);

  const pickMedia = async () => {
    const result = await window.cp.files.pickMedia();
    if (result?.ok) {
      await loadMedia();
      setSelectedPath(result.path);
      toast.success("Fichier importe.");
      return;
    }
    if (result && "error" in result) toast.error(result.error || "Import media echoue.");
  };

  const chooseLibraryDir = async () => {
    const result = await window.cp.files.chooseLibraryDir();
    if (result.ok) {
      toast.success("Dossier par defaut mis a jour.");
      await loadMedia();
      return;
    }
    if ("error" in result) toast.error(result.error || "Impossible de definir le dossier.");
  };

  const addToPlan = async (file: CpMediaFile) => {
    if (!planId) { toast.error("Selectionnez un plan d'abord."); return; }
    if (file.kind === "DOCUMENT" || file.kind === "FONT") {
      toast.info("Ce document n'est pas projetable pour le moment.");
      return;
    }
    try {
      await window.cp.plans.addItem({
        planId,
        kind: file.kind === "PDF" ? "ANNOUNCEMENT_PDF" : "ANNOUNCEMENT_IMAGE",
        title: file.name,
        mediaPath: file.path,
      });
      toast.success("Media ajoute au plan.");
    } catch {
      toast.error("Impossible d'ajouter ce media au plan.");
    }
  };

  const deleteMedia = async (file: CpMediaFile) => {
    const result = await window.cp.files.deleteMedia({ path: file.path });
    if (!result.ok) {
      toast.error(result.error || "Suppression echouee.");
      return;
    }
    await loadMedia();
    toast.success("Fichier supprime.");
  };

  const startRename = (file: CpMediaFile) => {
    setRenamingPath(file.path);
    setRenameValue(file.name);
  };

  const commitRename = async () => {
    if (!renamingPath || !renameValue.trim()) { setRenamingPath(null); return; }
    const result = await window.cp.files.renameMedia({ path: renamingPath, name: renameValue.trim() });
    if (!result.ok) {
      toast.error("error" in result ? result.error : "Renommage echoue.");
    } else {
      await loadMedia();
    }
    setRenamingPath(null);
  };

  const selectedFile = mediaFiles.find((file) => file.path === selectedPath) ?? null;

  useEffect(() => {
    let cancelled = false;
    let imageUrlToRevoke: string | null = null;
    const loadPreview = async () => {
      setImagePreviewUrl(null);
      setPdfPreviewImage(null);
      setPdfPreviewError(null);
      setPdfPreviewLoading(false);
      if (!selectedFile) return;
      try {
        const readResult = await window.cp.files.readMedia({ path: selectedFile.path });
        if (!readResult.ok) {
          if (selectedFile.kind === "PDF") setPdfPreviewError(readResult.error || "Lecture PDF impossible.");
          return;
        }
        const bytes = base64ToUint8Array(readResult.base64);
        if (selectedFile.kind === "IMAGE") {
          const blobBytes = new Uint8Array(bytes.length);
          blobBytes.set(bytes);
          const blob = new Blob([blobBytes], { type: readResult.mimeType || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          imageUrlToRevoke = url;
          if (!cancelled) setImagePreviewUrl(url);
          return;
        }
        if (selectedFile.kind !== "PDF") return;

        setPdfPreviewLoading(true);
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(3, Math.max(1, 900 / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponible");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setPdfPreviewImage(canvas.toDataURL("image/png"));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (!cancelled) setPdfPreviewError(message);
      } finally {
        if (!cancelled) setPdfPreviewLoading(false);
      }
    };
    void loadPreview();
    return () => {
      cancelled = true;
      if (imageUrlToRevoke) URL.revokeObjectURL(imageUrlToRevoke);
    };
  }, [selectedFile?.path, selectedFile?.kind]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={pickMedia}>
          <Upload className="h-3 w-3 mr-1" /> Importer
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={chooseLibraryDir}>
          <FolderOpen className="h-3 w-3 mr-1" /> Dossier
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadMedia}>
          <RefreshCw className="h-3 w-3 mr-1" /> Scanner
        </Button>
      </div>

      {libraryDir && (
        <p className="text-[10px] text-muted-foreground truncate" title={libraryDir}>
          Dossier: {libraryDir}
        </p>
      )}

      {selectedFile && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium truncate" title={selectedFile.name}>
            Apercu: {selectedFile.name}
          </p>
          <div className="h-44 w-full rounded-md border bg-muted/20 overflow-hidden flex items-center justify-center">
            {selectedFile.kind === "IMAGE" ? (
              imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt={selectedFile.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground px-2 text-center">
                  <ImageIcon className="h-6 w-6" />
                  <p className="text-xs">Apercu image indisponible</p>
                </div>
              )
            ) : selectedFile.kind === "DOCUMENT" || selectedFile.kind === "FONT" ? (
              <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground px-2 text-center">
                <FileText className="h-6 w-6" />
                <p className="text-xs">{selectedFile.kind === "FONT" ? "Police detectee" : "Document detecte"}</p>
                <p className="text-[10px] opacity-80">Previsualisation non supportee</p>
              </div>
            ) : (
              pdfPreviewImage ? (
                <img
                  src={pdfPreviewImage}
                  alt={`${selectedFile.name} (PDF)`}
                  className="h-full w-full object-contain"
                />
              ) : pdfPreviewLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                  <FileText className="h-6 w-6" />
                  <p className="text-xs">Chargement du PDF...</p>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-muted-foreground px-2 text-center">
                  <FileText className="h-6 w-6" />
                  <p className="text-xs">Apercu PDF indisponible</p>
                  {pdfPreviewError ? <p className="text-[10px] opacity-80 truncate w-full">{pdfPreviewError}</p> : null}
                </div>
              )
            )}
          </div>
        </div>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1">
          {mediaFiles.map((file) => {
            const isRenaming = renamingPath === file.path;
            const kindLabel = file.kind === "PDF" ? "PDF" : file.kind === "IMAGE" ? "Image" : file.kind === "FONT" ? "Police" : "Document";
            const icon = file.kind === "PDF" || file.kind === "DOCUMENT" || file.kind === "FONT"
              ? <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;

            if (isRenaming) {
              return (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs bg-card",
                    selectedPath === file.path && "border-primary/50 bg-accent/40",
                  )}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      autoFocus
                      title="Nouveau nom du fichier"
                      placeholder="Nouveau nom..."
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); void commitRename(); }
                        if (e.key === "Escape") setRenamingPath(null);
                      }}
                      className="w-full h-5 text-xs rounded border border-primary bg-background px-1 focus:outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground">{kindLabel} - {file.folder}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => { void commitRename(); }}>
                    <Check className="h-2.5 w-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRenamingPath(null)}>
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              );
            }

            return (
              <div
                key={file.path}
                onClick={() => setSelectedPath(file.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPath(file.path);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs bg-card cursor-pointer",
                  selectedPath === file.path && "border-primary/50 bg-accent/40",
                )}
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{kindLabel} - {file.folder}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); startRename(file); }}>
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={file.kind === "DOCUMENT" || file.kind === "FONT"}
                  onClick={(e) => { e.stopPropagation(); addToPlan(file); }}
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteMedia(file); }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            );
          })}
          {mediaFiles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun fichier media.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
