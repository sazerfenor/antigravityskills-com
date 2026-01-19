import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';

import { brandConfig } from '@/config';
import { getThemePage } from '@/core/theme';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import {
  FAQ as FAQType,
  Testimonials as TestimonialsType,
} from '@/shared/types/blocks/landing';
import { Pricing as PricingType } from '@/shared/types/blocks/pricing';

export const revalidate = 3600;

// Block search engines from indexing this page
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load landing data
  const tl = await getTranslations('landing');
  // loading pricing data
  const t = await getTranslations('pricing');

  // get current subscription
  let currentSubscription;
  try {
    const user = await getUserInfo();
    if (user) {
      currentSubscription = await getCurrentSubscription(user.id);
    }
  } catch (error) {
    console.log('getting current subscription failed:', error);
  }

  // load page component
  const Page = await getThemePage('pricing');

  // build sections
  const pricing: PricingType = t.raw('pricing');
  const faq: FAQType = tl.raw('faq');
  const testimonials: TestimonialsType = tl.raw('testimonials');
  
  // Section visibility config
  const sectionVisibility = tl.raw('section_visibility') as { show_testimonials?: boolean } | undefined;
  const showTestimonials = sectionVisibility?.show_testimonials !== false;

  // Product Schema for SEO
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': `${brandConfig.name} Credits`,
    'description': `AI Image Generation Credits for ${brandConfig.modelBrand.premium} and ${brandConfig.modelBrand.fast} models.`,
    'brand': {
      '@type': 'Brand',
      'name': brandConfig.name
    },
    'offers': {
      '@type': 'AggregateOffer',
      'lowPrice': '9.00',
      'highPrice': '997.00',
      'priceCurrency': 'USD',
      'offerCount': pricing.items?.length || 5
    }
  };

  // FAQ Schema for long-tail SEO queries
  const faqSchema = faq?.items?.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faq.items.map((item) => ({
      '@type': 'Question',
      'name': item.question || '',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer || ''
      }
    }))
  } : null;

  // Combine schemas
  const schemas = faqSchema ? [productSchema, faqSchema] : productSchema;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      {/* Technical SEO: 使用 main 标签包裹核心内容区 */}
      <main className="flex-1 w-full">
        <Page
          locale={locale}
          pricing={pricing}
          currentSubscription={currentSubscription}
          faq={faq}
          testimonials={showTestimonials ? testimonials : undefined}
        />
      </main>
    </>
  );
}
