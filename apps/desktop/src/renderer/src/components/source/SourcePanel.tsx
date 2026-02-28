import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Image, MessageSquare, Music2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SongsTab } from "./SongsTab";
import { BibleTab } from "./BibleTab";
import { AnnouncementsTab } from "./AnnouncementsTab";
import { MediaTab } from "./MediaTab";
import { TimerTab } from "./TimerTab";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";

const TABS = [
  { id: "songs", label: "Chants", icon: Music2 },
  { id: "bible", label: "Bible", icon: BookOpen },
  { id: "announcements", label: "Annonces", icon: MessageSquare },
  { id: "media", label: "Médias", icon: Image },
  { id: "timer", label: "Minuterie", icon: Timer },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SourcePanelProps {
  onSelectSong?: (id: string) => void;
}

export function SourcePanel({ onSelectSong }: SourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("songs");
  const [songEditorOpen, setSongEditorOpen] = useState(false);

  const activeTabDef = TABS.find((t) => t.id === activeTab)!;

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col items-center pt-2 pb-3 border-r border-border bg-bg-surface w-10 shrink-0 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setCollapsed(false)}
                aria-label="Afficher le panneau sources"
                className="mb-1"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Afficher le panneau</TooltipContent>
          </Tooltip>

          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "w-8 h-8",
                      activeTab === tab.id && "bg-primary/10 text-primary"
                    )}
                    onClick={() => { setActiveTab(tab.id); setCollapsed(false); }}
                    aria-label={tab.label}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
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
    <TooltipProvider delayDuration={300}>
      <div
        className="flex flex-col border-r border-border bg-bg-surface shrink-0 overflow-hidden w-[280px]"
      >
        {/* Icon-only tab bar */}
        <div className="flex items-center gap-0.5 border-b border-border px-2 h-10 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex flex-1 items-center justify-center h-7 rounded transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                    aria-label={tab.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}

          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setCollapsed(true)}
                aria-label="Réduire le panneau"
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Réduire</TooltipContent>
          </Tooltip>
        </div>

        {/* Active tab label */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-bg-elevated/40 shrink-0">
          <activeTabDef.icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {activeTabDef.label}
          </span>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "songs" && (
            <SongsTab
              onCreateSong={() => setSongEditorOpen(true)}
              onSelectSong={onSelectSong}
            />
          )}
          {activeTab === "bible" && <BibleTab />}
          {activeTab === "announcements" && <AnnouncementsTab />}
          {activeTab === "media" && <MediaTab />}
          {activeTab === "timer" && <TimerTab />}
        </div>
      </div>

      <SongEditorDialog
        open={songEditorOpen}
        onClose={() => setSongEditorOpen(false)}
      />
    </TooltipProvider>
  );
}
