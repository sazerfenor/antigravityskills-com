import { respData, respErr } from '@/shared/lib/resp';
import { eq, and, asc, isNotNull } from 'drizzle-orm';
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { updateCommunityPostById } from '@/shared/models/community_post';

/**
 * GET /api/cron/scheduled-publish
 *
 * 定时发布 API - 每次发布 3-7 篇 pending 帖子
 * 可通过 Cloudflare Workers Cron Trigger 定时调用
 *
 * 安全：需要 CRON_SECRET 验证
 *
 * 使用方法：
 * 1. 设置环境变量 CRON_SECRET
 * 2. 在 wrangler.toml 添加 cron trigger
 * 3. 或手动调用：GET /api/cron/scheduled-publish?secret=xxx
 */
export async function GET(request: Request) {
  try {
    // 1. 安全验证
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // 如果设置了 CRON_SECRET，需要验证
    if (cronSecret && secret !== cronSecret) {
      return respErr('Unauthorized', 401);
    }

    // 2. 获取参数
    const minCount = parseInt(url.searchParams.get('min') || '3');
    const maxCount = parseInt(url.searchParams.get('max') || '7');
    const fixedCount = url.searchParams.get('count')
      ? parseInt(url.searchParams.get('count')!)
      : null;

    // 3. 查询待发布的帖子
    const database = db();
    const pendingPosts = await database
      .select({
        id: communityPost.id,
        seoSlug: communityPost.seoSlug,
        seoTitle: communityPost.seoTitle,
      })
      .from(communityPost)
      .where(
        and(
          eq(communityPost.status, 'pending'),
          isNotNull(communityPost.seoSlug),
          isNotNull(communityPost.seoTitle)
        )
      )
      .orderBy(asc(communityPost.createdAt));

    if (pendingPosts.length === 0) {
      return respData({
        message: 'No pending posts to publish',
        published: 0,
        remaining: 0,
      });
    }

    // 4. 确定发布数量
    const targetCount = fixedCount || Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    const actualCount = Math.min(targetCount, pendingPosts.length);

    // 5. 发布帖子
    const postsToPublish = pendingPosts.slice(0, actualCount);
    const results: { id: string; slug: string | null; success: boolean }[] = [];

    for (const post of postsToPublish) {
      try {
        await updateCommunityPostById(post.id, {
          status: 'published',
        });
        results.push({ id: post.id, slug: post.seoSlug, success: true });
      } catch (e) {
        results.push({ id: post.id, slug: post.seoSlug, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return respData({
      message: `Published ${successCount} posts`,
      published: successCount,
      remaining: pendingPosts.length - actualCount,
      details: results,
    });
  } catch (error: any) {
    console.error('[Scheduled Publish] Error:', error);
    return respErr(error.message);
  }
}
