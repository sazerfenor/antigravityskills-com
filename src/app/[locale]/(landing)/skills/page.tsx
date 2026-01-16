import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CommunityGallery, InitialGalleryData } from '@/shared/blocks/community-gallery';
import { CommunityGalleryLoading } from '@/shared/blocks/community-gallery/loading';
import { Section, Container } from '@/shared/components/ui/layout';
import { getCommunityPosts, getCommunityPostsCount, CommunityPostStatus } from '@/shared/models/community_post';
import { brandConfig } from '@/config';

export const revalidate = 3600;

/**
 * Model-specific SEO metadata configuration
 * TODO: 根据你的 AI 模型配置自定义 SEO
 */
const MODEL_SEO_CONFIG: Record<string, { title: string; description: string; h1: string }> = {
  'gemini-2.5-flash-image': {
    title: 'AI Image Prompts Library - Fast Generation',
    description: 'Explore AI art prompts optimized for fast image generation. Discover stunning image prompts, get inspired, and create your own masterpieces.',
    h1: 'Fast AI Prompts',
  },
  'gemini-3-pro-image-preview': {
    title: 'Premium AI Prompts Library - High Quality Images',
    description: 'Explore premium AI art prompts for high-quality image generation. Professional-grade prompts for stunning AI art.',
    h1: 'Premium AI Prompts',
  },
  'black-forest-labs/flux-schnell': {
    title: 'FLUX Prompts Library - Fast AI Image Generation',
    description: 'Explore AI art prompts optimized for FLUX Schnell. Lightning-fast image generation prompts for creative AI artwork.',
    h1: 'FLUX Schnell Prompts',
  },
};

const DEFAULT_SEO = {
  title: 'AI Prompt Gallery: Copy High-Fidelity Recipes',
  description: 'See what minimal input can do. Browse the best AI prompts. Copy the recipes and create your own masterpiece — start exploring now.',
  h1: 'See What AI Can Do.',
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

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; model?: string }>;
}) {
  const t = await getTranslations('landing');
  const params = await searchParams;

  // Dynamic H1 based on model filter
  const model = params.model;
  const sort = (params.sort as 'newest' | 'trending') || 'newest';
  const config = model && MODEL_SEO_CONFIG[model]
    ? MODEL_SEO_CONFIG[model]
    : null;
  const pageTitle = config?.h1 || t('gallery.title');

  // 🚀 SSR: Fetch initial posts on server to eliminate Resource Load Delay
  const LIMIT = 15;
  const [posts, total] = await Promise.all([
    getCommunityPosts({
      status: CommunityPostStatus.PUBLISHED,
      model,
      sort,
      page: 1,
      limit: LIMIT,
      getUser: true,
    }),
    getCommunityPostsCount({
      status: CommunityPostStatus.PUBLISHED,
      model,
    }),
  ]);

  const initialData: InitialGalleryData = {
    posts: posts.map(p => ({
      id: p.id,
      imageUrl: p.imageUrl,
      thumbnailUrl: p.thumbnailUrl || undefined,
      prompt: p.prompt || '',
      model: p.model || '',
      seoSlug: p.seoSlug || '',
      likeCount: p.likeCount || 0,
      viewCount: p.viewCount || 0,
      aspectRatio: p.aspectRatio || '1:1',
      imageAlt: p.imageAlt || undefined,
      user: p.user ? { name: p.user.name, image: p.user.image || undefined } : undefined,
    })),
    pagination: {
      page: 1,
      totalPages: Math.ceil(total / LIMIT),
    },
  };

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

        {/* Gallery with SSR initial data - eliminates 7.5s Resource Load Delay */}
        <Suspense fallback={<CommunityGalleryLoading />}>
          <CommunityGallery
            sort={sort}
            model={params.model}
            initialData={initialData}
          />
        </Suspense>
      </Container>
    </Section>
  );
}
