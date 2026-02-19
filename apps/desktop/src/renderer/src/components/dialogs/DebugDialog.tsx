import React, { useEffect, useState } from "react";
import { Clipboard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function yesNo(value: boolean) {
  return value ? "YES" : "NO";
}

function mirrorLabel(mirror: ScreenMirrorMode) {
  return mirror.kind === "FREE" ? "FREE" : `MIRROR(${mirror.from})`;
}

export function DebugDialog({ open, onOpenChange }: Props) {
  const [diagnostics, setDiagnostics] = useState<CpDiagnosticsState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await window.cp.diagnostics.getState();
    if (!result.ok) {
      toast.error(result.error || "Unable to load diagnostics");
      setLoading(false);
      return;
    }
    setDiagnostics(result.diagnostics);
    setLoading(false);
  };

  const copyJson = async () => {
    if (!diagnostics) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast.success("Diagnostics copied to clipboard");
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,920px)] max-w-[920px]">
        <DialogHeader>
          <DialogTitle>Debug diagnostics</DialogTitle>
          <DialogDescription>Screens, media folders, and read/write permissions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load} disabled={loading}>
              <RefreshCw className="h-3 w-3 mr-1" /> {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyJson} disabled={!diagnostics}>
              <Clipboard className="h-3 w-3 mr-1" /> Copy JSON
            </Button>
          </div>

          {diagnostics ? (
            <>
              <div className="rounded border p-2 space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Generated:</span>{" "}
                  {new Date(diagnostics.generatedAt).toLocaleString()}
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">App version:</span> {diagnostics.appVersion}
                </p>
                <p className="text-xs truncate" title={diagnostics.userDataDir}>
                  <span className="text-muted-foreground">User data:</span> {diagnostics.userDataDir}
                </p>
                <p className="text-xs truncate" title={diagnostics.libraryDir}>
                  <span className="text-muted-foreground">Media library:</span> {diagnostics.libraryDir}
                </p>
              </div>

              <div className="rounded border p-2">
                <p className="text-xs font-medium mb-1.5">Screens</p>
                <div className="grid grid-cols-[56px_68px_120px_92px_100px_1fr] gap-1 text-[10px] font-medium text-muted-foreground">
                  <span>Screen</span>
                  <span>Open</span>
                  <span>Mirror</span>
                  <span>Mode</span>
                  <span>Current</span>
                  <span>Updated</span>
                </div>
                {diagnostics.screens.map((screen) => (
                  <div
                    key={screen.key}
                    className="grid grid-cols-[56px_68px_120px_92px_100px_1fr] gap-1 text-[11px] py-1 border-t border-border/40"
                  >
                    <span className="font-mono">{screen.key}</span>
                    <span>{yesNo(screen.isOpen)}</span>
                    <span className="font-mono">{mirrorLabel(screen.mirror)}</span>
                    <span>{screen.mode}</span>
                    <span>{screen.currentKind}</span>
                    <span>{new Date(screen.updatedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>

              <div className="rounded border p-2">
                <p className="text-xs font-medium mb-1.5">Folders</p>
                <div className="space-y-1.5">
                  {([
                    { key: "root", label: "root" },
                    { key: "images", label: "images" },
                    { key: "documents", label: "documents" },
                    { key: "fonts", label: "fonts" },
                  ] as const).map(({ key, label }) => {
                    const folder = diagnostics.folders[key];
                    return (
                      <div key={key} className="rounded border p-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] mb-1">
                          <Badge variant="outline" className="h-4 px-1 font-mono">
                            {label}
                          </Badge>
                          <span className="text-muted-foreground">files:</span>
                          <span className="font-mono">{folder.fileCount}</span>
                          <span className="text-muted-foreground">R:</span>
                          <span className="font-mono">{yesNo(folder.readable)}</span>
                          <span className="text-muted-foreground">W:</span>
                          <span className="font-mono">{yesNo(folder.writable)}</span>
                          <span className="text-muted-foreground">exists:</span>
                          <span className="font-mono">{yesNo(folder.exists)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate" title={folder.path}>
                          {folder.path}
                        </p>
                        {folder.error ? (
                          <p className="text-[10px] text-destructive mt-0.5 truncate" title={folder.error}>
                            {folder.error}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No diagnostics loaded.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
