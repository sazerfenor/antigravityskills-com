import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CommunityGallery, InitialGalleryData } from '@/shared/blocks/community-gallery';
import { CommunityGalleryLoading } from '@/shared/blocks/community-gallery/loading';
import { Section, Container } from '@/shared/components/ui/layout';
import { getCommunityPosts, getCommunityPostsCount, CommunityPostStatus } from '@/shared/models/community_post';
import { brandConfig } from '@/config';

export const revalidate = 3600;

/**
 * Trending Topic SEO Configuration
 * Maps slug to display name, description, and search tags
 */
const TRENDING_CONFIG: Record<
  string,
  { title: string; description: string; h1: string; tags: string[] }
> = {
  'face-lock': {
    title: 'Face Lock AI Prompts - Consistent Character Generation',
    description:
      'Explore Face Lock prompts for consistent character faces across AI generations. Perfect for creating coherent character series and storytelling.',
    h1: 'Face Lock Prompts',
    tags: ['face lock', 'consistent face', 'character consistency'],
  },
  'y2k-flash': {
    title: 'Y2K Flash Photography Prompts - Retro Camera Effects',
    description:
      'Discover Y2K Flash photography prompts with nostalgic point-and-shoot aesthetics. Create stunning retro-style AI images with flash effects.',
    h1: 'Y2K Flash Photography',
    tags: ['y2k', 'flash photography', 'retro', 'point and shoot'],
  },
  'photo-grid': {
    title: 'Photo Grid Generator Prompts - Multi-Panel Layouts',
    description:
      'Browse Photo Grid prompts for creating stunning multi-panel image layouts. Perfect for social media, portfolios, and creative storytelling.',
    h1: 'Photo Grid Generator',
    tags: ['photo grid', 'multi-panel', 'collage', 'layout'],
  },
  'miniature-world': {
    title: 'Miniature World Prompts - Tilt-Shift & Diorama Effects',
    description:
      'Explore Miniature World prompts featuring tilt-shift effects and diorama aesthetics. Create captivating tiny world scenes with AI.',
    h1: 'Miniature World',
    tags: ['miniature', 'tilt-shift', 'diorama', 'tiny world'],
  },
  aesthetics: {
    title: 'Aesthetic Subcultures Prompts - Style Movements',
    description:
      'Discover aesthetic subculture prompts from cottagecore to cyberpunk. Explore diverse visual styles and create themed AI artwork.',
    h1: 'Aesthetic Subcultures',
    tags: ['aesthetics', 'cottagecore', 'cyberpunk', 'vaporwave', 'dark academia'],
  },
};

// Generate static params for all trending topics
export async function generateStaticParams() {
  return Object.keys(TRENDING_CONFIG).map((slug) => ({ slug }));
}

/**
 * Generate dynamic metadata for trending topic pages
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = TRENDING_CONFIG[slug];

  if (!config) {
    return {
      title: 'Trending Prompts',
      description: 'Explore trending AI prompts',
    };
  }

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
    },
  };
}

export default async function TrendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;

  const config = TRENDING_CONFIG[slug];

  // 404 if trending topic not found
  if (!config) {
    notFound();
  }

  const sort = (sortParam as 'newest' | 'trending') || 'newest';
  const LIMIT = 15;

  // Fetch posts matching trending topic tags
  // TODO: Implement tag-based filtering in getCommunityPosts
  // For now, we'll fetch all posts and filter client-side would be inefficient,
  // so we'll just show all posts with a note that this needs proper tag filtering
  const [posts, total] = await Promise.all([
    getCommunityPosts({
      status: CommunityPostStatus.PUBLISHED,
      sort,
      page: 1,
      limit: LIMIT,
      getUser: true,
      // TODO: Add tag filtering: tags: config.tags
    }),
    getCommunityPostsCount({
      status: CommunityPostStatus.PUBLISHED,
      // TODO: Add tag filtering: tags: config.tags
    }),
  ]);

  const initialData: InitialGalleryData = {
    posts: posts.map((p) => ({
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
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            {/* Trending Badge */}
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary/80 bg-primary/10 px-2 py-1 rounded">
              Trending
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {config.h1}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">{config.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {config.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Gallery */}
        <Suspense fallback={<CommunityGalleryLoading />}>
          <CommunityGallery sort={sort} initialData={initialData} />
        </Suspense>
      </Container>
    </Section>
  );
}
