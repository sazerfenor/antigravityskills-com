import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { db } from '@/core/db';
import { communityPost, user } from '@/config/db/schema';
import { eq, sql } from 'drizzle-orm';
import { checkRateLimit } from '@/shared/lib/rate-limit';

// 下载频率限制配置
const DOWNLOAD_RATE_LIMIT = {
  maxPerPost: 1, // 同一用户对同一帖子每 N 小时只算一次下载
  windowHours: 24, // 时间窗口（小时）
};

// 简单的内存缓存，用于防刷（生产环境建议使用 Redis）
const downloadCache = new Map<string, number>();

// 清理过期缓存（每小时自动清理）
setInterval(() => {
  const now = Date.now();
  const windowMs = DOWNLOAD_RATE_LIMIT.windowHours * 60 * 60 * 1000;
  for (const [key, timestamp] of downloadCache.entries()) {
    if (now - timestamp > windowMs) {
      downloadCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // 每小时清理一次

// POST /api/community/posts/[id]/download - 记录下载并增加计数
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    
    // 1. 验证用户登录 - 只有注册用户才能下载
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to download');
    }

    // 2. 总体限流检查（20次/小时）
    const { success: rateLimitOk } = await checkRateLimit(
      `community:download:user:${currentUser.id}`,
      20,
      3600
    );

    if (!rateLimitOk) {
      return respErr("You've been busy! Take a short break and try again in an hour.", 429);
    }

    // 3. 防刷检查 - 同一用户对同一帖子在时间窗口内只算一次
    const cacheKey = `${currentUser.id}:${postId}`;
    const lastDownload = downloadCache.get(cacheKey);
    const now = Date.now();
    const windowMs = DOWNLOAD_RATE_LIMIT.windowHours * 60 * 60 * 1000;

    if (lastDownload && (now - lastDownload) < windowMs) {
      // 用户在时间窗口内已下载过，不增加计数但允许下载
      console.log(`[Download] Rate limited: user ${currentUser.id} already downloaded post ${postId} within ${DOWNLOAD_RATE_LIMIT.windowHours}h`);
      return respData({ 
        success: true, 
        counted: false, 
        message: 'Download allowed but not counted (already downloaded recently)' 
      });
    }

    // 4. 验证帖子存在并获取作者 ID
    const postResult = await db()
      .select({ 
        id: communityPost.id, 
        userId: communityPost.userId,
        downloadCount: communityPost.downloadCount 
      })
      .from(communityPost)
      .where(eq(communityPost.id, postId))
      .limit(1);

    if (postResult.length === 0) {
      return respErr('Post not found');
    }

    const post = postResult[0];

    // 5. 更新下载记录缓存
    downloadCache.set(cacheKey, now);

    // 6. 更新帖子下载计数
    await db()
      .update(communityPost)
      .set({
        downloadCount: sql`${communityPost.downloadCount} + 1`,
      })
      .where(eq(communityPost.id, postId));

    // 7. 更新作者总下载数
    await db()
      .update(user)
      .set({
        totalDownloads: sql`${user.totalDownloads} + 1`,
      })
      .where(eq(user.id, post.userId));

    console.log(`[Download] Counted: user ${currentUser.id} downloaded post ${postId}`);

    return respData({ 
      success: true, 
      counted: true,
      newCount: (post.downloadCount || 0) + 1 
    });
  } catch (error: any) {
    console.error('[POST Download] Error:', error);
    return respErr('Failed to record download');
  }
}
