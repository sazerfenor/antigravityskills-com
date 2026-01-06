'use client';

import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Badge } from '@/shared/components/ui/badge';
import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';

const VisionLogicPlayground = dynamic(
  () => import('@/shared/blocks/vision-logic/vision-logic-playground').then((mod) => mod.VisionLogicPlayground),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-glass-hint rounded-xl border border-border-medium flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading VisionLogic...</div>
      </div>
    )
  }
);

/**
 * Generator Section - "Live Logic Lab" Cyberpunk Style (v5.0)
 *
 * Features "The Matrix Moment" - the visual climax of the page.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 7, 8.2
 *
 * IMPORTANT: All content is VISIBLE by default on server render.
 * Animations only enhance the experience after hydration.
 * This ensures Lighthouse/crawlers see full content.
 */
export function GeneratorSection({
  title,
  description,
  id = 'generator',
}: {
  title: string;
  description: string;
  id?: string;
}) {
  return (
    <Section id={id} spacing="default" className="relative overflow-hidden">
      {/* 8.2 The Matrix Moment: Dark gradient background */}
      <div className={cn("absolute inset-0 -z-10", VS.atmosphere.matrixMoment)} />

      {/* 8.1 Matrix Grid with radial mask */}
      <div className={cn(
        "absolute inset-0 -z-10 opacity-40",
        VS.atmosphere.matrixGrid
      )} />

      {/* Diagonal glow effect */}
      <div className={cn(
        "absolute inset-0 -z-10",
        VS.atmosphere.glowDiagonal
      )} />

      <Container>
        {/* Live Logic Lab Header - Cyberpunk Style */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Badge */}
          <Badge
            variant="outline"
            className="mb-4 border-primary/30 bg-primary/10 text-primary shadow-[0_0_12px_-3px_var(--color-primary)]"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI PROMPT GENERATOR
          </Badge>

          {/* 7.1 Section Gradient: Generator - Energy Core */}
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            {title || (
              <>
                Live Logic{' '}
                <span className={VS.gradient.generator}>Lab</span>
              </>
            )}
          </h2>

          {/* Subtitle - System Ready */}
          {/* TODO: 自定义你的模型名称 */}
          <p className="text-xs md:text-sm font-mono text-muted-foreground tracking-wider">
            // SYSTEM READY: POWERED BY{' '}
            <span className="text-primary font-semibold">STANDARD</span>
            {' '}&{' '}
            <span className="text-primary font-semibold">PRO</span>
          </p>
        </div>

        {/* VisionLogic Playground - Wrapped in Glass Container */}
        <div className="w-full max-w-6xl mx-auto">
          <div className="
            relative rounded-2xl overflow-hidden
            bg-glass-subtle backdrop-blur-xl
            border border-border-medium
            shadow-[0_0_60px_-12px_rgba(0,0,0,0.7)]
          ">
            {/* Inner glow effect - enhanced for Matrix Moment */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-emerald-500/[0.02] pointer-events-none" />

            {/* VisionLogicPlayground */}
            <VisionLogicPlayground />
          </div>
        </div>
      </Container>
    </Section>
  );
}
