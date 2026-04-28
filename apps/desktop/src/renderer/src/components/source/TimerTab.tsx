import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/hooks/usePlan";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerTab() {
  const { addItem } = usePlan();
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timerTitle, setTimerTitle] = useState("");

  const totalSeconds = minutes * 60 + seconds;
  const displayDuration = formatDuration(totalSeconds);

  const handleAdd = useCallback(async () => {
    if (totalSeconds <= 0) { toast.error("La durée doit être > 0"); return; }
    const item = await addItem({
      kind: "TIMER",
      title: timerTitle.trim() || "Minuterie",
      content: displayDuration,
    });
    if (item) toast.success("Minuterie ajoutée au plan");
  }, [addItem, totalSeconds, timerTitle, displayDuration]);

  const adjust = useCallback((delta: number) => {
    setMinutes((prev) => Math.max(0, prev + delta));
  }, []);

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="space-y-3 rounded-2xl border border-border bg-bg-surface p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Minuterie</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Prépare un compte à rebours clair pour les pauses, transitions et annonces.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[1, 5, 10, 15, 20, 30].map((m) => (
            <button
              key={m}
              type="button"
              className="rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-bg-elevated"
              onClick={() => { setMinutes(m); setSeconds(0); }}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm text-text-muted">Minutes</label>
            <Input
              type="number"
              min={0}
              max={99}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-center"
            />
          </div>
          <span className="text-lg font-bold text-text-secondary mt-4">:</span>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm text-text-muted">Secondes</label>
            <Input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              className="text-center"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => adjust(-5)} disabled={minutes < 5}>−5 min</Button>
          <Button variant="ghost" size="sm" onClick={() => adjust(-1)} disabled={minutes < 1}>−1 min</Button>
          <Button variant="ghost" size="sm" onClick={() => adjust(1)}>+1 min</Button>
          <Button variant="ghost" size="sm" onClick={() => adjust(5)}>+5 min</Button>
        </div>

        <div className="flex items-center justify-center rounded-xl border border-border bg-bg-elevated py-4">
          <span className="text-3xl font-bold tabular-nums text-text-primary">{displayDuration}</span>
        </div>

        <Input
          placeholder="Titre (ex : Pause café)"
          value={timerTitle}
          onChange={(e) => setTimerTitle(e.target.value)}
        />

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => void handleAdd()}
          disabled={totalSeconds <= 0}
        >
          <Plus className="h-4 w-4" />
          Ajouter au plan
        </Button>
      </section>
    </div>
  );
}
