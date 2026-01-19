import { cn } from '@/shared/lib/utils';
import { Gallery as GalleryType } from '@/shared/types/blocks/landing';
import { Section, Container } from '@/shared/components/ui/layout';
import { Button } from '@/shared/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { VS } from '@/shared/lib/design-tokens';
import { LibraryMarquee, SkillItem } from './library-marquee';

/**
 * Library Section - Skills Showcase with Infinite Scroll Marquee
 *
 * Replaces the old Gallery component for homepage.
 * Features:
 * - Title: "Curated Skills: The Vibe Coder's Toolkit"
 * - Infinite scroll marquee with skill cards (single row, large cards)
 * - Pause on hover, click for details
 * - "Browse All" CTA button
 *
 * Skills data is now configured in landing.json (gallery.skills)
 *
 * @see homepage_content_matrix.md Level 3: Library (The Proof)
 */
export function Library({
  gallery,
  className,
}: {
  gallery: GalleryType & { skills?: SkillItem[] };
  className?: string;
}) {
  const ctaButton = gallery.buttons?.[0];
  const skills = gallery.skills || [];

  return (
    <Section
      id={gallery.id || 'library'}
      spacing="none"
      className={cn(gallery.className, className, 'relative overflow-hidden py-12 md:py-16 bg-transparent')}
      aria-label="Skills Library"
    >
      {/* Removed: Cyberpunk Center Glow - now using global particles */}

      <Container className="relative z-10">
        {/* Section Header - Compact */}
        <div className="text-center mb-8 space-y-2">
          <h2
            className={cn(
              'text-2xl md:text-3xl font-bold tracking-tight',
              'text-foreground'
            )}
          >
            {gallery.title || (
              <>
                Curated <span className={VS.gradient.gallery}>Skills</span>
              </>
            )}
          </h2>

          {gallery.description && (
            <p className="font-mono text-xs text-muted-foreground opacity-70 uppercase tracking-widest">
              {gallery.description}
            </p>
          )}
        </div>

        {/* Infinite Scroll Marquee - Single Row */}
        <LibraryMarquee skills={skills} />

        {/* Browse All Button */}
        {ctaButton && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="secondary"
              size="lg"
              className={cn(
                VS.button.base,
                'gap-2'
              )}
              asChild
            >
              <a href={ctaButton.url || '/skills'}>
                {ctaButton.text || 'Browse All'}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </Container>
    </Section>
  );
}
