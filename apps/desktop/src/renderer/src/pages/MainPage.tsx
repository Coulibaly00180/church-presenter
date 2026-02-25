import { useEffect, useState } from "react";
import { FileDown, Music, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { SourcePanel } from "@/components/source/SourcePanel";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";
import { Button } from "@/components/ui/button";

// ─── Onboarding overlay (US-001) ──────────────────────────────────────────────

function WelcomeScreen({ onDismiss }: { onDismiss: () => void }) {
  const [songEditorOpen, setSongEditorOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await window.cp.data.importAll({ mode: "MERGE" });
      if (result.ok) {
        toast.success(
          `Import terminé — ${result.counts.songs} chant${result.counts.songs !== 1 ? "s" : ""}, ${result.counts.plans} plan${result.counts.plans !== 1 ? "s" : ""}`,
        );
        onDismiss();
      } else if (!("canceled" in result)) {
        toast.error("Import échoué", { description: "error" in result ? result.error : undefined });
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-base">
      <div className="relative w-full max-w-md mx-auto px-8 py-12 text-center space-y-8">
        {/* Dismiss */}
        <button
          type="button"
          aria-label="Ignorer"
          className="absolute top-2 right-2 text-text-muted hover:text-text-primary transition-colors"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo / Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Bienvenue dans Church Presenter</h1>
            <p className="text-sm text-text-secondary mt-1.5">
              Gérez vos chants, plans de culte et projection en toute simplicité.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => setSongEditorOpen(true)}
          >
            <Music className="h-4 w-4" />
            Créer votre premier chant
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            size="lg"
            onClick={() => void handleImport()}
            disabled={importing}
          >
            <FileDown className="h-4 w-4" />
            {importing ? "Import en cours…" : "Importer des données existantes"}
          </Button>

          <button
            type="button"
            className="text-sm text-text-muted hover:text-text-primary transition-colors mt-1"
            onClick={onDismiss}
          >
            Commencer sans importer →
          </button>
        </div>

        {/* Feature hints */}
        <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-border">
          {[
            ["Chants", "Bibliothèque avec blocs verse/refrain"],
            ["Bible", "LSG 1910 intégré hors-ligne"],
            ["Projection", "Écrans A/B/C indépendants"],
          ].map(([title, desc]) => (
            <div key={title} className="space-y-0.5">
              <p className="text-xs font-semibold text-text-primary">{title}</p>
              <p className="text-[10px] text-text-muted leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <SongEditorDialog
        open={songEditorOpen}
        onClose={() => setSongEditorOpen(false)}
        onSaved={() => {
          setSongEditorOpen(false);
          onDismiss();
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MainPage() {
  // null = loading, true = show welcome, false = skip welcome
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    // Check first-launch: show welcome if no songs and no plans
    void Promise.all([
      window.cp.songs.list(),
      window.cp.plans.list(),
    ]).then(([songs, plans]) => {
      setShowWelcome(songs.length === 0 && plans.length === 0);
    });
  }, []);

  return (
    <AppShell>
      <div className="relative flex flex-1 overflow-hidden">
        <SourcePanel />
        <PlanEditor />
        {showWelcome && (
          <WelcomeScreen onDismiss={() => setShowWelcome(false)} />
        )}
      </div>
    </AppShell>
  );
}
