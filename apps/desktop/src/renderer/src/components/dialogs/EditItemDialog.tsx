import { useCallback, useEffect, useState } from "react";
import { FileImage, FileVideo, Loader2, Music } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { parsePlanBackground } from "@/lib/projection";

interface EditItemDialogProps {
  item: CpPlanItem | null;
  open: boolean;
  onClose: () => void;
}

function parseMMSS(str: string): { minutes: number; seconds: number } {
  const parts = str.split(":");
  return {
    minutes: parseInt(parts[0] ?? "0", 10) || 0,
    seconds: parseInt(parts[1] ?? "0", 10) || 0,
  };
}

function formatMMSS(m: number, s: number): string {
  return `${String(Math.max(0, m)).padStart(2, "0")}:${String(Math.min(59, Math.max(0, s))).padStart(2, "0")}`;
}

type BgMode = "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE" | "VIDEO";

const BG_MODE_BUTTONS: { value: BgMode; label: string }[] = [
  { value: "SOLID", label: "Uni" },
  { value: "GRADIENT_LINEAR", label: "Dégr. lin." },
  { value: "GRADIENT_RADIAL", label: "Dégr. rad." },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Vidéo" },
];

export function EditItemDialog({ item, open, onClose }: EditItemDialogProps) {
  const { updateItem, updateSongBackground } = usePlan();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  // Background override state
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>("SOLID");
  const [bgColor, setBgColor] = useState("#050505");
  const [bgFrom, setBgFrom] = useState("#2563eb");
  const [bgTo, setBgTo] = useState("#7c3aed");
  const [bgAngle, setBgAngle] = useState(135);
  const [fgEnabled, setFgEnabled] = useState(false);
  const [fgColor, setFgColor] = useState("#ffffff");

  // Media background state
  const [bgMediaPath, setBgMediaPath] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<CpMediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const isTimer = item?.kind === "TIMER";
  const hasContent = item?.kind === "ANNOUNCEMENT_TEXT" || item?.kind === "VERSE_MANUAL";
  const isSongBlock = item?.kind === "SONG_BLOCK";

  // Load media files when image/video mode selected
  useEffect(() => {
    if (!bgEnabled || (bgMode !== "IMAGE" && bgMode !== "VIDEO")) return;
    setMediaLoading(true);
    window.cp.files.listMedia().then((result) => {
      if (result.ok) {
        const kind = bgMode === "IMAGE" ? "IMAGE" : "VIDEO";
        setMediaFiles(result.files.filter((f) => f.kind === kind));
      }
      setMediaLoading(false);
    }).catch(() => setMediaLoading(false));
  }, [bgEnabled, bgMode]);

  useEffect(() => {
    if (!item || !open) return;
    setTitle(item.title ?? "");
    setNotes(item.notes ?? "");
    if (isTimer && item.content) {
      const { minutes: m, seconds: s } = parseMMSS(item.content);
      setMinutes(m);
      setSeconds(s);
    } else {
      setContent(item.content ?? "");
    }
    // Parse existing backgroundConfig
    const bg = parsePlanBackground(item.backgroundConfig);
    if (bg) {
      setBgEnabled(true);
      if (bg.backgroundMediaType && bg.backgroundMedia) {
        setBgMode(bg.backgroundMediaType === "VIDEO" ? "VIDEO" : "IMAGE");
        setBgMediaPath(bg.backgroundMedia);
      } else {
        setBgMode((bg.backgroundMode as BgMode | undefined) ?? "SOLID");
        setBgMediaPath(null);
      }
      setBgColor(bg.background ?? "#050505");
      setBgFrom(bg.backgroundGradientFrom ?? "#2563eb");
      setBgTo(bg.backgroundGradientTo ?? "#7c3aed");
      setBgAngle(bg.backgroundGradientAngle ?? 135);
      if (bg.foreground) { setFgEnabled(true); setFgColor(bg.foreground); }
      else { setFgEnabled(false); setFgColor("#ffffff"); }
    } else {
      setBgEnabled(false);
      setBgMode("SOLID");
      setBgMediaPath(null);
      setBgColor("#050505");
      setBgFrom("#2563eb");
      setBgTo("#7c3aed");
      setBgAngle(135);
      setFgEnabled(false);
      setFgColor("#ffffff");
    }
  }, [item, open, isTimer]);

  const handleSave = useCallback(async () => {
    if (!item) return;
    setSaving(true);
    try {
      const newContent = isTimer
        ? formatMMSS(minutes, seconds)
        : hasContent
        ? content.trim()
        : undefined;

      let backgroundConfig: string | null = null;
      if (bgEnabled) {
        const bg: CpItemBackground = {};
        if (bgMode === "IMAGE" || bgMode === "VIDEO") {
          if (bgMediaPath) {
            bg.backgroundMedia = bgMediaPath;
            bg.backgroundMediaType = bgMode;
          }
        } else {
          bg.backgroundMode = bgMode;
          if (bgMode === "SOLID") bg.background = bgColor;
          else { bg.backgroundGradientFrom = bgFrom; bg.backgroundGradientTo = bgTo; bg.backgroundGradientAngle = bgAngle; }
        }
        if (fgEnabled) bg.foreground = fgColor;
        if (Object.keys(bg).length > 0) backgroundConfig = JSON.stringify(bg);
      }

      if (isSongBlock && item.refId) {
        // Notes/title update only for this item; background propagates to all blocks of the song
        await updateItem(item.id, {
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        await updateSongBackground(item.refId, backgroundConfig);
      } else {
        await updateItem(item.id, {
          title: title.trim() || undefined,
          ...(newContent !== undefined && { content: newContent }),
          notes: notes.trim() || undefined,
          backgroundConfig,
        });
      }
      toast.success("Élément mis à jour");
      onClose();
    } finally {
      setSaving(false);
    }
  }, [item, isTimer, hasContent, isSongBlock, minutes, seconds, content, title, notes, updateItem, updateSongBackground, onClose, bgEnabled, bgMode, bgColor, bgFrom, bgTo, bgAngle, fgEnabled, fgColor, bgMediaPath]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !hasContent) void handleSave();
  }, [handleSave, hasContent]);

  if (!item) return null;

  const dialogTitle =
    isTimer ? "Modifier la minuterie" :
    isSongBlock ? "Fond du chant" :
    hasContent ? "Modifier le contenu" :
    "Modifier l'élément";

  const totalSeconds = minutes * 60 + seconds;
  const isMediaMode = bgMode === "IMAGE" || bgMode === "VIDEO";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Titre de l'élément"
            />
          </div>

          {/* TIMER: duration picker */}
          {isTimer && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Durée</label>

              {/* Quick presets */}
              <div className="flex gap-1.5 flex-wrap">
                {[1, 5, 10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="px-2.5 py-1 rounded text-xs font-medium border border-border hover:bg-bg-elevated transition-colors"
                    onClick={() => { setMinutes(m); setSeconds(0); }}
                  >
                    {m} min
                  </button>
                ))}
              </div>

              {/* Manual inputs */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text-muted">Minutes</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                  />
                </div>
                <span className="text-lg font-bold text-text-secondary mt-4">:</span>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text-muted">Secondes</label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="text-center"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center justify-center py-2 rounded-md bg-bg-elevated">
                <span className="text-2xl font-bold tabular-nums text-text-primary">
                  {formatMMSS(minutes, seconds)}
                </span>
              </div>
            </div>
          )}

          {/* Text / verse: content textarea */}
          {hasContent && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Contenu</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Contenu…"
              />
            </div>
          )}

          {/* Notes privées régie (pour tous les types) */}
          <div className="space-y-1 pt-1 border-t border-border">
            <label className="text-xs font-medium text-text-muted">Notes de régie (privées)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-surface text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Notes visibles uniquement ici, non projetées…"
            />
          </div>

          {/* Background personnalisé */}
          <div className="space-y-2 pt-1 border-t border-border">
            {isSongBlock && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Music className="h-3 w-3 shrink-0" />
                <span>Ce fond s'applique à tous les blocs de ce chant dans le plan.</span>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bgEnabled}
                onChange={(e) => setBgEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-medium text-text-secondary">Fond personnalisé</span>
            </label>

            {bgEnabled && (
              <div className="space-y-2 pl-1">
                {/* Mode */}
                <div className="grid grid-cols-5 gap-1">
                  {BG_MODE_BUTTONS.map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setBgMode(btn.value)}
                      className={`px-1 py-1 rounded text-[10px] font-medium border transition-colors ${
                        bgMode === btn.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-bg-elevated"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Color inputs (for non-media modes) */}
                {!isMediaMode && bgMode === "SOLID" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted w-16 shrink-0">Couleur</label>
                    <input aria-label="Couleur de fond" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                    <span className="text-xs text-text-muted font-mono">{bgColor}</span>
                  </div>
                )}
                {!isMediaMode && bgMode !== "SOLID" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-16 shrink-0">Début</label>
                      <input aria-label="Couleur de début" type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                      <span className="text-xs text-text-muted font-mono">{bgFrom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-16 shrink-0">Fin</label>
                      <input aria-label="Couleur de fin" type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                      <span className="text-xs text-text-muted font-mono">{bgTo}</span>
                    </div>
                    {bgMode === "GRADIENT_LINEAR" && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted w-16 shrink-0">Angle</label>
                        <input
                          aria-label="Angle du dégradé"
                          type="range" min={0} max={360} value={bgAngle}
                          onChange={(e) => setBgAngle(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-text-muted w-8 text-right">{bgAngle}°</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview swatch (non-media modes) */}
                {!isMediaMode && (
                  <div
                    className="h-5 rounded border border-border"
                    style={{
                      background: bgMode === "SOLID"
                        ? bgColor
                        : bgMode === "GRADIENT_LINEAR"
                        ? `linear-gradient(${bgAngle}deg, ${bgFrom}, ${bgTo})`
                        : `radial-gradient(circle, ${bgFrom}, ${bgTo})`,
                    }}
                  />
                )}

                {/* Media file picker */}
                {isMediaMode && (
                  <div className="space-y-1">
                    {bgMediaPath && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30">
                        {bgMode === "IMAGE"
                          ? <FileImage className="h-3 w-3 shrink-0 text-primary" />
                          : <FileVideo className="h-3 w-3 shrink-0 text-primary" />}
                        <span className="text-xs text-primary truncate">
                          {bgMediaPath.split(/[\\/]/).pop()}
                        </span>
                      </div>
                    )}
                    {mediaLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                      </div>
                    ) : mediaFiles.length === 0 ? (
                      <p className="text-xs text-text-muted py-2 text-center">
                        Aucun fichier {bgMode === "IMAGE" ? "image" : "vidéo"} dans la médiathèque
                      </p>
                    ) : (
                      <ScrollArea className="h-28 border border-border rounded-md">
                        <div className="py-0.5">
                          {mediaFiles.map((f) => (
                            <button
                              key={f.path}
                              type="button"
                              onClick={() => setBgMediaPath(f.path)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors text-left",
                                bgMediaPath === f.path
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-bg-elevated text-text-secondary"
                              )}
                            >
                              {f.kind === "IMAGE"
                                ? <FileImage className="h-3 w-3 shrink-0" />
                                : <FileVideo className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {/* Foreground (text color) */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fgEnabled}
                    onChange={(e) => setFgEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-text-muted">Couleur texte personnalisée</span>
                </label>
                {fgEnabled && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted w-16 shrink-0">Texte</label>
                    <input aria-label="Couleur du texte" type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-7 w-12 rounded cursor-pointer border border-border" />
                    <span className="text-xs text-text-muted font-mono">{fgColor}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || (isTimer && totalSeconds <= 0)}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
