import Image from 'next/image';
import { Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { ParticlesBackground } from '@/shared/components/ui/particles-background';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { Hero as HeroType, Logos as LogosType } from '@/shared/types/blocks/landing';

import { HeroSearchClient } from './hero-search-client';
import { SocialAvatars } from './social-avatars';

/**
 * Hero component - Cyberpunk Reskin (v5.0)
 *
 * PERFORMANCE OPTIMIZED:
 * - Server Component for faster LCP (no 'use client')
 * - Critical text content renders immediately without animation delays
 * - Only HeroSearchClient is a client component
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 5.4, 6, 7
 */
export function Hero({
  hero,
  logos,
  className,
}: {
  hero: HeroType;
  logos?: LogosType;
  className?: string;
}) {
  return (
    <section
      id={hero.id}
      className={cn(
        "relative overflow-hidden",
        VS.poster.hero, // 5.4 Poster Layout: min-h-[85vh] + flex-center
        hero.className,
        className
      )}
    >
      {/* 8.1 Atmosphere: Aurora Top */}
      <div className={cn("absolute inset-0", VS.atmosphere.auroraTop)} />
      {/* L3 Decorative: Slow glow (8s) - replaces animate-pulse */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none",
        VS.motion.decorative.glowSlow
      )} />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center text-center">

        {hero.announcement && (
          <div className="mt-8">
            {/* 5.3 Form System: Pill Badge - static dot with glow (no ping) */}
            <Link
              href={hero.announcement.url || ''}
              target={hero.announcement.target || '_self'}
              className={cn(
                "inline-flex items-center gap-2 mb-8",
                VS.pill,
                "border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary",
                "shadow-[0_0_15px_-5px_var(--color-primary)] hover:shadow-[0_0_20px_-5px_var(--color-primary)] hover:scale-105 transition-all duration-300"
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">
                {hero.announcement.title}
              </span>
              {/* Static dot with subtle glow - no ping animation per Motion Discipline */}
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(37,99,235,0.6)]" />
            </Link>
          </div>
        )}

        {/* 7.1 Section Gradient: Hero - Warm Ignition - NO FADE ANIMATION FOR LCP */}
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-7xl mb-6">
          {hero.title ? (
            <>
              {hero.title.split(hero.highlight_text || '')[0]}
              <span className={VS.gradient.hero}>
                {hero.highlight_text || ''}
              </span>
              {hero.title.split(hero.highlight_text || '')[1] || ''}
            </>
          ) : (
            <>
              Type Less. Create{' '}
              <span className={VS.gradient.hero}>Masterpieces.</span>
            </>
          )}
        </h1>

        {/* Description - From JSON config - NO FADE ANIMATION FOR LCP */}
        {hero.description && (
          <p
            className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground mb-10"
            dangerouslySetInnerHTML={{ __html: hero.description }}
          />
        )}

        {/* Hero Search Island */}
        {hero.input && (
          <div className="w-full max-w-2xl mb-12 relative z-20">
             <div className="p-1 rounded-full bg-linear-to-b from-white/20 to-white/0">
                <HeroSearchClient
                  placeholder={hero.input.placeholder || ''}
                  buttonText={hero.input.button || ''}
                />
             </div>
          </div>
        )}

        {/* 5.3 Form System: Pill Buttons */}
        {hero.buttons && hero.show_buttons !== false && (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {hero.buttons.map((button, idx) => (
              <Button
                asChild
                size={button.size || 'default'}
                variant={button.variant || 'default'}
                className={cn(
                  VS.button.base, // rounded-full h-12 px-8
                  // Apply Glow to Primary, Ghost style to others
                  (button.variant === 'default' || !button.variant) ? VS.button.glow + " bg-primary text-primary-foreground" : VS.button.ghost
                )}
                key={idx}
              >
                <Link
                  href={button.url ?? ''}
                  target={button.target ?? '_self'}
                  className="flex items-center"
                >
                  {button.icon && <SmartIcon name={button.icon as string} className="mr-2 h-4 w-4" />}
                  <span>{button.title}</span>
                </Link>
              </Button>
            ))}
          </div>
        )}

        {hero.tip && hero.show_tip !== false && (
           <p
              className="text-muted-foreground mt-4 text-sm opacity-70"
              dangerouslySetInnerHTML={{ __html: hero.tip ?? '' }}
            />
        )}

        {hero.show_avatars && (
          <div className="mt-8">
            <SocialAvatars tip={hero.avatars_tip || ''} />
          </div>
        )}

        {/* Logos - Trust indicators inside Hero - reduced visual weight */}
        {logos && logos.items && logos.items.length > 0 && (
          <div className="mt-16 w-full opacity-60 hover:opacity-90 transition-opacity duration-300">
            <p className="text-[10px] font-mono uppercase text-muted-foreground/70 mb-4 text-center tracking-widest">
              {logos.title || 'Powering your workflow in:'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-x-10">
              {logos.items.map((item, idx) => {
                const size = 'h-6 w-auto sm:h-8';
                const url = (item as any).url;

                const content = (
                  <div className="flex items-center justify-center transition-all duration-300 hover:scale-110 grayscale hover:grayscale-0">
                    <Image
                      className={cn(size, "object-contain")}
                      src={item.image?.src ?? ''}
                      alt={item.image?.alt ?? ''}
                      width={80}
                      height={32}
                      loading="eager"
                    />
                  </div>
                );

                return url ? (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity"
                    title={item.title}
                  >
                    {content}
                  </a>
                ) : (
                  <div key={idx}>{content}</div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
