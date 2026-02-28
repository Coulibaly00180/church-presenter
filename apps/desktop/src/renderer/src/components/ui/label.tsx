import { Label } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none text-text-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const LabelRoot = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label.Root> &
  VariantProps<typeof labelVariants>) => (
  <Label.Root className={cn(labelVariants(), className)} {...props} />
);

export { LabelRoot as Label };
