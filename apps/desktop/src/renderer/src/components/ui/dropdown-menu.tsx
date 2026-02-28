import { DropdownMenu } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenuRoot = DropdownMenu.Root;
const DropdownMenuTrigger = DropdownMenu.Trigger;
const DropdownMenuGroup = DropdownMenu.Group;
const DropdownMenuPortal = DropdownMenu.Portal;
const DropdownMenuSub = DropdownMenu.Sub;
const DropdownMenuRadioGroup = DropdownMenu.RadioGroup;

const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.SubTrigger> & { inset?: boolean }) => (
  <DropdownMenu.SubTrigger
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
      "focus:bg-bg-elevated data-[state=open]:bg-bg-elevated",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenu.SubTrigger>
);

const DropdownMenuSubContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.SubContent>) => (
  <DropdownMenu.SubContent
    className={cn(
      "z-[400] min-w-[8rem] overflow-hidden rounded-md border border-border bg-bg-surface p-1 text-text-primary shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
);

const DropdownMenuContent = ({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      sideOffset={sideOffset}
      className={cn(
        "z-[400] min-w-[8rem] overflow-hidden rounded-md border border-border bg-bg-surface p-1 text-text-primary shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenu.Portal>
);

const DropdownMenuItem = ({
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { inset?: boolean }) => (
  <DropdownMenu.Item
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary outline-none transition-colors",
      "focus:bg-bg-elevated focus:text-text-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      "[&>svg]:size-4 [&>svg]:shrink-0",
      className
    )}
    {...props}
  />
);

const DropdownMenuCheckboxItem = ({
  className,
  children,
  checked,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.CheckboxItem>) => (
  <DropdownMenu.CheckboxItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-text-primary outline-none transition-colors",
      "focus:bg-bg-elevated focus:text-text-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenu.ItemIndicator>
    </span>
    {children}
  </DropdownMenu.CheckboxItem>
);

const DropdownMenuRadioItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.RadioItem>) => (
  <DropdownMenu.RadioItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-text-primary outline-none transition-colors",
      "focus:bg-bg-elevated focus:text-text-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenu.ItemIndicator>
    </span>
    {children}
  </DropdownMenu.RadioItem>
);

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Label> & { inset?: boolean }) => (
  <DropdownMenu.Label
    className={cn(
      "px-2 py-1.5 text-xs font-semibold text-text-muted",
      inset && "pl-8",
      className
    )}
    {...props}
  />
);

const DropdownMenuSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenu.Separator>) => (
  <DropdownMenu.Separator
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
);

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-text-muted", className)}
    {...props}
  />
);

export {
  DropdownMenuRoot as DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
