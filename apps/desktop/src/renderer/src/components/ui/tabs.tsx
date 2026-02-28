import { Tabs } from "radix-ui";
import { cn } from "@/lib/utils";

const TabsRoot = Tabs.Root;

const TabsList = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.List>) => (
  <Tabs.List
    className={cn(
      "inline-flex items-center justify-start rounded-md bg-bg-elevated p-1 text-text-secondary",
      className
    )}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.Trigger>) => (
  <Tabs.Trigger
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5",
      "text-sm font-medium transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
);

const TabsContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tabs.Content>) => (
  <Tabs.Content
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      className
    )}
    {...props}
  />
);

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent };
