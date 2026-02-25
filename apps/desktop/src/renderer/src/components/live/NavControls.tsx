import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLive } from "@/hooks/useLive";
import { cn } from "@/lib/utils";

interface NavControlsProps {
  className?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export function NavControls({ className, onPrev, onNext }: NavControlsProps) {
  const { live } = useLive();

  if (!live?.enabled) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        aria-label="Élément précédent"
        className="h-12 w-12 rounded-xl text-text-primary hover:bg-bg-elevated"
        style={{ height: "var(--btn-height-xl)", width: "var(--btn-height-xl)" }}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        aria-label="Élément suivant"
        className="h-12 w-12 rounded-xl text-text-primary hover:bg-bg-elevated"
        style={{ height: "var(--btn-height-xl)", width: "var(--btn-height-xl)" }}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
}
