import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#21262d] text-[#8b949e] border border-[#30363d]/50",
        secondary:
          "bg-[#161b22] text-[#e6edf3] border border-[#30363d]",
        destructive:
          "bg-red-900/30 text-red-400 border border-red-800/30",
        outline:
          "text-[#8b949e] border border-[#30363d]",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
