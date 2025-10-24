import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const resolvedThumbCount = (() => {
    if (Array.isArray(value) && value.length > 0) return value.length;
    if (Array.isArray(defaultValue) && defaultValue.length > 0) return defaultValue.length;
    return 1;
  })();

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center border-none",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      {/* Track: neutral line (gray on light, white on dark) */}
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-300 dark:bg-white border-none">
        <SliderPrimitive.Range className="absolute h-full slider-range" />
      </SliderPrimitive.Track>
      {/* Thumb: ~33% smaller than previous (21px), 100% orange, halo persists */}
      {Array.from({ length: resolvedThumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            "relative block h-[21px] w-[21px] rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 slider-thumb"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
