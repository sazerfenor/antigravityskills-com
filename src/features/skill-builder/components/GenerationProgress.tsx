'use client';

/**
 * Generation Progress Component
 *
 * 显示生成进度
 */

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { GenerationPhase } from '../types';

interface GenerationProgressProps {
  phase: GenerationPhase;
  message: string;
  iteration?: number;
}

const phaseLabels: Record<GenerationPhase, string> = {
  IDLE: '',
  ANALYZING: 'Analyzing',
  BUILDING: 'Building',
  VALIDATING: 'Validating',
  COMPLETE: 'Complete',
  ERROR: 'Error',
};

export function GenerationProgress({
  phase,
  message,
  iteration,
}: GenerationProgressProps) {
  if (phase === 'IDLE') return null;

  const isLoading = ['ANALYZING', 'BUILDING', 'VALIDATING'].includes(phase);
  const isComplete = phase === 'COMPLETE';
  const isError = phase === 'ERROR';

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      {isComplete && <CheckCircle className="w-5 h-5 text-green-500" />}
      {isError && <XCircle className="w-5 h-5 text-destructive" />}

      <div className="flex-1">
        <div className="font-medium text-sm">
          {phaseLabels[phase]}
          {iteration && iteration > 1 && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Attempt {iteration}/3)
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}
