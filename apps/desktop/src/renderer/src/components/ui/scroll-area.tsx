import { ScrollArea } from "radix-ui";
import { cn } from "@/lib/utils";

const ScrollAreaRoot = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollArea.Root>) => (
  <ScrollArea.Root
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollArea.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollArea.Viewport>
    <ScrollAreaScrollbar orientation="vertical" />
    <ScrollAreaScrollbar orientation="horizontal" />
    <ScrollArea.Corner />
  </ScrollArea.Root>
);

const ScrollAreaScrollbar = ({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollArea.Scrollbar>) => (
  <ScrollArea.Scrollbar
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-px",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-px",
      className
    )}
    {...props}
  >
    <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
  </ScrollArea.Scrollbar>
);

export { ScrollAreaRoot as ScrollArea, ScrollAreaScrollbar };
