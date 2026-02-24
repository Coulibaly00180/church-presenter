import { AppShell } from "@/components/layout/AppShell";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { SourcePanel } from "@/components/source/SourcePanel";

export function MainPage() {
  return (
    <AppShell>
      <SourcePanel />
      <PlanEditor />
    </AppShell>
  );
}
