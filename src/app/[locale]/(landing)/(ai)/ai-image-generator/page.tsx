import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageHeader } from '@/shared/blocks/common';
import { VisionLogicPlayground } from '@/shared/blocks/vision-logic';
import { getMetadata } from '@/shared/lib/seo';
import { CTA, FAQ } from '@/themes/default/blocks';
import { getCommunityPostById } from '@/shared/models/community_post';
import {
  SoftwareApplicationSchema,
  FAQPageSchema,
} from '@/shared/components/schema';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'ai.image.metadata',
  canonicalUrl: '/ai-image-generator',
});

export default async function AiImageGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ remix_id?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tt = await getTranslations('ai.image');

  // Server-side Remix data preloading
  const sp = await searchParams;
  const remixId = sp?.remix_id;
  let remixData = null;

  if (remixId) {
    try {
      remixData = await getCommunityPostById(remixId);
    } catch (error) {
      console.error('Failed to fetch remix data:', error);
    }
  }

  // Extract FAQ data for Schema (SEO-optimized for AI Image Generator)
  const faqData = t.raw('ai_image_generator_faq');
  const faqItems =
    faqData?.items?.map((item: { question: string; answer: string }) => ({
      question: item.question,
      answer: item.answer,
    })) || [];

  return (
    <>
      {/* SEO Schema Markup */}
      {/* TODO: 自定义你的品牌名称 */}
      <SoftwareApplicationSchema
        name="AI Image Generator"
        description={tt('metadata.description')}
        features={[
          'Text-to-Image Generation',
          'Image-to-Image Transformation',
          'Multiple AI Model Support (Gemini, GPT-4o, FLUX)',
          'High-Resolution Output',
        ]}
      />
      {faqItems.length > 0 && <FAQPageSchema faqs={faqItems} />}

      <PageHeader
        title={tt.raw('page.title')}
        description={tt.raw('page.description')}
        className="mt-16 -mb-8"
      />
      <section className="py-8">
        <VisionLogicPlayground remixData={remixData} />
      </section>
      <FAQ faq={t.raw('ai_image_generator_faq')} />
      <CTA cta={t.raw('cta')} className="bg-muted" />
    </>
  );
}
