import { Select } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectRoot = Select.Root;
const SelectGroup = Select.Group;
const SelectValue = Select.Value;

const SelectTrigger = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.Trigger>) => (
  <Select.Trigger
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-border",
      "bg-bg-surface px-3 py-2 text-sm text-text-primary",
      "placeholder:text-text-muted",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <Select.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Select.Icon>
  </Select.Trigger>
);

const SelectScrollUpButton = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.ScrollUpButton>) => (
  <Select.ScrollUpButton
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </Select.ScrollUpButton>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.ScrollDownButton>) => (
  <Select.ScrollDownButton
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </Select.ScrollDownButton>
);

const SelectContent = ({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.Content>) => (
  <Select.Portal>
    <Select.Content
      position={position}
      className={cn(
        "relative z-[400] max-h-96 min-w-[8rem] overflow-hidden rounded-md",
        "border border-border bg-bg-surface text-text-primary shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" && [
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
          "data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        ],
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <Select.Viewport
        className={cn(
          "p-1",
          position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </Select.Viewport>
      <SelectScrollDownButton />
    </Select.Content>
  </Select.Portal>
);

const SelectLabel = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.Label>) => (
  <Select.Label
    className={cn("px-2 py-1.5 text-xs font-semibold text-text-muted", className)}
    {...props}
  />
);

const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.Item>) => (
  <Select.Item
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2",
      "text-sm text-text-primary outline-none",
      "focus:bg-bg-elevated focus:text-text-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Select.ItemIndicator>
        <Check className="h-4 w-4" />
      </Select.ItemIndicator>
    </span>
    <Select.ItemText>{children}</Select.ItemText>
  </Select.Item>
);

const SelectSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Select.Separator>) => (
  <Select.Separator
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
);

export {
  SelectRoot as Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
