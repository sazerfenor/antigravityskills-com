/**
 * GET /api/skills
 * 获取已发布的 Skills 列表（从 community_post 表查询）
 *
 * Skills 数据流: antigravity_skills (注册) → community_post (发布)
 * 前端展示应该查询 community_post 表，因为那里有完整的 SEO 字段
 */

import { type NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { getCommunityPosts, getCommunityPostsCount, CommunityPostStatus } from '@/shared/models/community_post';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const category = searchParams.get('category') || undefined;
    const subcategory = searchParams.get('subcategory') || undefined;
    const sortParam = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 100);

    // 映射排序参数到 getCommunityPosts 的格式
    const sort = sortParam === 'popular' || sortParam === 'downloads'
      ? 'trending'
      : 'newest';

    // 从 community_post 表查询 Skills
    // Skills 的 seoSlug 以 'skill-' 开头
    const [posts, totalCount] = await Promise.all([
      getCommunityPosts({
        status: CommunityPostStatus.PUBLISHED,
        category,
        subcategory,
        sort,
        page,
        limit,
      }),
      getCommunityPostsCount({
        status: CommunityPostStatus.PUBLISHED,
        // 注意：getCommunityPostsCount 可能不支持 category 筛选，需要检查
      }),
    ]);

    // 筛选出 Skills（seoSlug 以 'skill-' 开头）
    const skillPosts = posts.filter(
      (post) => post.seoSlug && post.seoSlug.startsWith('skill-')
    );

    // 转换为前端需要的格式
    const skills = skillPosts.map((post) => ({
      id: post.id,
      title: post.title || 'Untitled Skill',
      seoSlug: post.seoSlug,
      seoDescription: post.seoDescription || post.description,
      visualTags: parseJsonField(post.visualTags),
      downloadCount: post.downloadCount || 0,
      likeCount: post.likeCount || 0,
      skillIcon: post.skillIcon || null,
      createdAt: post.createdAt,
    }));

    // 计算分页信息
    // 注意：由于我们在客户端筛选 skill-，实际总数可能不准确
    // 理想情况下应该在数据库层面筛选
    const pagination = {
      page,
      totalPages: Math.ceil(skills.length > 0 ? totalCount / limit : 1),
      total: skills.length,
    };

    return respData({
      skills,
      pagination,
    });
  } catch (error: any) {
    console.error('[API] GET /api/skills error:', error);
    return respErr(error.message || 'Failed to fetch skills', 500);
  }
}

/**
 * 解析 JSON 字段（tags 等）
 */
function parseJsonField(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
