'use client';

import { cn } from '@/shared/lib/utils';

type Phase = 'idle' | 'build' | 'compile' | 'generate';

interface UnifiedProgressBarProps {
  phase: Phase;
  progress: number; // 0-100 within current phase
  className?: string;
}

// Phase progress ranges
const PHASE_RANGES = {
  idle: { start: 0, end: 0 },
  build: { start: 0, end: 20 },
  compile: { start: 20, end: 40 },
  generate: { start: 40, end: 100 },
} as const;

// Phase-specific loading messages
const PHASE_MESSAGES: Record<Phase, string> = {
  idle: 'Ready to create...',
  build: 'Reading your mind...',
  compile: 'Mixing the colors...',
  generate: 'Painting pixels...',
};

// Sub-messages for generate phase based on progress
const GENERATE_SUB_MESSAGES: Record<number, string> = {
  0: 'Painting pixels...',
  50: 'Adding shadows...',
  80: 'Final touches...',
};

/**
 * Unified progress bar with neon glow effect (CBDS v3.2)
 * Visualizes Build → Compile → Generate flow.
 */
export function UnifiedProgressBar({
  phase,
  progress,
  className,
}: UnifiedProgressBarProps) {
  // Calculate overall progress (0-100)
  const range = PHASE_RANGES[phase];
  const phaseWidth = range.end - range.start;
  const overallProgress = range.start + (progress / 100) * phaseWidth;

  // Get loading message
  const getMessage = (): string => {
    if (phase === 'generate') {
      // Find appropriate sub-message based on progress
      const thresholds = Object.keys(GENERATE_SUB_MESSAGES)
        .map(Number)
        .sort((a, b) => b - a);
      const threshold = thresholds.find(t => progress >= t) ?? 0;
      return GENERATE_SUB_MESSAGES[threshold];
    }
    return PHASE_MESSAGES[phase];
  };

  const message = getMessage();

  if (phase === 'idle') {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar with neon glow */}
      <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)] transition-all duration-300 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Phase indicator and message */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">
          {message}
        </span>
        <span className="text-primary/70 font-mono">
          {Math.round(overallProgress)}%
        </span>
      </div>
    </div>
  );
}

// Export types for use in parent components
export type { Phase };
