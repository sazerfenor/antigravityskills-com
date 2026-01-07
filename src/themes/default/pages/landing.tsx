import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { Landing } from '@/shared/types/blocks/landing';
import {
  CoreModules,
  Features,
  FeaturesAccordion,
  GalleryEntrance,
  Hero,
} from '@/themes/default/blocks';
import { LandingGallerySkeleton, GeneratorSectionSkeleton } from '@/themes/default/components/skeletons';

// 🚀 Dynamic imports for below-the-fold components (code splitting)
const Stats = dynamic(() => import('@/themes/default/blocks/stats').then(mod => ({ default: mod.Stats })));
const Testimonials = dynamic(() => import('@/themes/default/blocks/testimonials').then(mod => ({ default: mod.Testimonials })));
const Subscribe = dynamic(() => import('@/themes/default/blocks/subscribe').then(mod => ({ default: mod.Subscribe })));
const FAQ = dynamic(() => import('@/themes/default/blocks/faq').then(mod => ({ default: mod.Faq })));
const CTA = dynamic(() => import('@/themes/default/blocks/cta').then(mod => ({ default: mod.Cta })));
const GeneratorSection = dynamic(() => import('@/themes/default/blocks/generator-section').then(mod => ({ default: mod.GeneratorSection })));

export default async function LandingPage({
  locale,
  page,
}: {
  locale?: string;
  page: Landing;
}) {
  // Section visibility control - default to true if not specified
  const v = page.section_visibility || {};

  return (
    <>
      {v.show_hero !== false && page.hero && (
        <Hero
          hero={page.hero}
          logos={v.show_logos !== false ? page.logos : undefined}
        />
      )}

      {/* Features - Logic Declassified section */}
      {v.show_features !== false && page.features && <Features features={page.features} />}

      {/* Generator wrapped in Suspense for streaming render */}
      {v.show_generator !== false && page.generator && (
        <Suspense fallback={<GeneratorSectionSkeleton />}>
          <GeneratorSection title={page.generator.title} description={page.generator.description} />
        </Suspense>
      )}

      {/* Gallery Entrance - Curated Collections */}
      {v.show_gallery !== false && page.gallery && (
        <GalleryEntrance gallery={page.gallery} />
      )}

      {v.show_core_modules !== false && <CoreModules coreModules={page.core_modules} />}

      {v.show_benefits !== false && page.benefits && <FeaturesAccordion features={page.benefits} />}
      {v.show_testimonials !== false && page.testimonials && <Testimonials testimonials={page.testimonials} />}
      {v.show_subscribe !== false && page.subscribe && (
        <Subscribe subscribe={page.subscribe} />
      )}
      {v.show_faq !== false && page.faq && <FAQ faq={page.faq} />}
      {v.show_stats !== false && page.stats && <Stats stats={page.stats} />}
      {v.show_cta !== false && page.cta && <CTA cta={page.cta} />}
    </>
  );
}

