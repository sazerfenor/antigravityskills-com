'use client';

import type { Variants } from 'framer-motion';
import { m } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { VS } from '@/shared/lib/design-tokens';
import { SmartIcon } from '@/shared/blocks/common';

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

// Category gradient backgrounds (used when no cover image)
const CATEGORY_GRADIENTS: Record<string, string> = {
  'development-workflow': 'from-blue-600/80 via-blue-500/60 to-indigo-600/80',
  'debugging-analysis': 'from-red-600/80 via-orange-500/60 to-amber-600/80',
  'frontend-design': 'from-pink-600/80 via-purple-500/60 to-violet-600/80',
  'documentation': 'from-green-600/80 via-emerald-500/60 to-teal-600/80',
  'ai-automation': 'from-cyan-600/80 via-blue-500/60 to-purple-600/80',
  'data-research': 'from-indigo-600/80 via-blue-500/60 to-cyan-600/80',
  'creative-content': 'from-rose-600/80 via-pink-500/60 to-fuchsia-600/80',
  'operations-devops': 'from-slate-600/80 via-zinc-500/60 to-neutral-600/80',
};

interface SkillCategoryItem {
  slug: string;
  title: string;
  count: number;
  icon?: string;
  coverImage?: string;
}

interface SkillTrendingItem {
  slug: string;
  title: string;
  count: number;
}

interface CategoryCardProps extends SkillCategoryItem {
  index?: number;
  isHero?: boolean;
}

/**
 * CategoryCard - Skills Category Card
 *
 * Uses gradient backgrounds instead of images for skills categories.
 * Maintains Cyberpunk glass borders and neon hover effects.
 */
function CategoryCard({
  slug,
  title,
  count,
  icon,
  coverImage,
  index = 0,
  isHero = false,
}: CategoryCardProps) {
  const gradient = CATEGORY_GRADIENTS[slug] || 'from-primary/80 via-primary/60 to-primary/80';
  const hasImage = coverImage && !coverImage.includes('placeholder');

  return (
    <Link
      href={`/skills?category=${slug}`}
      aria-label={`Browse ${title} - ${count} skills`}
    >
      <m.div
        variants={isHero ? heroVariants : cardVariants}
        whileHover={{ y: -8, transition: { duration: 0.4 } }}
        className={cn(
          // Magazine-style layout
          'group relative overflow-hidden cursor-pointer',
          isHero
            ? 'aspect-[3/4] lg:aspect-auto lg:h-full lg:min-h-[480px]'
            : 'aspect-[4/5]',
          // Cyberpunk Glass System
          'rounded-xl',
          VS.glass.border,
          // Cyberpunk neon hover effect
          'hover:border-primary/40',
          'transition-all duration-500',
          'hover:shadow-[0_20px_60px_-15px_var(--color-primary)]'
        )}
      >
        {/* Background - Gradient or Image */}
        {hasImage ? (
          <div
            className={cn(
              'absolute inset-0 bg-cover bg-center',
              'transition-transform duration-700 ease-out',
              'group-hover:scale-105'
            )}
            style={{ backgroundImage: `url(${coverImage})` }}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0',
              `bg-gradient-to-br ${gradient}`,
              'transition-all duration-700 ease-out',
              'group-hover:opacity-90'
            )}
          />
        )}

        {/* Pattern Overlay for visual interest */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]'
          )}
        />

        {/* Dark Gradient Overlay */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-t from-black/80 via-black/30 to-transparent',
            'transition-opacity duration-500',
            'group-hover:from-black/60'
          )}
        />

        {/* Icon - Centered for visual impact */}
        {icon && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity duration-500">
            <SmartIcon
              name={icon}
              className={cn(
                isHero ? 'w-32 h-32' : 'w-20 h-20',
                'text-white'
              )}
            />
          </div>
        )}

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
                'text-primary',
                'drop-shadow-[0_0_8px_var(--color-primary)]'
              )}
            >
              {formatCount(count)}
            </span>
          </div>

          {/* Hero Card Extra Description */}
          {isHero && (
            <p className="mt-2 text-sm text-white/60 font-light tracking-wide">
              Explore {formatCount(count)} community skills
            </p>
          )}
        </div>

        {/* Hover Border Glow - Cyberpunk Neon Border */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl pointer-events-none',
            'border border-primary/0 transition-all duration-500',
            'group-hover:border-primary/30',
            'group-hover:shadow-[inset_0_0_20px_-10px_var(--color-primary)]'
          )}
        />
      </m.div>
    </Link>
  );
}

interface TrendingPillProps extends SkillTrendingItem {
  index?: number;
}

/**
 * TrendingPill - Trending Skill Pill
 *
 * Editorial tag style with Cyberpunk glass and neon hover.
 */
function TrendingPill({ slug, title, count, index = 0 }: TrendingPillProps) {
  return (
    <Link href={`/skills/${slug}`} aria-label={`Skill: ${title}`}>
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
          VS.glass.base,
          VS.glass.border,
          // Typography - Magazine Spacing
          'text-sm tracking-wide text-muted-foreground',
          // Cyberpunk Hover - Neon Glow
          'transition-all duration-300',
          'hover:border-primary/50',
          'hover:text-foreground',
          'hover:shadow-[0_0_20px_-5px_var(--color-primary)]'
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
          {formatCount(count)}
        </span>
      </m.div>
    </Link>
  );
}

interface SkillsEntranceClientProps {
  categories: SkillCategoryItem[];
  trending: SkillTrendingItem[];
  ctaUrl?: string;
  ctaText?: string;
}

/**
 * SkillsEntranceClient - Skills Gallery with Magazine Grid
 *
 * Combines magazine-style asymmetric layout with Cyberpunk visual elements.
 */
export function SkillsEntranceClient({
  categories,
  trending,
  ctaUrl = '/skills',
  ctaText = 'Browse All Skills',
}: SkillsEntranceClientProps) {
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
      {trending.length > 0 && (
        <div className="space-y-6">
          {/* Trending Header - Cyberpunk Editorial Bar */}
          <div className="flex items-center gap-4">
            {/* Cyberpunk Neon Accent Line */}
            <div className="w-10 h-px bg-gradient-to-r from-primary/80 to-primary/20" />

            {/* Title - Mono Font for Cyberpunk Style */}
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary/80">
              Trending Skills
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
      )}

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
