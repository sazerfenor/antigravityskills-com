"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/shared/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base - 使用 justify-start 确保内部元素定位正确
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 outline-none",
        // Checked - 黄色霓虹光晕
        "data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_12px_-2px_var(--color-primary)]",
        // Unchecked - 可见的灰色轨道
        "data-[state=unchecked]:bg-muted-foreground/40",
        // Focus
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Base - 圆形滑块，固定尺寸
          "pointer-events-none block h-4 w-4 rounded-full shadow-md transition-transform duration-300",
          // Position - 使用 transform 控制位置
          "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-4",
          // Color - 始终白色，在两种状态下都清晰可见
          "bg-white"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
