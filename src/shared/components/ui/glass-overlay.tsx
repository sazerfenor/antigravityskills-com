"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface GlassOverlayProps {
  /** External real progress (0-100) */
  progress?: number;
  /** Enable simulated progress animation, default true */
  autoSimulate?: boolean;
  /** Custom loading message */
  message?: string;
  /** Show dynamic messages based on progress, default true */
  dynamicMessages?: boolean;
  /** Callback when progress reaches 100% */
  onComplete?: () => void;
  /** Custom icon, defaults to Sparkles */
  icon?: React.ReactNode;
  /** Overlay mode: local (inside Card) or fullscreen */
  variant?: "local" | "fullscreen";
  /** Show rounded corners, default true */
  rounded?: boolean;
  /** Show progress bar, default true */
  showProgress?: boolean;
  /** Additional className */
  className?: string;
  /** Children content */
  children?: React.ReactNode;
}

const DEFAULT_MESSAGES = {
  INIT: "Initializing...",
  DREAMING: "Processing...",
  RENDERING: "Rendering...",
  ALMOST: "Almost there...",
};

function GlassOverlay({
  progress,
  autoSimulate = true,
  message,
  dynamicMessages = true,
  onComplete,
  icon,
  variant = "local",
  rounded = true,
  showProgress = true,
  className,
  children,
}: GlassOverlayProps) {
  const [simulatedProgress, setSimulatedProgress] = React.useState(0);

  // Simulated progress algorithm - Faster updates for better UX
  React.useEffect(() => {
    if (!autoSimulate) {
      // If not auto-simulating, use external progress
      if (progress !== undefined) {
        setSimulatedProgress(progress);
      }
      return;
    }

    // Immediately jump to 25% on mount for instant feedback
    setSimulatedProgress(25);

    // Faster interval (300ms instead of 800ms) for more responsive feel
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        // If external progress is higher, sync to it
        if (progress !== undefined && progress > prev) return progress;
        // Brake at 85%, wait for real completion
        if (prev >= 85) return prev;
        // Faster, smaller increments (2-6%) for smoother animation
        return Math.min(prev + Math.random() * 4 + 2, 85);
      });
    }, 300);

    return () => {
      clearInterval(interval);
    };
  }, [autoSimulate, progress]);

  // Handle completion
  React.useEffect(() => {
    if (progress === 100) {
      setSimulatedProgress(100);
      onComplete?.();
    }
  }, [progress, onComplete]);

  // Dynamic loading text based on progress
  const loadingText = React.useMemo(() => {
    if (message) return message;
    if (!dynamicMessages) return DEFAULT_MESSAGES.DREAMING;

    if (simulatedProgress < 30) return DEFAULT_MESSAGES.INIT;
    if (simulatedProgress < 70) return DEFAULT_MESSAGES.DREAMING;
    if (simulatedProgress < 90) return DEFAULT_MESSAGES.RENDERING;
    return DEFAULT_MESSAGES.ALMOST;
  }, [message, dynamicMessages, simulatedProgress]);

  const displayProgress = autoSimulate ? simulatedProgress : (progress ?? 0);

  return (
    <div
      className={cn(
        // Base positioning
        "z-50 flex flex-col items-center justify-center",
        // Variant-based positioning
        variant === "local" && "absolute inset-0",
        variant === "fullscreen" && "fixed inset-0 z-[100]",
        // Enhanced Glass effect - stronger blur and opacity for better content hiding
        "bg-background/80 backdrop-blur-3xl backdrop-saturate-150",
        // Border
        "border border-border-medium",
        // Rounded corners
        rounded && "rounded-xl",
        // Overflow
        "overflow-hidden",
        className
      )}
    >
      {/* Dark overlay layer for extra opacity - hides content underneath */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Neon Core - Ambient Glow */}
      <div className="absolute inset-0 bg-primary/5 blur-3xl animate-pulse" />

      {/* Center Content - Compact Layout */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Icon - Simple Sparkles with pulse animation */}
        {icon ?? (
          <Sparkles className="h-8 w-8 text-primary animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
        )}

        {/* Loading Text */}
        <p className="text-sm font-medium text-muted-foreground">
          {loadingText}
        </p>

        {/* Progress Bar - Compact, right below text */}
        {showProgress && (
          <div className="w-48 space-y-1.5">
            {/* Progress percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/70">Progress</span>
              <span className="text-primary font-mono tabular-nums">
                {Math.round(displayProgress)}%
              </span>
            </div>

            {/* Glowing track and fill */}
            <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary shadow-[0_0_12px_rgba(250,204,21,0.6)] transition-all duration-300 ease-out rounded-full"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Children slot */}
        {children}
      </div>
    </div>
  );
}

export { GlassOverlay };
export type { GlassOverlayProps };
