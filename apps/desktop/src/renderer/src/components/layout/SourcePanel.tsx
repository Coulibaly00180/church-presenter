import React, { useState } from "react";
import { Book, Music, Megaphone, Image, Calendar, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BibleTab } from "@/components/source/BibleTab";
import { SongsTab } from "@/components/source/SongsTab";
import { AnnouncementsTab } from "@/components/source/AnnouncementsTab";
import { MediaTab } from "@/components/source/MediaTab";
import { CalendarTab } from "@/components/source/CalendarTab";

type SourcePanelProps = {
  planId: string | null;
  onSelectPlan?: (id: string) => void;
};

export function SourcePanel({ planId, onSelectPlan }: SourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2 px-1 border-r bg-card gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(false)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Ouvrir le panneau</TooltipContent>
        </Tooltip>
        <div className="flex flex-col gap-1 mt-2">
          {[
            { icon: Book, label: "Bible", tab: "bible" },
            { icon: Music, label: "Chants", tab: "songs" },
            { icon: Megaphone, label: "Annonces", tab: "announcements" },
            { icon: Image, label: "Medias", tab: "media" },
            { icon: Calendar, label: "Calendrier", tab: "calendar" },
          ].map(({ icon: Icon, label, tab }) => (
            <Tooltip key={tab}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCollapsed(false)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r bg-card w-[340px] shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-sm font-medium">Sources</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(true)}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="bible" className="flex-1 flex flex-col min-h-0">
        {/* Tab triggers — compact, wrappable */}
        <TabsList className="mx-2 mt-2 shrink-0 flex flex-wrap h-auto gap-0.5 justify-start">
          <TabsTrigger value="bible" className="gap-1 text-xs px-2 py-1">
            <Book className="h-3 w-3" /> Bible
          </TabsTrigger>
          <TabsTrigger value="songs" className="gap-1 text-xs px-2 py-1">
            <Music className="h-3 w-3" /> Chants
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1 text-xs px-2 py-1">
            <Megaphone className="h-3 w-3" /> Annonces
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1 text-xs px-2 py-1">
            <Image className="h-3 w-3" /> Medias
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1 text-xs px-2 py-1">
            <Calendar className="h-3 w-3" /> Cal.
          </TabsTrigger>
        </TabsList>

        {/* Tab content — scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <TabsContent value="bible" className="mt-0">
            <BibleTab planId={planId} />
          </TabsContent>
          <TabsContent value="songs" className="mt-0">
            <SongsTab planId={planId} />
          </TabsContent>
          <TabsContent value="announcements" className="mt-0">
            <AnnouncementsTab planId={planId} />
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <MediaTab planId={planId} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0">
            <CalendarTab planId={planId} onSelectPlan={onSelectPlan ?? (() => {})} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
