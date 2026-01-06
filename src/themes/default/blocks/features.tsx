'use client';

import React from 'react';
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react';

import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

/**
 * Features component - "Logic Declassified" 3-Stage Flow (v5.0)
 *
 * 三阶段流程展示: User Intent → Intent Decoded → Pro Prompt
 * Updated with Motion Discipline and Section Gradient rules.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 6, 7, 9
 */
export function Features({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  return (
    <Section
      id={features.id}
      spacing="default"
      className={cn("relative overflow-hidden", features.className, className)}
    >
      {/* 8.1 Atmosphere: Center Glow with L3 slow animation (8s) */}
      <div className={cn(
        VS.atmosphere.glowCenter,
        "w-[800px] h-[400px] bg-purple-500/5 blur-[120px]",
        VS.motion.decorative.glowSlow
      )} />

      <Container className="relative z-10">

        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          {/* TODO: 自定义你的品牌名称 */}
          <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1.5 transition-all duration-300 bg-primary/10 border-primary/20 text-primary shadow-[0_0_15px_-3px_var(--color-primary)] mb-4">
            <Sparkles className="w-3 h-3" />
            <span>{features.header_badge || 'Powered by AI Engine™'}</span>
          </span>
          {/* 7.1 Section Gradient: Features - Deep Tech */}
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            {features.header_title ? (
              <>
                {features.header_title.split(features.header_highlight || '')[0]}
                <span className={VS.gradient.features}>{features.header_highlight || ''}</span>
                {features.header_title.split(features.header_highlight || '')[1] || ''}
              </>
            ) : (
              <>Logic <span className={VS.gradient.features}>Declassified</span></>
            )}
          </h2>
          {features.header_description ? (
            <p
              className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: features.header_description }}
            />
          ) : (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              See how the <strong className="text-foreground">Intent Mining Engine</strong> deconstructs your raw input into a structured Logic Matrix.
            </p>
          )}
        </div>

        {/* The Matrix Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

          {/* Zone 1: The Input (Trigger) */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            {/* 9.1 Mobile: Step indicator */}
            <div className="lg:hidden flex items-center justify-center gap-2 py-4">
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">1</span>
              <span className="text-xs text-muted-foreground font-mono">INPUT</span>
            </div>
            <div className="relative group h-full max-h-[200px] flex items-center">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative w-full bg-glass-subtle backdrop-blur-md border border-border-medium rounded-xl p-6 flex flex-col justify-center h-full">
                <span className="text-xs font-mono text-muted-foreground block mb-3 opacity-70 border-b border-border/50 pb-2 w-fit">
                  &gt; User_Intent.txt
                </span>
                <div className="flex items-center gap-3">
                  {/* Static cursor bar - no animate-pulse per Motion Discipline */}
                  <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(250,204,21,0.4)]"></div>
                  <p className="text-2xl font-medium text-foreground tracking-tight">"Portrait"</p>
                </div>
                <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3" />
                  <span>Simple Seed Input</span>
                </p>
              </div>
            </div>
          </div>

          {/* Connector 1 - Desktop: Arrow, Mobile: Hidden (using step numbers instead) */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            {/* Static arrow with subtle glow - no animate-pulse */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full"></div>
              <ArrowRight className="w-8 h-8 text-primary/60" />
            </div>
          </div>

          {/* Zone 2: The Logic Matrix (Mining) */}
          <div className="lg:col-span-4">
            {/* 9.1 Mobile: Step indicator */}
            <div className="lg:hidden flex items-center justify-center gap-2 py-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/50" />
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">2</span>
              <span className="text-xs text-muted-foreground font-mono">DECODE</span>
              <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
            <div className="bg-glass-subtle backdrop-blur-xl border border-border-medium rounded-2xl p-6 shadow-2xl h-full relative overflow-hidden group">
              {/* Subtle grid pattern background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

              <div className="flex items-center justify-between mb-6 border-b border-border-subtle pb-4 relative z-10">
                 <div className="flex items-center gap-2">
                    {/* L2 Functional: Single ping for active status indicator */}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Intent Decoded</span>
                 </div>
                 <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">AUTO-MODE</span>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Subject Type */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider pl-1">Subject Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/30 text-muted-foreground line-through decoration-muted-foreground/50 opacity-50">Person</span>
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-medium shadow-[0_0_12px_-4px_rgba(255,255,0,0.4)] animate-in fade-in zoom-in duration-500">
                      Fashion Model
                    </span>
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/30 text-muted-foreground opacity-50">Elderly</span>
                  </div>
                </div>

                {/* Lighting */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider pl-1">Lighting Style</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-medium shadow-[0_0_12px_-4px_rgba(255,255,0,0.4)] animate-in fade-in zoom-in duration-700 delay-100">
                      Natural Window Light
                    </span>
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/30 text-muted-foreground opacity-50">Studio Flash</span>
                    <span className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/30 text-muted-foreground opacity-50">Neon</span>
                  </div>
                </div>

                {/* Environment */}
                <div className="space-y-2.5">
                  <h3 className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider pl-1">Environment</h3>
                  <div className="flex flex-wrap gap-2">
                     <span className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/30 text-muted-foreground opacity-50">Street</span>
                     <span className="text-xs px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-medium shadow-[0_0_12px_-4px_rgba(255,255,0,0.4)] animate-in fade-in zoom-in duration-900 delay-200">
                      Minimalist Studio
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector 2 - Desktop only */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full"></div>
              <ArrowRight className="w-8 h-8 text-primary/60" />
            </div>
          </div>

          {/* Zone 3: The Result (Crystalization) */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            {/* 9.1 Mobile: Step indicator */}
            <div className="lg:hidden flex items-center justify-center gap-2 py-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/50" />
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">3</span>
              <span className="text-xs text-muted-foreground font-mono">OUTPUT</span>
            </div>
            <div className="relative h-full max-h-[300px] flex items-center">
               <div className="absolute -inset-0.5 bg-gradient-to-l from-primary/20 to-blue-500/20 rounded-xl blur opacity-30"></div>
               <div className="w-full bg-glass-subtle backdrop-blur-xl border border-border-medium rounded-xl p-6 font-mono text-sm leading-relaxed text-muted-foreground h-full flex flex-col shadow-2xl">
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-3 mb-3 opacity-70">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                   <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                   <span className="ml-2 text-[10px]">pro_prompt.json</span>
                </div>

                <div className="overflow-hidden">
                  <span className="text-primary font-bold">/imagine prompt:</span>
                  <span className="block mt-2">
                    A sophisticated <span className="text-yellow-200 decoration-yellow-500/30 underline decoration-dotted underline-offset-4 font-bold">fashion model</span> poses in a
                    <span className="text-blue-200 decoration-blue-500/30 underline decoration-dotted underline-offset-4 font-bold"> minimalist studio</span>.
                  </span>
                  <span className="block mt-2">
                    The scene is illuminated by the gentle spill of <span className="text-yellow-200 decoration-yellow-500/30 underline decoration-dotted underline-offset-4 font-bold">natural window light</span>, creating a soft interplay of highlights...
                  </span>
                  {/* Static cursor - no animate-pulse */}
                  <span className="block mt-4 text-xs opacity-50">_</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </Section>
  );
}
