import { MetadataRoute } from 'next';
// import { db } from '@/core/db';
// import { communityPost, post } from '@/config/db/schema';
// import { eq, isNotNull } from 'drizzle-orm';
// import { CommunityPostStatus } from '@/shared/models/community_post';
import { brandConfig } from '@/config';

// Use domain from brand config (configured in src/config/brand.ts)
const BASE_URL = brandConfig.domain;

// Fixed date for static pages (update this when content actually changes)
const STATIC_LAST_MODIFIED = new Date('2025-12-18');

/**
 * Minimal Sitemap Generator - Reduced Crawl Scope
 *
 * ⚠️ TEMPORARY: This is a minimal sitemap to prevent AI content detection.
 * Only includes 3 core pages as per robots.txt whitelist.
 *
 * When ready to expand SEO, uncomment the code below to restore full sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only 3 pages allowed for crawling (matching robots.txt)
  return [
    {
      url: BASE_URL,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ai-image-generator`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}

/* ==================== COMMENTED OUT - RESTORE WHEN READY ====================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/prompts`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // AI Tools (high priority - Money Pages)
    {
      url: `${BASE_URL}/ai-image-generator`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Legal pages (low priority)
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/community-guidelines`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund-policy`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookie-policy`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/dmca-policy`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 2. Dynamic prompts from database
  let promptPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch all published prompts with SEO slugs and image URLs
    const posts = await db()
      .select({
        seoSlug: communityPost.seoSlug,
        imageUrl: communityPost.imageUrl, // 🆕 For Google Images sitemap extension
        updatedAt: communityPost.updatedAt,
        likeCount: communityPost.likeCount,
      })
      .from(communityPost)
      .where(
        eq(communityPost.status, CommunityPostStatus.PUBLISHED)
      );

    promptPages = posts
      .filter((post: any) => post.seoSlug) // Only include posts with SEO slugs
      .map((post: any) => {
        // Calculate priority based on likes (0.5 to 0.8)
        const likeBonus = Math.min((post.likeCount ?? 0) * 0.01, 0.3);
        const priority = Math.round((0.5 + likeBonus) * 10) / 10;

        return {
          url: `${BASE_URL}/prompts/${post.seoSlug}`,
          lastModified: post.updatedAt ?? new Date(),
          changeFrequency: 'weekly' as const,
          priority,
          // 🆕 Image extension for Google Images indexing
          images: post.imageUrl ? [post.imageUrl] : undefined,
        };
      });

    console.log(`[Sitemap] Generated ${promptPages.length} prompt URLs`);
  } catch (error) {
    console.error('[Sitemap] Failed to fetch prompts:', error);
    // Return static pages even if dynamic fails
  }

  // 3. Dynamic blog posts from database
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    const blogPosts = await db()
      .select({
        slug: post.slug,
        updatedAt: post.updatedAt,
      })
      .from(post)
      .where(eq(post.status, 'published'));

    blogPages = blogPosts
      .filter((p: any) => p.slug)
      .map((p: any) => ({
        url: `${BASE_URL}/blog/${p.slug}`,
        lastModified: p.updatedAt ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    console.log(`[Sitemap] Generated ${blogPages.length} blog URLs`);
  } catch (error) {
    console.error('[Sitemap] Failed to fetch blog posts:', error);
  }

  return [...staticPages, ...promptPages, ...blogPages];
}

============================================================================== */
