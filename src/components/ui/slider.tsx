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
      {/* Hide filled range to remove trailing orange line */}
      <SliderPrimitive.Range className="hidden" />
    </SliderPrimitive.Track>
    {/* Thumb: ~33% smaller than previous (21px), 100% orange, halo persists */}
    <SliderPrimitive.Thumb
      className="relative block h-[21px] w-[21px] rounded-full bg-teal-300 border-2 border-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50
                 after:content-[''] after:absolute after:-inset-[10.5px] after:rounded-full after:bg-teal-300/50 after:opacity-50 after:pointer-events-none after:transition-opacity"
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
