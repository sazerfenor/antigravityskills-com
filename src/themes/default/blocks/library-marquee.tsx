'use client';

import { cn } from '@/shared/lib/utils';
import { Marquee } from '@/shared/components/ui/marquee';
import { Star } from 'lucide-react';
import { Link } from '@/core/i18n/navigation';

export interface SkillItem {
  name: string;
  tag: string;
  description: string;
  stars: number;
  icon: string;
}

function SkillCard({ skill }: { skill: SkillItem }) {
  return (
    <Link
      href="/skills"
      className={cn(
        // Card base - larger, more informative
        'group flex flex-col gap-3 p-5 rounded-2xl w-[280px] shrink-0',
        // Glass effect - semi-transparent with blur
        'bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20',
        'backdrop-blur-lg shadow-md',
        // Hover: Neon glow effect
        'hover:border-primary/50 hover:bg-white/50 dark:hover:bg-white/20',
        'hover:shadow-[0_0_30px_-10px_var(--color-primary)]',
        'transition-all duration-300',
        'cursor-pointer'
      )}
    >
      {/* Header: Icon + Title + Tag */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {skill.name}
          </h3>
          <span className="text-xs text-muted-foreground">
            {skill.tag}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {skill.description}
      </p>

      {/* Footer: Stars */}
      <div className="flex items-center gap-0.5 mt-auto">
        {Array.from({ length: skill.stars }).map((_, i) => (
          <Star
            key={i}
            className="h-3.5 w-3.5 fill-primary/80 text-primary/80"
          />
        ))}
      </div>
    </Link>
  );
}

interface LibraryMarqueeProps {
  skills: SkillItem[];
  className?: string;
}

/**
 * Library Marquee - Single row infinite scrolling Skills showcase
 *
 * Design inspired by lobehub.com:
 * - Single row, large cards
 * - Rich information (icon, title, tag, description, stars)
 * - Pause on hover
 * - Neon glow hover effects
 *
 * Skills data is now passed from landing.json via props
 */
export function LibraryMarquee({ skills, className }: LibraryMarqueeProps) {
  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Single row, slow scroll for readability */}
      <Marquee duration={60} direction="left" gap={20}>
        {skills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </Marquee>
    </div>
  );
}
