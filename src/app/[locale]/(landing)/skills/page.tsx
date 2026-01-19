/**
 * Skills 列表页
 * 展示 Antigravity Skills 库，支持分类筛选和排序
 *
 * 数据源：community_post 表（Skills 发布后存储在这里）
 * 筛选条件：seoSlug 以 'skill-' 开头
 */

import { Suspense } from 'react';
import { Metadata } from 'next';

import {
  SkillGallery,
  SkillGalleryLoading,
  InitialSkillGalleryData,
} from '@/shared/blocks/skill-gallery';
import { Section, Container } from '@/shared/components/ui/layout';
import { getCommunityPosts, getCommunityPostsCount, CommunityPostStatus } from '@/shared/models/community_post';

export const revalidate = 3600;

// ============================================
// SEO Metadata
// ============================================

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Skills Library | Antigravity Skills',
    description:
      'Modular logic blocks for your autonomous agents. Download and use with Claude Code, Cursor, Windsurf, and other AI coding assistants.',
    openGraph: {
      title: 'AI Skills Library | Antigravity Skills',
      description:
        'Modular logic blocks for your autonomous agents. Download and use with Claude Code, Cursor, Windsurf, and other AI coding assistants.',
    },
  };
}

// ============================================
// Page Component
// ============================================

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string }>;
}) {
  const params = await searchParams;

  const category = params.category || undefined;
  const sortParam = params.sort || 'newest';

  // 映射排序参数
  const sort = sortParam === 'popular' || sortParam === 'downloads'
    ? 'trending' as const
    : 'newest' as const;

  // SSR: 从 community_post 表获取初始数据
  const LIMIT = 12;
  const [posts, totalCount] = await Promise.all([
    getCommunityPosts({
      status: CommunityPostStatus.PUBLISHED,
      category,
      sort,
      page: 1,
      limit: LIMIT,
    }),
    getCommunityPostsCount({
      status: CommunityPostStatus.PUBLISHED,
    }),
  ]);

  // 筛选出 Skills（seoSlug 以 'skill-' 开头）
  const skillPosts = posts.filter(
    (post) => post.seoSlug && post.seoSlug.startsWith('skill-')
  );

  // 转换为 SkillGallery 需要的格式
  const initialData: InitialSkillGalleryData = {
    skills: skillPosts.map((post) => ({
      id: post.id,
      title: post.title || 'Untitled Skill',
      seoSlug: post.seoSlug || post.id,
      seoDescription: post.seoDescription || post.description,
      visualTags: parseJsonArray(post.visualTags),
      downloadCount: post.downloadCount || 0,
      skillIcon: post.skillIcon,
      createdAt: post.createdAt,
    })),
    pagination: {
      page: 1,
      totalPages: Math.ceil(totalCount / LIMIT) || 1,
    },
  };

  return (
    <Section spacing="default" className="min-h-screen">
      <Container size="wide">
        {/* 页面标题 */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            AI Skills Library
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Modular logic blocks for your autonomous agents. Download and use
            with Claude Code, Cursor, Windsurf, and other AI coding assistants.
          </p>
        </div>

        {/* Skills Gallery with SSR initial data */}
        <Suspense fallback={<SkillGalleryLoading />}>
          <SkillGallery
            initialData={initialData}
            category={category}
            sort={sortParam as 'newest' | 'popular' | 'downloads'}
          />
        </Suspense>
      </Container>
    </Section>
  );
}

// ============================================
// Helpers
// ============================================

/**
 * 解析 JSON 数组字符串
 */
function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
