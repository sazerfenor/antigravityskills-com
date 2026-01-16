import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getCommunityPostBySlug, getCommunityPostById } from '@/shared/models/community_post';
import { PromptDetail } from '@/shared/blocks/prompt-detail';
import { brandConfig } from '@/config';

export const revalidate = 3600;

/**
 * Generate SEO metadata for prompt detail page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  
  // Try to find post by SEO slug
  let post = await getCommunityPostBySlug(slug, { getUser: true });
  
  // Fallback: try extracting short ID
  if (!post) {
    const shortIdMatch = slug.match(/-([a-f0-9]{6,8})$/);
    if (shortIdMatch) {
      const { sql } = await import('drizzle-orm');
      const { communityPost } = await import('@/config/db/schema');
      const { db } = await import('@/core/db');
      
      const shortId = shortIdMatch[1];
      const [result] = await db()
        .select()
        .from(communityPost)
        .where(sql`${communityPost.id} LIKE ${'%' + shortId}`)
        .limit(1);
      
      if (result) {
        post = await getCommunityPostById(result.id, { getUser: true });
      }
    }
  }

  if (!post) {
    return {
      title: `Prompt Not Found | ${brandConfig.name}`,
    };
  }

  // Use SEO fields if available
  // TODO: 根据你的 AI 模型配置自定义模型名称显示
  const modelName = post.model?.includes('gemini')
    ? post.model.includes('3-pro') ? 'Pro' : 'Standard'
    : post.model?.includes('flux') ? 'FLUX' : 'AI';

  // Use SEO title directly if available (AI already includes brand injection)
  const title = post.seoTitle
    || `${post.prompt?.slice(0, 50) || 'AI Art'} - ${modelName} | ${brandConfig.name}`;

  const description = post.seoDescription ||
    `Created with ${modelName} by ${post.user?.name || 'Anonymous'}. ${post.prompt?.slice(0, 130) || 'Explore this AI-generated masterpiece.'}`;

  const canonicalUrl = `${brandConfig.domain}/prompts/${post.seoSlug || slug}`;

  return {
    title,
    description,
    // V16.0: 移除 meta keywords - 主流搜索引擎（Google 自 2009 年起）已不再使用
    // keywords: post.seoKeywords || undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': canonicalUrl,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      images: [post.imageUrl || ''],
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [post.imageUrl || ''],
    },
  };
}

/**
 * SEO-friendly prompt/image detail page
 * Route: /prompts/[slug]
 * Example: /skills/antigravity-woman-chinese-golden-dress-twilight-771ee6
 */
export default async function PromptsSlugPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  // Try to find post by SEO slug
  let post = await getCommunityPostBySlug(slug, { getUser: true });

  // If not found by slug, try extracting short ID and fallback to ID lookup
  if (!post) {
    const shortIdMatch = slug.match(/-([a-f0-9]{6})$/);
    if (shortIdMatch) {
      const shortId = shortIdMatch[1];
      // Try to find by partial ID match
      const { sql } = await import('drizzle-orm');
      const { communityPost } = await import('@/config/db/schema');
      const { db } = await import('@/core/db');
      
      const [result] = await db()
        .select()
        .from(communityPost)
        .where(sql`${communityPost.id} LIKE ${'%' + shortId}`)
        .limit(1);
      
      if (result) {
        post = await getCommunityPostById(result.id, { getUser: true });
      }
    }
  }

  // Still not found? 404
  if (!post) {
    notFound();
  }

  // If post has a different seoSlug, 301 redirect to correct URL
  if (post.seoSlug && post.seoSlug !== slug) {
    redirect(`/prompts/${post.seoSlug}`);
  }

  // Parse FAQ items for schema generation (V14.0: Prefer contentSections, fallback to legacy faqItems)
  let faqItems: Array<{question: string, answer: string}> = [];
  try {
    // V14: Extract FAQ from contentSections
    if (post.contentSections && Array.isArray(post.contentSections)) {
      const faqSection = (post.contentSections as any[]).find(s => s.type === 'faq-accordion');
      if (faqSection?.data?.items) {
        faqItems = faqSection.data.items.map((item: any) => ({
          question: item.q,
          answer: item.a,
        }));
      }
    }
    // Legacy fallback: If no FAQ in contentSections, use faqItems directly
    if (faqItems.length === 0 && post.faqItems) {
      const parsed = typeof post.faqItems === 'string' ? JSON.parse(post.faqItems) : post.faqItems;
      faqItems = parsed;
    }
  } catch (e) {
    console.warn('Failed to parse FAQ for JSON-LD');
  }

  // Helper: Get dynamic artMedium based on AI model
  // TODO: 根据你的 AI 模型配置自定义 artMedium
  const getArtMedium = (model: string | null | undefined): string => {
    if (!model) return 'AI Generated Digital Art';
    const m = model.toLowerCase();
    if (m.includes('flux')) return 'FLUX AI Generated Art';
    if (m.includes('gemini')) {
      return m.includes('3-pro') || m.includes('pro')
        ? 'Pro AI Art'
        : 'AI Art';
    }
    if (m.includes('midjourney')) return 'Midjourney AI Art';
    if (m.includes('dalle') || m.includes('dall-e')) return 'DALL-E AI Art';
    if (m.includes('stable')) return 'Stable Diffusion AI Art';
    return 'AI Generated Digital Art';
  };

  // Build JSON-LD @graph for Rich Results
  const jsonLdGraph: any[] = [
    // 1. ImageObject Schema (Image License Metadata)
    {
      "@type": "ImageObject",
      "contentUrl": post.imageUrl,
      "license": `${brandConfig.domain}/terms-of-service`,
      "acquireLicensePage": `${brandConfig.domain}/prompts/${post.seoSlug || slug}`,
      "creditText": `${brandConfig.name} User: ${post.user?.name || 'Anonymous'}`,
      "creator": {
        "@type": "Person",
        "name": post.user?.name || "Anonymous"
      },
      "copyrightNotice": `© ${new Date().getFullYear()} ${brandConfig.name}`,
      "name": post.seoTitle || post.prompt?.slice(0, 60),
      "description": post.seoDescription || post.prompt?.slice(0, 160),
      // InteractionStatistic for engagement signals
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": { "@type": "ViewAction" },
          "userInteractionCount": post.viewCount || 0
        },
        {
          "@type": "InteractionCounter",
          "interactionType": { "@type": "LikeAction" },
          "userInteractionCount": post.likeCount || 0
        }
      ]
    },
    // 2. VisualArtwork Schema (SEO Enhancement for AI-generated art)
    {
      "@type": "VisualArtwork",
      "name": (post as any).h1Title || post.seoTitle || post.prompt?.slice(0, 60),
      "creator": {
        "@type": "Person",
        "name": post.user?.name || "Anonymous"
      },
      "dateCreated": post.publishedAt ? new Date(post.publishedAt).toISOString().split('T')[0] : undefined,
      "artMedium": getArtMedium(post.model),
      "artworkSurface": "Digital",
      "image": post.imageUrl,
      ...(post.visualTags ? {
        "keywords": (() => {
          try {
            const tags = typeof post.visualTags === 'string' ? JSON.parse(post.visualTags) : post.visualTags;
            return Array.isArray(tags) ? tags.slice(0, 10).join(', ') : undefined;
          } catch { return undefined; }
        })()
      } : {})
    },
    // NOTE: SoftwareApplication Schema has been moved to the Landing Page (/)
    // to avoid duplication across thousands of prompt pages.
  ];

  // 3. FAQPage Schema (if FAQ items exist)
  if (faqItems.length > 0) {
    jsonLdGraph.push({
      "@type": "FAQPage",
      "mainEntity": faqItems.slice(0, 5).map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    });
  }

  // V15.0: Parse params for HowTo Schema
  let formValuesForSchema: Record<string, any> | null = null;
  let schemaFields: Array<{ id: string; label: string }> | null = null;
  try {
    if ((post as any).params) {
      const params = typeof (post as any).params === 'string'
        ? JSON.parse((post as any).params)
        : (post as any).params;
      if (params?.formValues && Object.keys(params.formValues).length >= 3) {
        formValuesForSchema = params.formValues;
        schemaFields = params.schema?.fields || null;
      }
    }
  } catch (e) {
    console.warn('Failed to parse params for HowTo Schema');
  }

  // 4. HowTo Schema (if formValues exist with >= 3 keys)
  if (formValuesForSchema) {
    const getLabel = (key: string): string => {
      const field = schemaFields?.find(f => f.id === key);
      return field?.label || key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        if (value >= 0 && value <= 1) return `${(value * 100).toFixed(0)}%`;
        return String(value);
      }
      if (Array.isArray(value)) return value.filter(Boolean).join(', ');
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    };

    const steps = Object.entries(formValuesForSchema)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value], idx) => ({
        "@type": "HowToStep",
        "position": idx + 1,
        "name": `Configure ${getLabel(key)}`,
        "text": `Set the ${getLabel(key)} input to '${formatValue(value)}'.`
      }));

    if (steps.length >= 3) {
      const h1Title = (post as any).h1Title || post.seoTitle || 'AI Generated Image';
      jsonLdGraph.push({
        "@type": "HowTo",
        "name": `How to Generate ${h1Title}`,
        "description": post.seoDescription || `Learn how to create this AI-generated image using ${brandConfig.name}.`,
        "tool": [{ "@type": "SoftwareApplication", "name": brandConfig.name }],
        "step": steps
      });
    }
  }

  // 5. BreadcrumbList Schema (V15.0)
  const h1TitleForBreadcrumb = (post as any).h1Title || post.seoTitle || post.prompt?.slice(0, 40) || 'Prompt';
  jsonLdGraph.push({
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": brandConfig.domain
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Prompts",
        "item": `${brandConfig.domain}/prompts`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": h1TitleForBreadcrumb
        // Note: Last item doesn't need "item" property per schema.org spec
      }
    ]
  });

  // 6. Speakable Schema (V15.0 GEO - if snippetSummary exists)
  if ((post as any).snippetSummary) {
    jsonLdGraph.push({
      "@type": "WebPage",
      "name": (post as any).h1Title || post.seoTitle,
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".snippet-package-summary"]
      }
    });
  }

  const jsonLd = {
    "@context": "https://schema.org/",
    "@graph": jsonLdGraph
  };

  // Render the prompt detail page with JSON-LD
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PromptDetail post={post} />
    </>
  );
}

