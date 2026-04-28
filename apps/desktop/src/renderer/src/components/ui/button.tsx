import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary: "bg-bg-elevated text-text-primary hover:bg-bg-elevated/80 border border-border",
        ghost: "text-text-primary hover:bg-bg-elevated hover:text-text-primary",
        destructive: "bg-danger text-white hover:bg-danger/90",
        outline: "border border-border bg-transparent hover:bg-bg-elevated text-text-primary",
        link: "text-primary underline-offset-4 hover:underline h-auto p-0 font-normal",
      },
      size: {
        xs: "h-6 rounded-sm px-2 text-xs",
        sm: "h-7 rounded-md px-2.5 text-xs",
        md: "h-9 px-4 py-2",
        lg: "h-10 rounded-md px-6",
        xl: "h-12 rounded-md px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-xs": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

export { Button, buttonVariants };
