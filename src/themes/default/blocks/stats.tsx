import { FadeIn } from '@/shared/components/ui/fade-in';
import { Section, Container } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { Stats as StatsType } from '@/shared/types/blocks/landing';

// Neon Colors Ring - Using VS tokens
const NEON_COLORS = [
  VS.neon.primary,
  VS.neon.secondary,
  VS.neon.accent,
];

/**
 * Stats component - Cyberpunk Clean Style (v5.0)
 *
 * Features scanline effect and Data Flow gradient.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 7, 8.1
 */
export function Stats({
  stats,
  className,
}: {
  stats: StatsType;
  className?: string;
}) {
  return (
    <Section
      id={stats.id}
      spacing="default"
      className={cn("relative overflow-hidden py-20", stats.className, className)}
    >
      {/* 8.1 Atmosphere: Scanline effect */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        VS.atmosphere.scanline,
        "animate-scanline"
      )} />

      <Container className="relative z-10">
        {/* Header - Optional, only if title/description provided */}
        {(stats.title || stats.description) && (
          <FadeIn>
            <div className="mx-auto max-w-xl space-y-4 text-center mb-16">
              {stats.title && (
                // 7.1 Section Gradient: Stats - Data Trust
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  <span className={VS.gradient.stats}>{stats.title}</span>
                </h2>
              )}
              {stats.description && (
                <p className="text-muted-foreground text-lg">
                  {stats.description}
                </p>
              )}
            </div>
          </FadeIn>
        )}

        {/* Stats Grid - Clean, no container box */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            {stats.items?.map((item, idx) => (
              <div className="flex flex-col items-center p-4 pt-8 md:pt-4" key={idx}>
                {/* Neon Number with glow */}
                <span className={cn(
                  "text-5xl md:text-6xl font-black tracking-tighter mb-2",
                  NEON_COLORS[idx % NEON_COLORS.length]
                )}>
                  {item.title}
                </span>
                {/* Label */}
                <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
