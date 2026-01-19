'use client';

/**
 * SkillExamples - Usage examples with input/output
 *
 * Shows: Before/After or Input/Output examples
 */

import { ArrowRight, MessageSquare, Bot } from 'lucide-react';

interface UsageExample {
  input: string;
  output: string;
  beforeAfter?: {
    before: string;
    after: string;
  };
}

interface SkillExamplesProps {
  examples: UsageExample[];
}

export function SkillExamples({ examples }: SkillExamplesProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Usage Examples
      </h2>
      <div className="space-y-4">
        {examples.map((example, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border-subtle bg-card overflow-hidden"
          >
            {/* Before/After Mode */}
            {example.beforeAfter ? (
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Before */}
                <div className="p-4 border-b md:border-b-0 md:border-r border-border-subtle">
                  <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                    Before
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {example.beforeAfter.before}
                  </p>
                </div>
                {/* After */}
                <div className="p-4 bg-green-500/5">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-2 font-medium uppercase tracking-wider">
                    After
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {example.beforeAfter.after}
                  </p>
                </div>
              </div>
            ) : (
              /* Input/Output Mode */
              <div className="divide-y divide-border-subtle">
                {/* Input */}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-medium uppercase tracking-wider">Input</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {example.input}
                  </p>
                </div>
                {/* Output */}
                <div className="p-4 bg-primary/5">
                  <div className="flex items-center gap-2 text-xs text-primary mb-2">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="font-medium uppercase tracking-wider">Output</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {example.output}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
