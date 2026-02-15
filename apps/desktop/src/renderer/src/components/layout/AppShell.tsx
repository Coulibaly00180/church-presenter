import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "./Header";
import { LiveBar } from "./LiveBar";
import { SourcePanel } from "./SourcePanel";
import { HistoryDialog } from "@/components/dialogs/HistoryDialog";

export function AppShell() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [planId, setPlanId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header
          planId={planId}
          onSelectPlan={setPlanId}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          <SourcePanel planId={planId} onSelectPlan={setPlanId} />

          <main className="flex-1 overflow-auto p-4">
            <Outlet context={{ planId, setPlanId }} />
          </main>
        </div>

        <LiveBar />
      </div>

      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
