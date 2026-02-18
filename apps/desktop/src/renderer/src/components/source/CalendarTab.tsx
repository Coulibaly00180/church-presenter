import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isoToYmd, localNowYmd } from "@/lib/date";
import { toast } from "sonner";
import { getTemplates, type PlanTemplate } from "@/lib/templates";
import { TemplatePickerDialog } from "@/components/dialogs/TemplatePickerDialog";

type PlanEntry = { id: string; date: string | Date; title?: string | null };

type CalendarTabProps = {
  planId: string | null;
  onSelectPlan: (id: string) => void;
};

export function CalendarTab({ planId, onSelectPlan }: CalendarTabProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  useEffect(() => {
    window.cp.plans.list().then(setPlans).catch(() => null);
  }, []);

  const today = localNowYmd();

  const planByDate = useMemo(() => {
    const map = new Map<string, PlanEntry>();
    for (const p of plans) {
      const ymd = isoToYmd(p.date);
      if (ymd) map.set(ymd, p);
    }
    return map;
  }, [plans]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // Monday = 0
  const monthLabel = new Date(year, month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const createPlanDirect = async (ymd: string) => {
    const created = await window.cp.plans.create({ dateIso: ymd, title: "Culte" });
    if (created?.id) {
      toast.success("Plan cree");
      const refreshed = await window.cp.plans.list();
      setPlans(refreshed);
      onSelectPlan(created.id);
    }
  };

  const handleDayClick = async (day: number) => {
    const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = planByDate.get(ymd);
    if (existing) {
      onSelectPlan(existing.id);
      return;
    }
    const templates = await getTemplates();
    if (templates.length > 0) {
      setPendingDate(ymd);
      setTemplateOpen(true);
    } else {
      await createPlanDirect(ymd);
    }
  };

  const handleTemplateSelect = async (template: PlanTemplate) => {
    if (!pendingDate) return;
    const created = await window.cp.plans.create({ dateIso: pendingDate, title: "Culte" });
    if (created?.id) {
      for (const item of template.items) {
        await window.cp.plans.addItem({
          planId: created.id,
          kind: item.kind,
          title: item.title ?? undefined,
          content: item.content ?? undefined,
          refId: item.refId ?? undefined,
          refSubId: item.refSubId ?? undefined,
          mediaPath: item.mediaPath ?? undefined,
        });
      }
      toast.success("Plan cree depuis template");
      const refreshed = await window.cp.plans.list();
      setPlans(refreshed);
      onSelectPlan(created.id);
    }
    setPendingDate(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <span key={d} className="text-[10px] text-muted-foreground font-medium">{d}</span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasPlan = planByDate.has(ymd);
          const isToday = ymd === today;
          const isSelected = hasPlan && planByDate.get(ymd)?.id === planId;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-8 rounded-md text-xs flex flex-col items-center justify-center transition-colors relative",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "border border-primary",
                !isSelected && !isToday && "hover:bg-accent",
              )}
            >
              {day}
              {hasPlan && !isSelected && (
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <TemplatePickerDialog
        open={templateOpen}
        onOpenChange={(v) => { setTemplateOpen(v); if (!v) setPendingDate(null); }}
        onSelect={handleTemplateSelect}
        onSkip={() => { if (pendingDate) createPlanDirect(pendingDate); setPendingDate(null); }}
      />
    </div>
  );
}
