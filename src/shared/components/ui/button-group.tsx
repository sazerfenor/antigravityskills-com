"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center",
          orientation === "vertical" && "flex-col",
          className
        )}
        role="group"
        {...props}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = "ButtonGroup";

export interface ButtonGroupTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export const ButtonGroupText = React.forwardRef<
  HTMLSpanElement,
  ButtonGroupTextProps
>(({ className, children, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center px-2 text-xs font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

ButtonGroupText.displayName = "ButtonGroupText";
