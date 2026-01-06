"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/shared/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    {/* Track - 深色凹槽 */}
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-black/40 shadow-inner">
      {/* Range - 黄色填充 */}
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    
    {/* Thumb - 发光能量球 */}
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      className={cn(
        // Base
        "block h-5 w-5 rounded-full border-2 border-primary bg-primary",
        // Glow - 霓虹光晕
        "shadow-[0_0_10px_var(--color-primary)]",
        // Focus
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        // Hover - 放大
        "transition-transform hover:scale-110",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
