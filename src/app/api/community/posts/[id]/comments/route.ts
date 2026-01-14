import { NextRequest } from 'next/server';
import { db } from '@/core/db';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { comment, user, communityPost } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { sendNotification, NotificationType } from '@/shared/services/notification';

/**
 * GET /api/community/posts/[id]/comments
 * 获取帖子评论列表（分页 + 加权排序）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    // 获取顶级评论 (parentId = null)，按加权排序
    // score = likeCount × 1 + uniqueReplierCount × 2
    const topLevelComments = await db()
      .select({
        id: comment.id,
        content: comment.content,
        likeCount: comment.likeCount,
        uniqueReplierCount: comment.uniqueReplierCount,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(comment)
      .innerJoin(user, eq(comment.userId, user.id))
      .where(
        and(
          eq(comment.postId, postId),
          eq(comment.status, 'active'),
          isNull(comment.parentId) // 只获取顶级评论
        )
      )
      .orderBy(
        // 加权排序：score = likeCount + uniqueReplierCount * 2
        desc(sql`${comment.likeCount} + ${comment.uniqueReplierCount} * 2`),
        desc(comment.createdAt) // 次要排序：时间
      )
      .limit(limit)
      .offset(offset);

    // 获取每个顶级评论的回复
    const commentIds = topLevelComments.map((c: any) => c.id);
    let repliesMap: Record<string, any[]> = {};
    
    if (commentIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const replies = await db()
        .select({
          id: comment.id,
          content: comment.content,
          likeCount: comment.likeCount,
          createdAt: comment.createdAt,
          parentId: comment.parentId,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
          },
        })
        .from(comment)
        .innerJoin(user, eq(comment.userId, user.id))
        .where(
          and(
            eq(comment.postId, postId),
            eq(comment.status, 'active'),
            inArray(comment.parentId, commentIds)
          )
        )
        .orderBy(comment.createdAt); // 回复按时间正序

      // 将回复分组
      for (const reply of replies) {
        if (reply.parentId) {
          if (!repliesMap[reply.parentId]) {
            repliesMap[reply.parentId] = [];
          }
          repliesMap[reply.parentId].push(reply);
        }
      }
    }

    // 组装评论列表
    const commentsWithReplies = topLevelComments.map((c: any) => ({
      ...c,
      replies: repliesMap[c.id] || [],
    }));

    // 获取总数
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(comment)
      .where(
        and(
          eq(comment.postId, postId),
          eq(comment.status, 'active'),
          isNull(comment.parentId)
        )
      );
    const total = totalResult[0]?.count || 0;

    return respData({
      comments: commentsWithReplies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[GET Comments] Error:', error);
    return respErr(error.message);
  }
}

/**
 * POST /api/community/posts/[id]/comments
 * 创建评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to comment');
    }

    // 🛡️ Rate Limit - 防刷屏（每分钟最多 5 条）
    const rateLimitKey = `comment:user:${currentUser.id}`;
    const { checkRateLimit } = await import('@/shared/lib/rate-limit');
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, 60);
    if (!rateLimitResult.success) {
      return respErr('Posting too fast, please take a break.');
    }

    const { id: postId } = await params;
    const body = await request.json() as any;

    // 🛡️ Zod 验证 - 内容长度限制
    const { commentCreateSchema } = await import('@/shared/schemas/api-schemas');
    const parseResult = commentCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten();
      return respErr(errors.fieldErrors.content?.[0] || 'Invalid input');
    }

    const { content, parentId } = parseResult.data;

    // 🛡️ 嵌套深度限制 - 只允许 2 层评论
    if (parentId) {
      const parentComment = await db()
        .select({ parentId: comment.parentId })
        .from(comment)
        .where(eq(comment.id, parentId))
        .limit(1);

      if (parentComment.length > 0 && parentComment[0].parentId) {
        return respErr('Max reply depth reached (2 levels only)');
      }
    }

    // 创建评论
    const newComment = {
      id: nanoid(),
      userId: currentUser.id,
      postId,
      parentId: parentId || null,
      content: content.trim(),
      status: 'active',
      likeCount: 0,
      uniqueReplierCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db().insert(comment).values(newComment);

    // 获取用户信息用于返回
    const createdComment = {
      ...newComment,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
      },
    };

    // 如果是回复，更新父评论的独立回复者计数
    if (parentId) {
      // 检查是否是新回复者
      const existingReplies = await db()
        .select({ userId: comment.userId })
        .from(comment)
        .where(
          and(
            eq(comment.parentId, parentId),
            eq(comment.status, 'active')
          )
        );

      const uniqueRepliers = new Set(existingReplies.map((r: any) => r.userId));
      if (!uniqueRepliers.has(currentUser.id)) {
        // 新回复者，增加计数
        await db()
          .update(comment)
          .set({
            uniqueReplierCount: sql`${comment.uniqueReplierCount} + 1`,
          })
          .where(eq(comment.id, parentId));
      }
    }

    // === 发送通知 ===
    // 1. 如果是回复，通知父评论作者
    if (parentId) {
      // 获取父评论作者和帖子 slug
      const parentComment = await db()
        .select({ 
          userId: comment.userId,
          postSlug: communityPost.seoSlug,
        })
        .from(comment)
        .innerJoin(communityPost, eq(comment.postId, communityPost.id))
        .where(eq(comment.id, parentId))
        .limit(1);
      
      if (parentComment.length > 0 && parentComment[0].postSlug) {
        sendNotification({
          userId: parentComment[0].userId,
          type: NotificationType.COMMENT_REPLY,
          actorId: currentUser.id,
          resourceId: newComment.id,
          resourceType: 'comment',
          // 链接包含评论锚点，方便定位
          link: `/prompts/${parentComment[0].postSlug}#comment-${newComment.id}`,
          previewText: content.slice(0, 100),
        }).catch(console.error);
      }
    }

    // 2. 通知帖子作者（有新评论）
    const post = await db()
      .select({ userId: communityPost.userId, slug: communityPost.seoSlug })
      .from(communityPost)
      .where(eq(communityPost.id, postId))
      .limit(1);

    if (post.length > 0 && post[0].slug) {
      sendNotification({
        userId: post[0].userId,
        type: NotificationType.POST_COMMENT,
        actorId: currentUser.id,
        resourceId: postId,
        resourceType: 'post',
        // 链接包含新评论锚点
        link: `/prompts/${post[0].slug}#comment-${newComment.id}`,
        previewText: content.slice(0, 100),
      }).catch(console.error);
    }

    return respData(createdComment);
  } catch (error: any) {
    console.error('[POST Comment] Error:', error);
    return respErr(error.message);
  }
}
