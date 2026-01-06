'use client';

import React from 'react';
import { BrainCircuit, Layers, Share2, Wand2 } from 'lucide-react';

import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';

// TODO: 自定义你的核心功能模块
const FEATURES = [
  {
    icon: <BrainCircuit className="w-6 h-6" />,
    title: "Standard Model",
    desc: "Quick and coherent prompt structuring. Perfect for everyday creative ideas."
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Pro Model",
    desc: "Advanced prompt generation for professional results. More detail, more control, better output."
  },
  {
    icon: <Share2 className="w-6 h-6" />,
    title: "Works Everywhere",
    desc: "One prompt, any AI model. Use your prompts on Midjourney, DALL-E, Flux, and more."
  },
  {
    icon: <Wand2 className="w-6 h-6" />,
    title: "Smart Refinement",
    desc: "Click to enhance. Adjust lighting, style, and details without typing a word."
  }
];

interface CoreModulesProps {
  coreModules?: {
    id?: string;
    title?: string;
    description?: string;
  };
  className?: string;
}

/**
 * Core Modules component - Feature Cards (v5.0)
 *
 * Displays the 4 core modules: Standard Model, Pro Model, Cross-Platform Syntax, Smart Refinement
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 5, 7
 */
export function CoreModules({ coreModules, className }: CoreModulesProps) {
  return (
    <Section
      id={coreModules?.id || 'core-modules'}
      spacing="default"
      className={cn("relative overflow-hidden", className)}
    >
      {/* 8.1 Atmosphere: Center Glow with L3 slow animation */}
      <div className={cn(
        VS.atmosphere.glowCenter,
        "w-[600px] h-[300px] bg-teal-500/5 blur-[100px]",
        VS.motion.decorative.glowSlow
      )} />

      <Container className="relative z-10">
        <div className="text-center mb-16">
          {/* 7.1 Section Gradient: Core Modules - Tech Blueprint */}
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-4">
            <span className={VS.gradient.coreModules}>
              {coreModules?.title || 'Core Modules'}
            </span>
          </h2>
          <p className="text-muted-foreground">
            {coreModules?.description || 'The architecture behind the magic.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat, idx) => (
            <div
              key={idx}
              className="group p-6 rounded-2xl bg-glass-subtle border border-white/5 hover:border-primary/30 transition-all duration-300 hover:bg-glass-strong"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_-5px_var(--color-primary)]">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
