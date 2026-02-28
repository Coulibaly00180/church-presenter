import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-fg",
        secondary: "border-transparent bg-bg-elevated text-text-secondary",
        outline: "border-border text-text-secondary",
        destructive: "border-transparent bg-danger text-white",
        success: "border-transparent bg-success text-white",
        // Kind variants
        song: "border-transparent text-white",
        bible: "border-transparent text-white",
        announcement: "border-transparent text-text-primary",
        media: "border-transparent text-white",
        timer: "border-transparent text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  kindColor?: string;
}

const Badge = ({ className, variant, kindColor, style, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      style={kindColor ? { backgroundColor: kindColor, ...style } : style}
      {...props}
    />
  );
};

// Kind badge helpers
const KIND_COLORS: Record<string, string> = {
  SONG_BLOCK: "var(--kind-song)",
  BIBLE_VERSE: "var(--kind-bible)",
  BIBLE_PASSAGE: "var(--kind-bible)",
  VERSE_MANUAL: "var(--kind-bible)",
  ANNOUNCEMENT_TEXT: "var(--kind-announcement)",
  ANNOUNCEMENT_IMAGE: "var(--kind-media)",
  ANNOUNCEMENT_PDF: "var(--kind-media)",
  TIMER: "var(--kind-timer)",
};

const KIND_LABELS: Record<string, string> = {
  SONG_BLOCK: "Chant",
  BIBLE_VERSE: "Verset",
  BIBLE_PASSAGE: "Passage",
  VERSE_MANUAL: "Manuel",
  ANNOUNCEMENT_TEXT: "Annonce",
  ANNOUNCEMENT_IMAGE: "Image",
  ANNOUNCEMENT_PDF: "PDF",
  TIMER: "Minuterie",
};

const KindBadge = ({ kind, className }: { kind: string; className?: string }) => (
  <Badge
    className={cn("shrink-0", className)}
    style={{
      backgroundColor: KIND_COLORS[kind] ?? "var(--kind-announcement)",
      color: kind === "ANNOUNCEMENT_TEXT" ? "var(--text-primary)" : "white",
    }}
  >
    {KIND_LABELS[kind] ?? kind}
  </Badge>
);

export { Badge, badgeVariants, KindBadge, KIND_COLORS, KIND_LABELS };
