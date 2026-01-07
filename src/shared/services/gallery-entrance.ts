/**
 * Gallery Entrance Service
 *
 * 提供首页 Gallery 入口组件所需的动态数据：
 * - 分类统计（count + coverImage）
 * - 热门趋势（从热门帖子的 visualTags 提取）
 */

import {
  getCategoryStats,
  getHotPosts,
  GALLERY_CATEGORIES,
} from '@/shared/models/community_post';

// ============================================
// 类型定义
// ============================================

export interface GalleryCategoryData {
  slug: string;
  title: string;
  description: string;
  count: number;
  coverImage: string;
}

export interface GalleryTrendingData {
  slug: string;
  title: string;
  postCount: number;
}

export interface GalleryEntranceData {
  categories: GalleryCategoryData[];
  trending: GalleryTrendingData[];
}

// ============================================
// 静态配置
// ============================================

/**
 * 分类的静态配置（title, description）
 * 这些信息不会频繁变化，硬编码在代码中
 */
const CATEGORY_CONFIG: Record<
  string,
  { title: string; description: string }
> = {
  photography: {
    title: 'Photography',
    description: 'Professional shots, portraits & creative photography',
  },
  'art-illustration': {
    title: 'Art & Illustration',
    description: 'Digital art, illustrations & creative artwork',
  },
  design: {
    title: 'Design',
    description: 'Graphic design, UI/UX & visual compositions',
  },
  'commercial-product': {
    title: 'Commercial & Product',
    description: 'Product photography & commercial visuals',
  },
  'character-design': {
    title: 'Character Design',
    description: 'Characters, mascots & figure illustrations',
  },
};

/**
 * 热门趋势的静态配置
 * 基于 novel-patterns 分析结果
 */
const TRENDING_CONFIG: {
  slug: string;
  title: string;
  keywords: string[];
}[] = [
  {
    slug: 'face-lock',
    title: 'Face Lock AI',
    keywords: ['face lock', 'identity', 'face swap', 'same face'],
  },
  {
    slug: 'y2k-flash',
    title: 'Y2K Flash',
    keywords: ['y2k', 'flash', '2000s', 'point and shoot'],
  },
  {
    slug: 'photo-grid',
    title: 'Photo Grid',
    keywords: ['grid', '2x2', '3x3', 'photo dump', 'collage'],
  },
  {
    slug: 'miniature-world',
    title: 'Miniature World',
    keywords: ['miniature', 'diorama', 'tilt shift', 'tiny'],
  },
  {
    slug: 'aesthetics',
    title: 'Aesthetics',
    keywords: ['coquette', 'e-girl', 'clean girl', 'aesthetic'],
  },
];

// ============================================
// 服务方法
// ============================================

/**
 * 获取 Gallery 入口组件所需的完整数据
 *
 * @returns categories 和 trending 数据
 */
export async function getGalleryEntranceData(): Promise<GalleryEntranceData> {
  // 并行获取分类统计和热门帖子
  const [categoryStats, hotPosts] = await Promise.all([
    getCategoryStats(),
    getHotPosts({ limit: 50, days: 7 }),
  ]);

  // 构建分类数据
  const categories: GalleryCategoryData[] = GALLERY_CATEGORIES.map((slug) => {
    const stats = categoryStats.find((s) => s.category === slug);
    const config = CATEGORY_CONFIG[slug] || {
      title: slug,
      description: '',
    };

    return {
      slug,
      title: config.title,
      description: config.description,
      count: stats?.count || 0,
      coverImage: stats?.coverImage || '/images/placeholder.png',
    };
  });

  // 从热门帖子中提取趋势话题
  const trending = extractTrendingFromPosts(hotPosts);

  return {
    categories,
    trending,
  };
}

/**
 * 从热门帖子的 visualTags 中提取趋势话题
 */
function extractTrendingFromPosts(
  posts: Awaited<ReturnType<typeof getHotPosts>>
): GalleryTrendingData[] {
  // 统计每个趋势关键词出现的次数
  const trendingCounts = new Map<string, number>();

  for (const post of posts) {
    if (!post.visualTags) continue;

    try {
      const tags: string[] = JSON.parse(post.visualTags);

      for (const trend of TRENDING_CONFIG) {
        // 检查帖子是否包含该趋势的关键词
        const hasKeyword = trend.keywords.some((keyword) =>
          tags.some((tag) => tag.toLowerCase().includes(keyword.toLowerCase()))
        );

        if (hasKeyword) {
          trendingCounts.set(
            trend.slug,
            (trendingCounts.get(trend.slug) || 0) + 1
          );
        }
      }
    } catch {
      // 解析失败，跳过
    }
  }

  // 构建趋势数据，按 postCount 降序排序
  const trending: GalleryTrendingData[] = TRENDING_CONFIG.map((config) => ({
    slug: config.slug,
    title: config.title,
    postCount: trendingCounts.get(config.slug) || 0,
  })).sort((a, b) => b.postCount - a.postCount);

  return trending;
}

/**
 * 获取单个分类的详细信息
 */
export async function getCategoryDetail(
  slug: string
): Promise<GalleryCategoryData | null> {
  const config = CATEGORY_CONFIG[slug];
  if (!config) return null;

  const stats = await getCategoryStats();
  const stat = stats.find((s) => s.category === slug);

  return {
    slug,
    title: config.title,
    description: config.description,
    count: stat?.count || 0,
    coverImage: stat?.coverImage || '/images/placeholder.png',
  };
}
