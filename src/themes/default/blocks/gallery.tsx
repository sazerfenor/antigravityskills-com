import { getCommunityPosts } from '@/shared/models/community_post';
import { CommunityPostStatus } from '@/shared/models/community_post';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Gallery as GalleryType } from '@/shared/types/blocks/landing';
import { CommunityGalleryClient } from '@/themes/default/blocks/gallery-client';
import { Section, Container } from '@/shared/components/ui/layout';
import { Button } from '@/shared/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { VS } from '@/shared/lib/design-tokens';

// ISR: Revalidate every 1 hour to match landing page strategy
export const revalidate = 3600;

/**
 * Gallery component - Cyberpunk Style (v5.0)
 *
 * Features section gradient and center glow atmosphere.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 7, 8
 */
export async function Gallery({
  gallery,
  className,
}: {
  gallery: GalleryType;
  className?: string;
}) {
  // Server-side data fetching - always fetch fresh data
  const initialPosts = await getCommunityPosts({
    status: CommunityPostStatus.PUBLISHED,
    sort: 'weighted',
    page: 1,
    limit: 9, // Homepage shows first 9 posts
    getUser: true,
  });

  return (
    <Section
      id={gallery.id || 'gallery'}
      spacing="default"
      className={cn(gallery.className, className, "relative overflow-hidden")}
      aria-label="Community Gallery"
    >
      {/* 8.1 Atmosphere: Center Glow with L3 slow animation */}
      <div className={cn(
        VS.atmosphere.glowCenter,
        "w-[700px] h-[350px] bg-purple-500/5 blur-[120px]",
        VS.motion.decorative.glowSlow
      )} />

      <Container className="relative z-10">
        <ScrollAnimation>
          <div className="flex flex-col gap-3 text-balance items-start mb-8">
            {/* 7.1 Section Gradient: Gallery - Spectrum */}
            {/* TODO: 自定义你的画廊标题 */}
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
              {gallery.title || (
                <>Explore the <span className={VS.gradient.gallery}>Prompt</span> Library</>
              )}
            </h2>
            {gallery.description && (
               <p className="font-mono text-sm text-muted-foreground opacity-70 uppercase tracking-widest">
                 {gallery.description}
               </p>
            )}
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          {/* Client component with pre-loaded data */}
          <div className="mt-8">
            <CommunityGalleryClient initialPosts={initialPosts} />
          </div>
        </ScrollAnimation>

        {/* Explore button - Pill Shape */}
        {gallery.buttons && gallery.buttons.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              size="lg"
              className={cn(
                VS.button.base, 
                VS.button.ghost,
                "rounded-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
              )}
              asChild
            >
              <a href={gallery.buttons[0].url || '/prompts'}>
                {gallery.buttons[0].text || 'Explore All'}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </Container>
    </Section>
  );
}
