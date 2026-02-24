import { useState } from "react";
import { LiveProvider } from "@/contexts/LiveContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { Toaster } from "@/components/ui/sonner";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { QuickTextDialog } from "@/components/dialogs/QuickTextDialog";
import { useShortcuts } from "@/hooks/useShortcuts";
import { Header } from "./Header";
import { LiveBar } from "./LiveBar";

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickTextOpen, setQuickTextOpen] = useState(false);

  // Global shortcut: Ctrl+T → quick text
  useShortcuts(
    (action) => {
      if (action === "toggleProjection") setQuickTextOpen((v) => !v);
    },
    true
  );

  return (
    <div className="flex h-screen flex-col bg-bg-base overflow-hidden">
      <Header
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <main className="flex flex-1 overflow-hidden">
        {children}
      </main>
      <LiveBar />
      <Toaster />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <QuickTextDialog open={quickTextOpen} onClose={() => setQuickTextOpen(false)} />
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <LiveProvider>
      <PlanProvider>
        <AppShellInner>{children}</AppShellInner>
      </PlanProvider>
    </LiveProvider>
  );
}
