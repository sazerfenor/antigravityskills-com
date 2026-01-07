import { cn } from '@/shared/lib/utils';
import { Gallery as GalleryType } from '@/shared/types/blocks/landing';
import { Section, Container } from '@/shared/components/ui/layout';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { VS } from '@/shared/lib/design-tokens';
import { GalleryEntranceClient } from './gallery-entrance-client';
import { getGalleryEntranceData } from '@/shared/services/gallery-entrance';

/**
 * GalleryEntrance - Cyberpunk Gallery with Magazine Grid (v1.0)
 *
 * A curated collections entrance section that combines:
 * - Magazine-style asymmetric grid layout (5+7 columns)
 * - Cyberpunk glass borders and neon hover effects
 * - Editorial trending topics bar
 *
 * Features:
 * - 5 category cards with full-bleed imagery
 * - Trending topics pills with neon glow
 * - Cinematic entrance animations
 * - Responsive design with mobile horizontal scroll
 *
 * Data Source:
 * - Dynamic data from getGalleryEntranceData() service
 * - Fallback to gallery prop for static config (title, description, buttons)
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 5-9 for VS tokens
 * @see /Users/lixuanying/.claude/plans/concurrent-juggling-wilkes.md for design spec
 */
export async function GalleryEntrance({
  gallery,
  className,
}: {
  gallery: GalleryType;
  className?: string;
}) {
  // 从 Service 获取动态数据
  const { categories: dynamicCategories, trending: dynamicTrending } =
    await getGalleryEntranceData();

  // 转换为前端组件需要的格式 (GalleryCategoryItem, GalleryTrendingItem)
  const categories = dynamicCategories.map((cat) => ({
    slug: cat.slug,
    title: cat.title,
    count: cat.count,
    icon: 'Camera', // Default icon - not used in current design
    coverImage: cat.coverImage,
  }));

  const trending = dynamicTrending.map((trend) => ({
    slug: trend.slug,
    title: trend.title,
    count: trend.postCount, // Map postCount to count for GalleryTrendingItem
  }));

  const ctaButton = gallery.buttons?.[0];

  return (
    <Section
      id={gallery.id || 'gallery'}
      spacing="default"
      className={cn(gallery.className, className, 'relative overflow-hidden')}
      aria-label="Gallery Collections"
    >
      {/* Cyberpunk Center Glow - VS.atmosphere.glowCenter */}
      <div
        className={cn(
          VS.atmosphere.glowCenter,
          'w-[700px] h-[400px]',
          'bg-gradient-to-br from-rose-500/5 via-primary/5 to-purple-500/5',
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
                  Curated{' '}
                  <span className={VS.gradient.gallery}>Collections</span>
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
          <GalleryEntranceClient
            categories={categories}
            trending={trending}
            ctaUrl={ctaButton?.url || '/prompts'}
            ctaText={ctaButton?.text || 'View All Collections'}
          />
        </ScrollAnimation>
      </Container>
    </Section>
  );
}
