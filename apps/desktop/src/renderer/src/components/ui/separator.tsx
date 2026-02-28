import { Separator } from "radix-ui";
import { cn } from "@/lib/utils";

const SeparatorRoot = ({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof Separator.Root>) => (
  <Separator.Root
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className
    )}
    {...props}
  />
);

export { SeparatorRoot as Separator };
