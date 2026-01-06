import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { Landing } from '@/shared/types/blocks/landing';
import { brandConfig } from '@/config';
import { getMetadata } from '@/shared/lib/seo';

// SEO Metadata for homepage
export const generateMetadata = getMetadata({
  metadataKey: 'common.metadata',
  canonicalUrl: '/',
});

// ISR: Revalidate every 1 hour (3600 seconds)
export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load page data
  const t = await getTranslations('landing');

  // build page params
  const page: Landing = {
    section_visibility: t.raw('section_visibility'),
    hero: t.raw('hero'),
    logos: t.raw('logos'),
    benefits: t.raw('benefits'),
    features: t.raw('features'),
    stats: t.raw('stats'),
    generator: t.raw('generator'),
    core_modules: t.raw('core_modules'),
    gallery: t.raw('gallery'),
    testimonials: t.raw('testimonials'),
    subscribe: t.raw('subscribe'),
    faq: t.raw('faq'),
    cta: t.raw('cta'),
  };

  // load page component
  const Page = await getThemePage('landing');

  // Construct Schema Markup (JSON-LD)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": brandConfig.name,
    "url": brandConfig.domain
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": brandConfig.name,
    "url": brandConfig.domain,
    "logo": `${brandConfig.domain}/logo.png`,
    "sameAs": [
      brandConfig.social.twitter,
      brandConfig.social.github
    ].filter(Boolean)
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${brandConfig.name} Prompt Optimizer`,
    "description": brandConfig.description,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": page.faq?.items?.map((item: any) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  // Breadcrumb Schema for SERP rich snippets
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": brandConfig.domain
    }]
  };

  // ItemList Schema for Gallery Prompts (triggers Carousel/List snippets)
  const galleryItems = page.gallery?.items?.slice(0, 5) || [];
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Featured AI Prompts",
    "itemListElement": galleryItems.map((item: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": `${brandConfig.domain}${item.url || '/prompts'}`
    }))
  };

  // Add SearchAction to WebSite Schema (Sitelinks Search Box)
  const websiteSchemaWithSearch = {
    ...websiteSchema,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${brandConfig.domain}/prompts?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchemaWithSearch) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Page locale={locale} page={page} />
    </>
  );
}
