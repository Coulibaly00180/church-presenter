import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogRoot = Dialog.Root;
const DialogTrigger = Dialog.Trigger;
const DialogPortal = Dialog.Portal;
const DialogClose = Dialog.Close;

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Overlay>) => (
  <Dialog.Overlay
    className={cn(
      "fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
);

const DialogContent = ({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content> & { showClose?: boolean }) => (
  <DialogPortal>
    <DialogOverlay />
    <Dialog.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-[400] -translate-x-1/2 -translate-y-1/2",
        "w-full max-w-lg rounded-xl bg-bg-surface border border-border shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
      {showClose && (
        <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </Dialog.Close>
      )}
    </Dialog.Content>
  </DialogPortal>
);

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end gap-2 p-6 pt-4", className)} {...props} />
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);

const DialogTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Title>) => (
  <Dialog.Title
    className={cn("text-lg font-semibold text-text-primary", className)}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Description>) => (
  <Dialog.Description
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
);

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
};
