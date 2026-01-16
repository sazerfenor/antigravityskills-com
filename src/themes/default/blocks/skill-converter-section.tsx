/**
 * Skill Converter Section
 * 主题包装层 - 将核心组件包装在 Matrix 主题风格中
 */

'use client';

import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

const SkillConverterPlayground = dynamic(
  () =>
    import('@/shared/blocks/skill-converter/skill-converter-playground').then(
      (mod) => ({ default: mod.SkillConverterPlayground })
    ),
  { ssr: false }
);

export function SkillConverterSection() {
  return (
    <section
      id="converter"
      className="relative overflow-hidden py-16 md:py-24"
    >
      {/* Background effects - Matrix theme */}
      <div
        className={cn(
          'absolute inset-0 -z-10',
          'bg-gradient-to-b from-primary/5 via-background to-background'
        )}
      />
      <div
        className={cn(
          'absolute inset-0 -z-10 opacity-40',
          'bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]'
        )}
      />

      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-12">
          <Badge
            variant="outline"
            className="mb-4 border-primary/30 bg-primary/10"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI SKILL DESIGNER
          </Badge>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Create Your{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Antigravity Skill
            </span>
          </h2>

          <p className="text-sm text-muted-foreground max-w-2xl">
            Describe what you need, or paste an existing prompt. Get a
            production-ready Skill in seconds.
          </p>
        </div>

        <SkillConverterPlayground />
      </div>
    </section>
  );
}
