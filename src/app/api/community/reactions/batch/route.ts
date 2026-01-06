import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { db } from '@/core/db';
import { reaction } from '@/config/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

/**
 * POST /api/community/reactions/batch
 * Get user's reactions for multiple posts at once
 * Body: { postIds: string[] }
 * Returns: { [postId]: ['like', 'heart', ...] }
 */
export async function POST(request: Request) {
  try {
    // Get current user (optional, can be anonymous)
    const user = await getUserInfo();
    if (!user) {
      return respData({});
    }

    const { postIds }: any = await request.json();
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return respData({});
    }

    // Limit to prevent abuse
    const limitedPostIds = postIds.slice(0, 50);

    console.log('[Reactions Batch] Fetching reactions for', limitedPostIds.length, 'posts');

    // Single batch query instead of N queries
    const reactions = await db()
      .select({
        postId: reaction.postId,
        type: reaction.type,
      })
      .from(reaction)
      .where(
        and(
          eq(reaction.userId, user.id),
          inArray(reaction.postId, limitedPostIds)
        )
      );

    // Group by postId
    const result: Record<string, string[]> = {};
    for (const r of reactions) {
      if (!result[r.postId]) {
        result[r.postId] = [];
      }
      result[r.postId].push(r.type);
    }

    console.log('[Reactions Batch] Found reactions for', Object.keys(result).length, 'posts');

    return respData(result);
  } catch (e: any) {
    console.error('[Reactions Batch] Failed:', e.message);
    return respErr(e.message);
  }
}
