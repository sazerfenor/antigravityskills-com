import { Skeleton } from '@/shared/components/ui/skeleton';
import { Section, Container } from '@/shared/components/ui/layout';
import { GallerySkeleton as BaseGallerySkeleton } from '@/shared/components/gallery/gallery-skeleton';

// ==================== Generator Section Skeleton ====================

/**
 * Skeleton for the Generator Section.
 * Matches the exact layout: title, description, and 600px generator area.
 * Prevents CLS during streaming render.
 */
export function GeneratorSectionSkeleton() {
  return (
    <Section id="generator-skeleton" spacing="default" className="relative overflow-hidden">
      {/* Background - simplified, no blur on mobile for performance */}
      <div className="absolute inset-0 bg-background/50 -z-10 md:backdrop-blur-3xl" />
      
      <Container>
        {/* Title & Description Skeleton */}
        <div className="flex flex-col items-center text-center mb-12">
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        {/* Generator Area Skeleton */}
        <div className="w-full max-w-6xl mx-auto bg-card/30 border border-border-medium rounded-2xl p-6 md:p-8">
          <Skeleton className="w-full h-[600px] rounded-xl" />
        </div>
      </Container>
    </Section>
  );
}

// ==================== Landing Gallery Skeleton ====================

/**
 * High-fidelity skeleton for the Landing Page Gallery section.
 * CBDS v2.0 Compliance: Uses <Section> + <Container> to match real Gallery layout.
 * Prevents Cumulative Layout Shift (CLS) during streaming render.
 */
export function LandingGallerySkeleton() {
  return (
    <Section id="gallery-skeleton" spacing="default">
      <Container>
        {/* Title & Description Skeleton - matches Gallery header */}
        <div className="flex flex-col gap-3 text-balance mb-8">
          <Skeleton className="h-8 w-64 sm:w-80 md:w-96" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>

        {/* Grid Skeleton */}
        <BaseGallerySkeleton count={9} />
      </Container>
    </Section>
  );
}

// Re-export base GallerySkeleton for other uses (non-landing pages)
export { BaseGallerySkeleton as GallerySkeleton };
