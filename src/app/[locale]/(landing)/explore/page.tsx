import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CommunityGallery } from '@/shared/blocks/community-gallery';
import { CommunityGalleryLoading } from '@/shared/blocks/community-gallery/loading';
import { Section, Container } from '@/shared/components/ui/layout';
import { brandConfig } from '@/config';

export const revalidate = 3600;

/**
 * Model-specific SEO metadata configuration
 * TODO: 根据你的 AI 模型配置自定义 SEO
 */
const MODEL_SEO_CONFIG: Record<string, { title: string; description: string; h1: string }> = {
  'gemini-2.5-flash-image': {
    title: 'AI Prompts Gallery - Fast Image Generation',
    description: 'Explore AI art prompts optimized for fast image generation. Discover stunning prompts and create your own masterpieces.',
    h1: 'Fast AI Prompts',
  },
  'gemini-3-pro-image-preview': {
    title: 'Premium AI Prompts Gallery - High Quality Images',
    description: 'Explore premium AI art prompts for high-quality image generation. Professional-grade prompts for stunning AI art.',
    h1: 'Premium AI Prompts',
  },
  'black-forest-labs/flux-schnell': {
    title: 'FLUX Prompts Gallery - Fast AI Image Generation',
    description: 'Explore AI art prompts optimized for FLUX Schnell. Lightning-fast image generation prompts for creative AI artwork.',
    h1: 'FLUX Schnell Prompts',
  },
};

const DEFAULT_SEO = {
  title: 'Explore AI Image Prompts | ' + 'AI Prompt Gallery',
  description: 'Explore the ultimate AI image prompt gallery. Discover community prompts and get inspired to create stunning AI art.',
  h1: 'Explore the AI Prompt Library',
};

/**
 * Generate dynamic metadata based on model filter
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const model = params.model;
  
  const config = model && MODEL_SEO_CONFIG[model] 
    ? MODEL_SEO_CONFIG[model] 
    : DEFAULT_SEO;

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
    },
  };
}

export default async function CommunityGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; model?: string }>;
}) {
  const t = await getTranslations('landing');
  const params = await searchParams;

  // Dynamic H1 based on model filter
  const model = params.model;
  const config = model && MODEL_SEO_CONFIG[model]
    ? MODEL_SEO_CONFIG[model]
    : null;
  const pageTitle = config?.h1 || t('gallery.title');

  return (
    <Section spacing="default" className="min-h-screen">
      <Container>
        {/* Header - Dynamic SEO H1 */}
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            {t('gallery.description')}
          </p>
        </div>

        {/* Gallery with loading state - 无限滚动模式 */}
        <Suspense fallback={<CommunityGalleryLoading />}>
          <CommunityGallery
            sort={(params.sort as 'newest' | 'trending') || 'newest'}
            model={params.model}
          />
        </Suspense>
      </Container>
    </Section>
  );
}
