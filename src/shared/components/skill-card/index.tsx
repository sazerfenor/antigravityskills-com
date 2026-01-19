'use client';

/**
 * SkillCard - Grid card for Skills list page
 *
 * Design: Course/Learning path card style (based on Stitch design)
 * - Emoji icon placeholder (48x48)
 * - Colored level badge (Expert/Intermediate/Beginner)
 * - Title and description
 * - Stats footer with "View" link
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { m } from 'framer-motion';

import { cn } from '@/shared/lib/utils';

// ==================== Types ====================

export interface SkillCardData {
  id: string;
  title: string;
  seoSlug: string;
  seoDescription?: string | null;
  visualTags?: string[];
  downloadCount?: number;
  likeCount?: number;
  user?: { name: string } | null;
  createdAt?: Date | string | null;
  // Optional level for colored badge
  level?: 'beginner' | 'intermediate' | 'expert';
  // Skill icon (Lucide icon name, e.g., "Code", "Palette")
  // If provided, renders Lucide icon; otherwise falls back to emoji
  skillIcon?: string | null;
}

export interface SkillCardProps {
  skill: SkillCardData;
  index?: number;
}

// ==================== Level Badge Config ====================

const LEVEL_CONFIG = {
  beginner: {
    label: 'Beginner',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  intermediate: {
    label: 'Intermediate',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  expert: {
    label: 'Expert',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

// Derive level from tags or default to intermediate
function deriveLevel(tags?: string[]): 'beginner' | 'intermediate' | 'expert' {
  if (!tags || tags.length === 0) return 'intermediate';
  const lowerTags = tags.map(t => t.toLowerCase());
  if (lowerTags.some(t => t.includes('beginner') || t.includes('basic') || t.includes('intro'))) {
    return 'beginner';
  }
  if (lowerTags.some(t => t.includes('expert') || t.includes('advanced') || t.includes('pro'))) {
    return 'expert';
  }
  return 'intermediate';
}

// Default emoji when skillIcon is missing
const DEFAULT_EMOJI = '📦';

// ==================== Animation Variants ====================

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      delay: Math.min(index * 0.05, 0.5),
    },
  }),
};

// ==================== Component ====================

export function SkillCard({ skill, index = 0 }: SkillCardProps) {
  // Derive level from tags
  const level = skill.level || deriveLevel(skill.visualTags);
  const levelConfig = LEVEL_CONFIG[level];

  // Get emoji icon (skillIcon should be an emoji from SEO generator)
  const emoji = skill.skillIcon || DEFAULT_EMOJI;

  // Detail URL
  const detailUrl = `/skills/${skill.seoSlug || skill.id}`;

  return (
    <m.article
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <Link href={detailUrl} className="block h-full">
        <div
          className={cn(
            // Base card style - matching Stitch design
            'bg-card border border-border rounded-lg p-5',
            'flex flex-col h-full min-h-[220px]',
            // Hover effects
            'transition-all duration-200',
            'hover:border-primary/50 hover:shadow-lg'
          )}
        >
          {/* Top Section: Icon + Level Badge */}
          <div className="flex justify-between items-start mb-4">
            {/* Icon: Emoji from skillIcon */}
            <div
              className={cn(
                'w-12 h-12 rounded flex items-center justify-center',
                'bg-secondary'
              )}
            >
              <span className="text-2xl">{emoji}</span>
            </div>

            {/* Level Badge - Colored */}
            <span
              className={cn(
                'px-2 py-1 text-[10px] font-bold uppercase rounded',
                levelConfig.className
              )}
            >
              {levelConfig.label}
            </span>
          </div>

          {/* Title - 直接使用，不再需要前端转换 */}
          <h3
            className={cn(
              'font-bold text-lg mb-2',
              'text-foreground',
              'group-hover:text-primary transition-colors'
            )}
          >
            {skill.title}
          </h3>

          {/* Description */}
          <p
            className={cn(
              'text-sm text-muted-foreground',
              'line-clamp-3 mb-4 flex-1',
              'leading-relaxed'
            )}
          >
            {skill.seoDescription || 'No description available.'}
          </p>

          {/* Footer: Stats + View Link */}
          <div
            className={cn(
              'pt-4 border-t border-border',
              'flex items-center justify-between',
              'text-xs'
            )}
          >
            {/* Downloads */}
            <span className="text-muted-foreground font-medium">
              {skill.downloadCount || 0} Downloads
            </span>

            {/* View Link */}
            <span
              className={cn(
                'text-primary font-bold uppercase',
                'flex items-center gap-1',
                'group-hover:underline'
              )}
            >
              View Skill
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </m.article>
  );
}
