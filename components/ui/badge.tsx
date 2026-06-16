import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent)] text-white",
        secondary: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
        destructive: "bg-[var(--color-red)] text-white",
        outline: "border border-[var(--color-border)] text-[var(--color-text)]",
        success: "bg-[var(--color-green)] text-white",
        warning: "bg-[var(--color-yellow)] text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
