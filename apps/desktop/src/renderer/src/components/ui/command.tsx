import { Search } from "lucide-react";
import {
  Command as CommandPrimitive,
  CommandInput as CmdkInput,
  CommandList as CmdkList,
  CommandEmpty as CmdkEmpty,
  CommandGroup as CmdkGroup,
  CommandItem as CmdkItem,
  CommandSeparator as CmdkSeparator,
} from "cmdk";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "./dialog";

const Command = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive>) => (
  <CommandPrimitive
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-bg-surface text-text-primary",
      className
    )}
    {...props}
  />
);

const CommandDialog = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog>) => (
  <Dialog {...props}>
    <DialogContent className="overflow-hidden p-0 shadow-xl" showClose={false}>
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);

const CommandInput = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkInput>) => (
  <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CmdkInput
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none",
        "placeholder:text-text-muted",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
);

const CommandList = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkList>) => (
  <CmdkList
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
);

const CommandEmpty = ({
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkEmpty>) => (
  <CmdkEmpty className="py-6 text-center text-sm text-text-muted" {...props} />
);

const CommandGroup = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkGroup>) => (
  <CmdkGroup
    className={cn(
      "overflow-hidden p-1 text-text-primary",
      "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-muted",
      className
    )}
    {...props}
  />
);

const CommandSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkSeparator>) => (
  <CmdkSeparator className={cn("-mx-1 h-px bg-border", className)} {...props} />
);

const CommandItem = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CmdkItem>) => (
  <CmdkItem
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
      "data-[disabled=true]:pointer-events-none data-[selected=true]:bg-bg-elevated data-[selected=true]:text-text-primary data-[disabled=true]:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
);

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-text-muted", className)}
    {...props}
  />
);

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
};
