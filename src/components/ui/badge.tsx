import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-600 text-white hover:bg-green-600/80",
        orange:
          "border-transparent bg-history-secondary text-white hover:bg-history-secondary/80",
        blue:
          "border-transparent bg-blue-500 text-white hover:bg-blue-500/80",
        green:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80",
        selectedTag:
          "border-transparent bg-history-secondary/20 text-history-secondary font-medium",
        xp: 
          "border-transparent bg-green-500/85 text-white font-medium",
        accuracy: 
          "border-transparent bg-blue-500/85 text-white font-medium",
        selectedValue:
          "border-transparent bg-history-secondary/20 text-history-secondary font-medium text-base",
        hint:
          "border-transparent bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium",
        perfect:
          "border-transparent bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium",
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
