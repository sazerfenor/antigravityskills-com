import { cn } from '@/shared/lib/utils';
import { Gallery as GalleryType } from '@/shared/types/blocks/landing';
import { Section, Container } from '@/shared/components/ui/layout';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { VS } from '@/shared/lib/design-tokens';
import { SkillsEntranceClient } from './skills-entrance-client';
import { getSkillsEntranceData } from '@/shared/services/skills-entrance';

/**
 * SkillsEntrance - Skills Gallery Entrance Section
 *
 * A curated skills entrance section that combines:
 * - Magazine-style asymmetric grid layout (5+7 columns)
 * - Cyberpunk glass borders and neon hover effects
 * - Editorial trending topics bar
 *
 * Features:
 * - 5 category cards with gradient backgrounds
 * - Trending skills pills with neon glow
 * - Cinematic entrance animations
 * - Responsive design with mobile horizontal scroll
 *
 * Data Source:
 * - Dynamic data from getSkillsEntranceData() service
 * - Fallback to gallery prop for static config (title, description, buttons)
 */
export async function SkillsEntrance({
  gallery,
  className,
}: {
  gallery: GalleryType;
  className?: string;
}) {
  // 从 Service 获取动态数据
  const { categories: dynamicCategories, trending: dynamicTrending } =
    await getSkillsEntranceData();

  // 转换为前端组件需要的格式
  const categories = dynamicCategories.map((cat) => ({
    slug: cat.slug,
    title: cat.title,
    count: cat.count,
    icon: cat.icon,
    coverImage: cat.coverImage,
  }));

  const trending = dynamicTrending.map((trend) => ({
    slug: trend.slug,
    title: trend.title,
    count: trend.downloadCount,
  }));

  const ctaButton = gallery.buttons?.[0];

  return (
    <Section
      id={gallery.id || 'skills-gallery'}
      spacing="default"
      className={cn(gallery.className, className, 'relative overflow-hidden')}
      aria-label="Skills Gallery"
    >
      {/* Cyberpunk Center Glow - VS.atmosphere.glowCenter */}
      <div
        className={cn(
          VS.atmosphere.glowCenter,
          'w-[700px] h-[400px]',
          'bg-gradient-to-br from-blue-500/5 via-primary/5 to-indigo-500/5',
          'blur-[120px]',
          VS.motion.decorative.glowSlow // 8s animation
        )}
      />

      <Container className="relative z-10">
        {/* Section Header - Cyberpunk Gallery Style */}
        <ScrollAnimation>
          <div className="text-center mb-16 space-y-4">
            <h2
              className={cn(
                VS.typography.h2, // text-3xl md:text-5xl font-bold tracking-tight
                'text-foreground'
              )}
            >
              {gallery.title || (
                <>
                  Skills Gallery:{' '}
                  <span className={VS.gradient.gallery}>Community Favorites</span>
                </>
              )}
            </h2>

            {gallery.description && (
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {gallery.description}
              </p>
            )}
          </div>
        </ScrollAnimation>

        {/* Client Component with Categories and Trending */}
        <ScrollAnimation delay={0.2}>
          <SkillsEntranceClient
            categories={categories}
            trending={trending}
            ctaUrl={ctaButton?.url || '/skills'}
            ctaText={ctaButton?.text || 'Browse All Skills'}
          />
        </ScrollAnimation>
      </Container>
    </Section>
  );
}
