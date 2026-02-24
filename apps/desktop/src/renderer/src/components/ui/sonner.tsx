import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const Toaster = ({ ...props }: ToasterProps) => (
  <SonnerToaster
    position="bottom-right"
    toastOptions={{
      classNames: {
        toast:
          "group toast bg-bg-surface border border-border text-text-primary shadow-lg rounded-lg",
        title: "text-sm font-medium text-text-primary",
        description: "text-xs text-text-secondary",
        actionButton: "bg-primary text-primary-fg text-xs font-medium rounded-md px-3 py-1.5",
        cancelButton: "bg-bg-elevated text-text-secondary text-xs font-medium rounded-md px-3 py-1.5",
        closeButton: "bg-bg-elevated border border-border text-text-secondary",
        success: "border-success/30",
        error: "border-danger/30",
        warning: "border-warning/30",
        info: "border-primary/30",
      },
    }}
    {...props}
  />
);

export { Toaster };
