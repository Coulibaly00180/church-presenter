import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Image, MessageSquare, Music2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SongsTab } from "./SongsTab";
import { BibleTab } from "./BibleTab";
import { AnnouncementsTab } from "./AnnouncementsTab";
import { MediaTab } from "./MediaTab";
import { TimerTab } from "./TimerTab";

const TABS = [
  { id: "songs", label: "Chants", icon: Music2 },
  { id: "bible", label: "Bible", icon: BookOpen },
  { id: "announcements", label: "Annonces", icon: MessageSquare },
  { id: "media", label: "Médias", icon: Image },
  { id: "timer", label: "Minuterie", icon: Timer },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SourcePanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("songs");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-r border-border bg-bg-surface w-10 shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed(false)}
          aria-label="Afficher le panneau sources"
          className="mb-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon-xs"
              className={cn("my-0.5", activeTab === tab.id && "bg-bg-elevated text-primary")}
              onClick={() => { setActiveTab(tab.id); setCollapsed(false); }}
              aria-label={tab.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-border bg-bg-surface shrink-0 overflow-hidden"
      style={{ width: "var(--source-panel-width)" }}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="flex flex-col h-full"
      >
        {/* Tab bar */}
        <div className="flex items-center border-b border-border px-2 py-1 gap-1">
          <TabsList className="flex-1 h-8 bg-transparent p-0 gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-7 px-2 rounded text-xs gap-1 data-[state=active]:bg-bg-elevated data-[state=active]:text-text-primary"
                  title={tab.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCollapsed(true)}
            aria-label="Réduire le panneau"
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab content */}
        <TabsContent value="songs" className="flex-1 overflow-hidden mt-0">
          <SongsTab />
        </TabsContent>
        <TabsContent value="bible" className="flex-1 overflow-hidden mt-0">
          <BibleTab />
        </TabsContent>
        <TabsContent value="announcements" className="flex-1 overflow-hidden mt-0">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="media" className="flex-1 overflow-hidden mt-0">
          <MediaTab />
        </TabsContent>
        <TabsContent value="timer" className="flex-1 overflow-hidden mt-0">
          <TimerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
