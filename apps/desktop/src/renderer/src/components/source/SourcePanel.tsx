import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Image, MessageSquare, Music2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BibleInspectorPreview } from "@/lib/workspaceInspector";
import { SongsTab } from "./SongsTab";
import { BibleTab } from "./BibleTab";
import { AnnouncementsTab } from "./AnnouncementsTab";
import { MediaTab } from "./MediaTab";
import { TimerTab } from "./TimerTab";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";

const TABS = [
  {
    id: "songs",
    label: "Chants",
    shortLabel: "Cha",
    description: "Bibliotheque, edition et favoris.",
    icon: Music2,
  },
  {
    id: "bible",
    label: "Bible",
    shortLabel: "Bib",
    description: "References rapides et parcours des textes.",
    icon: BookOpen,
  },
  {
    id: "announcements",
    label: "Annonces",
    shortLabel: "Ann",
    description: "Textes de culte et annonces simples.",
    icon: MessageSquare,
  },
  {
    id: "media",
    label: "Medias",
    shortLabel: "Med",
    description: "Images, PDF et videos de la mediatheque.",
    icon: Image,
  },
  {
    id: "timer",
    label: "Minuterie",
    shortLabel: "Min",
    description: "Compte a rebours pour les transitions.",
    icon: Timer,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SourcePanelProps {
  onSelectSong?: (id: string) => void;
  onInspectMedia?: (file: CpMediaFile) => void;
  onInspectBible?: (preview: BibleInspectorPreview | null) => void;
  inspectedSongId?: string | null;
  inspectedMediaPath?: string | null;
}

export function SourcePanel({
  onSelectSong,
  onInspectMedia,
  onInspectBible,
  inspectedSongId,
  inspectedMediaPath,
}: SourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("songs");
  const [songEditorOpen, setSongEditorOpen] = useState(false);

  const activeTabDef = TABS.find((tab) => tab.id === activeTab)!;

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={250}>
        <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-border bg-bg-surface px-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCollapsed(false)}
                aria-label="Afficher le panneau sources"
                className="h-9 w-9 rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Afficher le panneau</TooltipContent>
          </Tooltip>

          <div className="h-px w-full bg-border" />

          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-elevated hover:text-text-primary",
                    )}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCollapsed(false);
                    }}
                    aria-label={tab.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{tab.shortLabel}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex w-[var(--source-panel-width)] shrink-0 overflow-hidden border-r border-border bg-bg-surface">
        <div className="flex w-[128px] flex-col border-r border-border bg-bg-elevated/35 px-2 py-3">
          <div className="px-2 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Sources
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Ajouter, preparer et projeter.
            </p>
          </div>

          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                  )}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(true)}
              aria-label="Reduire le panneau sources"
              className="w-full justify-start gap-2 rounded-xl text-text-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              Reduire
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <activeTabDef.icon className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">{activeTabDef.label}</h2>
            </div>
            <p className="mt-1 text-xs text-text-muted">{activeTabDef.description}</p>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "songs" && (
              <SongsTab
                onCreateSong={() => setSongEditorOpen(true)}
                onSelectSong={onSelectSong}
                selectedSongId={inspectedSongId}
              />
            )}
            {activeTab === "bible" && <BibleTab onInspectPreview={onInspectBible} />}
            {activeTab === "announcements" && <AnnouncementsTab />}
            {activeTab === "media" && (
              <MediaTab
                onInspectFile={onInspectMedia}
                selectedFilePath={inspectedMediaPath}
              />
            )}
            {activeTab === "timer" && <TimerTab />}
          </div>
        </div>
      </div>

      <SongEditorDialog
        open={songEditorOpen}
        onClose={() => setSongEditorOpen(false)}
      />
    </TooltipProvider>
  );
}
