import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center border-none",
      className
    )}
    {...props}
  >
    {/* Track: neutral line (gray on light, white on dark) */}
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-300 dark:bg-white border-none">
      <SliderPrimitive.Range className="absolute h-full slider-range" />
    </SliderPrimitive.Track>
    {/* Thumb: ~33% smaller than previous (21px), 100% orange, halo persists */}
    <SliderPrimitive.Thumb
      className={cn(
        "relative block h-[21px] w-[21px] rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 slider-thumb"
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
