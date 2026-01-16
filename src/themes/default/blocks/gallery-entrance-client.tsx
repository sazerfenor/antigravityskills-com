'use client';

import type { Variants } from 'framer-motion';
import { m } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { VS } from '@/shared/lib/design-tokens';
import type { GalleryCategoryItem, GalleryTrendingItem } from '@/shared/types/blocks/landing';

// Format count to K format for better readability
const formatCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

// Animation variants for cinematic entrance
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

const heroVariants: Variants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface CategoryCardProps extends GalleryCategoryItem {
  index?: number;
  isHero?: boolean;
}

/**
 * CategoryCard - Cyberpunk Gallery Fusion
 *
 * Combines magazine-style full-bleed imagery with Cyberpunk glass borders
 * and neon hover effects.
 */
function CategoryCard({
  slug,
  title,
  count,
  coverImage,
  index = 0,
  isHero = false,
}: CategoryCardProps) {
  return (
    <Link
      href={`/skills?category=${slug}`}
      aria-label={`Browse ${title} - ${count} skills`}
    >
      <m.div
        variants={isHero ? heroVariants : cardVariants}
        whileHover={{ y: -8, transition: { duration: 0.4 } }}
        className={cn(
          // Magazine-style image-dominant layout
          'group relative overflow-hidden cursor-pointer',
          isHero
            ? 'aspect-[3/4] lg:aspect-auto lg:h-full lg:min-h-[480px]'
            : 'aspect-[4/5]',
          // Cyberpunk Glass System
          'rounded-xl',
          VS.glass.border, // border border-border-medium
          // Cyberpunk neon hover effect
          'hover:border-primary/40',
          'transition-all duration-500',
          'hover:shadow-[0_20px_60px_-15px_rgba(250,204,21,0.15)]'
        )}
      >
        {/* Full Bleed Image - Magazine Core */}
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes={
            isHero
              ? '(max-width: 1024px) 100vw, 42vw'
              : '(max-width: 768px) 50vw, 25vw'
          }
          className={cn(
            'object-cover',
            'transition-transform duration-700 ease-out',
            'group-hover:scale-105'
          )}
        />

        {/* Cyberpunk Gradient Overlay */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-t from-black/80 via-black/30 to-transparent',
            'transition-opacity duration-500',
            'group-hover:from-black/60'
          )}
        />

        {/* Content - Bottom Info Area */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Cyberpunk Accent Line */}
          <div className="w-8 h-px bg-primary/60 mb-3 transition-all duration-300 group-hover:w-12 group-hover:bg-primary" />

          <div className="flex items-end justify-between">
            {/* Title - Magazine Elegant Font Weight */}
            <h3
              className={cn(
                isHero ? 'text-xl lg:text-2xl' : 'text-base',
                'font-medium text-white',
                'tracking-wide',
                'transition-transform duration-300',
                'group-hover:translate-x-1'
              )}
            >
              {title}
            </h3>

            {/* Count - Cyberpunk Neon Number */}
            <span
              className={cn(
                isHero ? 'text-lg' : 'text-sm',
                'font-light tabular-nums',
                'text-primary', // Neon yellow
                'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' // Glow effect
              )}
            >
              {formatCount(count)}
            </span>
          </div>

          {/* Hero Card Extra Description */}
          {isHero && (
            <p className="mt-2 text-sm text-white/60 font-light tracking-wide">
              Explore {formatCount(count)} creative prompts
            </p>
          )}
        </div>

        {/* Hover Border Glow - Cyberpunk Neon Border */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl pointer-events-none',
            'border border-primary/0 transition-all duration-500',
            'group-hover:border-primary/30',
            'group-hover:shadow-[inset_0_0_20px_-10px_rgba(250,204,21,0.2)]'
          )}
        />
      </m.div>
    </Link>
  );
}

interface TrendingPillProps extends GalleryTrendingItem {
  index?: number;
}

/**
 * TrendingPill - Cyberpunk Fusion Version
 *
 * Editorial tag style with Cyberpunk glass and neon hover.
 */
function TrendingPill({ slug, title, count, index = 0 }: TrendingPillProps) {
  return (
    <Link href={`/skills/trending/${slug}`} aria-label={`Trending: ${title}`}>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          delay: 0.3 + index * 0.05,
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn(
          // Cyberpunk Glass Base
          'inline-flex items-center gap-2.5 cursor-pointer',
          'px-4 py-2.5 min-h-[44px]',
          'rounded-full',
          VS.glass.base, // bg-glass-subtle backdrop-blur-md
          VS.glass.border, // border border-border-medium
          // Typography - Magazine Spacing
          'text-sm tracking-wide text-muted-foreground',
          // Cyberpunk Hover - Neon Glow
          'transition-all duration-300',
          'hover:border-primary/50',
          'hover:text-foreground',
          'hover:shadow-[0_0_20px_-5px_rgba(250,204,21,0.3)]'
        )}
      >
        <span className="font-medium">{title}</span>
        {/* Cyberpunk Neon Count Badge */}
        <span
          className={cn(
            'text-xs font-bold px-1.5 py-0.5 rounded',
            'bg-primary/10 text-primary',
            'transition-all duration-300'
          )}
        >
          {count}
        </span>
      </m.div>
    </Link>
  );
}

interface GalleryEntranceClientProps {
  categories: GalleryCategoryItem[];
  trending: GalleryTrendingItem[];
  ctaUrl?: string;
  ctaText?: string;
}

/**
 * GalleryEntranceClient - Cyberpunk Gallery with Magazine Grid
 *
 * Combines magazine-style asymmetric layout with Cyberpunk visual elements.
 */
export function GalleryEntranceClient({
  categories,
  trending,
  ctaUrl = '/skills',
  ctaText = 'View All Collections',
}: GalleryEntranceClientProps) {
  return (
    <div className="space-y-12">
      {/* Categories Grid - Magazine Asymmetric Layout (5+7 columns) */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6"
      >
        {/* Hero Card - Left 5 columns */}
        {categories[0] && (
          <div className="lg:col-span-5 lg:row-span-2">
            <CategoryCard {...categories[0]} isHero index={0} />
          </div>
        )}

        {/* Right 2x2 Grid - 7 columns */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4 lg:gap-6">
          {categories.slice(1).map((cat, i) => (
            <CategoryCard key={cat.slug} {...cat} index={i + 1} />
          ))}
        </div>
      </m.div>

      {/* Trending Section - Editorial Bar */}
      <div className="space-y-6">
        {/* Trending Header - Cyberpunk Editorial Bar */}
        <div className="flex items-center gap-4">
          {/* Cyberpunk Neon Accent Line */}
          <div className="w-10 h-px bg-gradient-to-r from-primary/80 to-primary/20" />

          {/* Title - Mono Font for Cyberpunk Style */}
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary/80">
            Trending Topics
          </span>

          {/* Extension Line */}
          <div className="flex-1 h-px bg-gradient-to-r from-border-medium/50 to-transparent" />
        </div>

        {/* Trending Pills */}
        <div className="flex flex-wrap gap-3">
          {trending.map((item, i) => (
            <TrendingPill key={item.slug} {...item} index={i} />
          ))}
        </div>
      </div>

      {/* CTA Button - Magazine Style Link */}
      <m.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <Link
          href={ctaUrl}
          className={cn(
            'inline-flex items-center gap-3',
            'text-sm uppercase tracking-[0.2em] text-muted-foreground',
            'hover:text-foreground transition-colors duration-300',
            'group'
          )}
        >
          <span>{ctaText}</span>
          <ArrowRight
            className={cn(
              'w-4 h-4',
              'transition-transform duration-300',
              'group-hover:translate-x-1'
            )}
          />
        </Link>
      </m.div>
    </div>
  );
}
