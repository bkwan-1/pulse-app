import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-default)]",
        violet: "bg-[var(--accent)] text-white",
        success:     "bg-[var(--status-success)]/20 text-[var(--status-success)] border border-[var(--status-success)]/30",
        warning:     "bg-[var(--status-warning)]/20 text-[var(--status-warning)] border border-[var(--status-warning)]/30",
        destructive: "bg-[var(--status-overload)]/20 text-[var(--status-overload)] border border-[var(--status-overload)]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
