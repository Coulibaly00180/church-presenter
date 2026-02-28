import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const SheetRoot = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;

const SheetOverlay = ({
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

const sheetVariants = cva(
  "fixed z-[400] gap-4 bg-bg-surface border-border shadow-xl transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: { side: "right" },
  }
);

const SheetContent = ({
  side = "right",
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content> & VariantProps<typeof sheetVariants>) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
      <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Fermer</span>
      </Dialog.Close>
    </Dialog.Content>
  </SheetPortal>
);

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left p-6", className)} {...props} />
);

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0", className)} {...props} />
);

const SheetTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Title>) => (
  <Dialog.Title
    className={cn("text-lg font-semibold text-text-primary", className)}
    {...props}
  />
);

const SheetDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Description>) => (
  <Dialog.Description
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
);

export {
  SheetRoot as Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
