import { NextRequest } from 'next/server';
import { db } from '@/core/db';
import { eq, and, sql } from 'drizzle-orm';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { commentReaction, comment } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// KV 键前缀
const COMMENT_LIKE_PREFIX = 'comment:like:';

function getSessionKV(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    return env.SESSION_KV;
  } catch {
    return null;
  }
}

/**
 * POST /api/community/comments/[id]/like
 * 点赞/取消点赞评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to like comments');
    }

    const { id: commentId } = await params;
    const kv = getSessionKV();
    const kvKey = `${COMMENT_LIKE_PREFIX}${currentUser.id}:${commentId}`;

    // 快速路径：检查 KV 缓存
    if (kv) {
      const cached = await kv.get(kvKey);
      if (cached !== null) {
        const isLiked = cached === '1';
        // 切换状态
        if (isLiked) {
          await kv.delete(kvKey);
          // 后台删除数据库记录
          deleteReactionInBackground(currentUser.id, commentId);
          return respData({ liked: false });
        } else {
          await kv.put(kvKey, '1', { expirationTtl: 86400 * 30 }); // 30 days
          // 后台创建数据库记录
          createReactionInBackground(currentUser.id, commentId);
          return respData({ liked: true });
        }
      }
    }

    // 慢路径：查询数据库
    const existing = await db()
      .select()
      .from(commentReaction)
      .where(
        and(
          eq(commentReaction.userId, currentUser.id),
          eq(commentReaction.commentId, commentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 取消点赞
      await db()
        .delete(commentReaction)
        .where(eq(commentReaction.id, existing[0].id));

      // 更新评论点赞计数
      await db()
        .update(comment)
        .set({ likeCount: sql`${comment.likeCount} - 1` })
        .where(eq(comment.id, commentId));

      // 更新 KV 缓存
      if (kv) await kv.delete(kvKey);

      return respData({ liked: false });
    } else {
      // 添加点赞
      await db().insert(commentReaction).values({
        id: nanoid(),
        userId: currentUser.id,
        commentId,
        type: 'like',
        createdAt: new Date(),
      });

      // 更新评论点赞计数
      await db()
        .update(comment)
        .set({ likeCount: sql`${comment.likeCount} + 1` })
        .where(eq(comment.id, commentId));

      // 更新 KV 缓存
      if (kv) await kv.put(kvKey, '1', { expirationTtl: 86400 * 30 });

      return respData({ liked: true });
    }
  } catch (error: any) {
    console.error('[POST Comment Like] Error:', error);
    return respErr(error.message);
  }
}

// 后台创建点赞记录（fire-and-forget）
async function createReactionInBackground(userId: string, commentId: string) {
  try {
    const existing = await db()
      .select()
      .from(commentReaction)
      .where(
        and(
          eq(commentReaction.userId, userId),
          eq(commentReaction.commentId, commentId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db().insert(commentReaction).values({
        id: nanoid(),
        userId,
        commentId,
        type: 'like',
        createdAt: new Date(),
      });

      await db()
        .update(comment)
        .set({ likeCount: sql`${comment.likeCount} + 1` })
        .where(eq(comment.id, commentId));
    }
  } catch (error) {
    console.error('[Background Create Reaction] Error:', error);
  }
}

// 后台删除点赞记录（fire-and-forget）
async function deleteReactionInBackground(userId: string, commentId: string) {
  try {
    const existing = await db()
      .select()
      .from(commentReaction)
      .where(
        and(
          eq(commentReaction.userId, userId),
          eq(commentReaction.commentId, commentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db()
        .delete(commentReaction)
        .where(eq(commentReaction.id, existing[0].id));

      await db()
        .update(comment)
        .set({ likeCount: sql`${comment.likeCount} - 1` })
        .where(eq(comment.id, commentId));
    }
  } catch (error) {
    console.error('[Background Delete Reaction] Error:', error);
  }
}
