'use client';

/**
 * SkillQuickStart - Quick Start guide section
 *
 * Shows: Step-by-step instructions and example command
 */

import { useState } from 'react';
import { Terminal, Copy, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

interface QuickStartData {
  title: string;
  steps: string[];
  exampleCommand: string;
}

interface SkillQuickStartProps {
  data: QuickStartData;
}

export function SkillQuickStart({ data }: SkillQuickStartProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(data.exampleCommand);
    setCopied(true);
    toast.success('Command copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-xl border border-border-subtle bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          {data.title || 'Quick Start'}
        </h2>
      </div>

      {/* Steps */}
      <div className="p-5 space-y-4">
        {data.steps && Array.isArray(data.steps) && data.steps.length > 0 && (
          <ol className="space-y-3">
            {data.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Example Command */}
        {data.exampleCommand && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              Example Command
            </div>
            <div className="relative">
              <pre className="bg-muted/50 rounded-lg p-3 text-sm font-mono text-foreground overflow-x-auto">
                {data.exampleCommand}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCommand}
                className="absolute top-2 right-2 h-7 w-7 p-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
