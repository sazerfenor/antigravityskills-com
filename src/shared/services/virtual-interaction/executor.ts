/**
 * 虚拟人格互动执行器
 *
 * @description 执行实际的互动操作（评论、关注、点赞）
 */

import { db } from '@/core/db';
import { communityPost, comment, userFollow } from '@/config/db/schema.sqlite';
import { eq, desc, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { checkInteraction, recordInteraction, getThreadDepth } from './arbiter';
import { generateBestComment } from './content-generator';
import { findVirtualPersonaByUserId, type VirtualPersona } from '@/shared/models/virtual_persona';
import type { CommentGenerationContext } from '@/shared/types/virtual-persona';

// ============================================
// 类型定义
// ============================================

export interface InteractionResult {
  success: boolean;
  type: 'comment' | 'follow' | 'like';
  targetPostId?: string;
  targetUserId?: string;
  content?: string;
  error?: string;
  skippedReason?: string;
}

export interface PostForInteraction {
  id: string;
  userId: string;
  prompt: string | null;
  imageAlt: string | null;
  category: string | null;
  authorName?: string;
}

// ============================================
// 获取互动目标
// ============================================

/**
 * 获取最近的可互动帖子
 */
export async function getRecentPostsForInteraction(
  limit: number = 20,
  excludeUserIds: string[] = []
): Promise<PostForInteraction[]> {
  const { user } = await import('@/config/db/schema.sqlite');

  const query = db()
    .select({
      id: communityPost.id,
      userId: communityPost.userId,
      prompt: communityPost.prompt,
      imageAlt: communityPost.imageAlt,
      category: communityPost.category,
      authorName: user.name,
    })
    .from(communityPost)
    .leftJoin(user, eq(communityPost.userId, user.id))
    .where(eq(communityPost.status, 'published'))
    .orderBy(desc(communityPost.publishedAt))
    .limit(limit);

  const posts = await query;

  // 过滤排除的用户
  return posts.filter((p: any) => !excludeUserIds.includes(p.userId));
}

/**
 * 获取帖子的评论历史
 */
export async function getCommentHistory(
  postId: string,
  limit: number = 5
): Promise<CommentGenerationContext['threadHistory']> {
  const { user } = await import('@/config/db/schema.sqlite');

  const comments = await db()
    .select({
      content: (comment as any).content,
      userId: (comment as any).userId,
      authorName: user.name,
    })
    .from(comment as any)
    .leftJoin(user, eq((comment as any).userId, user.id))
    .where(eq((comment as any).postId, postId))
    .orderBy(desc((comment as any).createdAt))
    .limit(limit);

  // 反转顺序（最早的在前）
  return comments.reverse().map((c: any) => ({
    authorName: c.authorName || '匿名用户',
    content: c.content || '',
    isPersona: false, // 稍后可以标记
  }));
}

// ============================================
// 执行互动
// ============================================

/**
 * 执行评论互动
 */
export async function executeComment(
  persona: VirtualPersona,
  post: PostForInteraction,
  parentCommentId?: string
): Promise<InteractionResult> {
  // 1. 获取对话深度
  const threadDepth = parentCommentId
    ? await getThreadDepth(parentCommentId, post.id)
    : 0;

  // 2. 检查是否允许互动
  const check = await checkInteraction(persona, post.userId, post.id, threadDepth);
  if (!check.allowed) {
    return {
      success: false,
      type: 'comment',
      targetPostId: post.id,
      targetUserId: post.userId,
      skippedReason: check.reason,
    };
  }

  // 3. 获取评论历史
  const threadHistory = await getCommentHistory(post.id);

  // 4. 生成评论内容
  const context: CommentGenerationContext = {
    persona,
    post: {
      id: post.id,
      prompt: post.prompt,
      imageAlt: post.imageAlt,
      category: post.category,
      authorName: post.authorName,
    },
    threadHistory,
  };

  const generated = await generateBestComment(context);
  if (!generated) {
    return {
      success: false,
      type: 'comment',
      targetPostId: post.id,
      error: 'Failed to generate quality comment',
    };
  }

  // 5. 创建评论
  const commentId = uuidv4();
  const now = new Date();

  await db().insert(comment as any).values({
    id: commentId,
    postId: post.id,
    userId: persona.userId,
    content: generated.content,
    parentId: parentCommentId || null,
    createdAt: now,
    updatedAt: now,
  });

  // 6. 记录互动
  await recordInteraction(persona, post.userId, 'comment', {
    targetPostId: post.id,
    generatedContent: generated.content,
    threadDepth: threadDepth + 1,
  });

  return {
    success: true,
    type: 'comment',
    targetPostId: post.id,
    targetUserId: post.userId,
    content: generated.content,
  };
}

/**
 * 执行关注互动
 */
export async function executeFollow(
  persona: VirtualPersona,
  targetUserId: string
): Promise<InteractionResult> {
  // 1. 检查是否允许互动
  const check = await checkInteraction(persona, targetUserId, '', 0);
  if (!check.allowed) {
    return {
      success: false,
      type: 'follow',
      targetUserId,
      skippedReason: check.reason,
    };
  }

  // 2. 检查是否已关注
  const existing = await db()
    .select()
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followerId, persona.userId),
        eq(userFollow.followingId, targetUserId)
      )
    );

  if (existing.length > 0) {
    return {
      success: false,
      type: 'follow',
      targetUserId,
      skippedReason: 'already_following',
    };
  }

  // 3. 创建关注关系
  const now = new Date();
  await db().insert(userFollow).values({
    id: uuidv4(),
    followerId: persona.userId,
    followingId: targetUserId,
    createdAt: now,
  });

  // 4. 记录互动
  await recordInteraction(persona, targetUserId, 'follow', {});

  return {
    success: true,
    type: 'follow',
    targetUserId,
  };
}

// ============================================
// 批量执行
// ============================================

/**
 * 为单个人格执行随机互动
 */
export async function executeRandomInteraction(
  persona: VirtualPersona
): Promise<InteractionResult | null> {
  // 获取可互动的帖子（排除自己的帖子）
  const posts = await getRecentPostsForInteraction(10, [persona.userId]);

  if (posts.length === 0) {
    return null;
  }

  // 随机选择一个帖子
  const post = posts[Math.floor(Math.random() * posts.length)];

  // 决定互动类型（80% 评论，20% 关注）
  const interactionType = Math.random() < 0.8 ? 'comment' : 'follow';

  if (interactionType === 'comment') {
    return executeComment(persona, post);
  } else {
    return executeFollow(persona, post.userId);
  }
}

/**
 * 批量执行互动
 */
export async function executeBatchInteractions(
  personas: VirtualPersona[],
  maxInteractions: number = 10
): Promise<{
  success: number;
  skipped: number;
  failed: number;
  results: InteractionResult[];
}> {
  const results: InteractionResult[] = [];
  let success = 0;
  let skipped = 0;
  let failed = 0;

  // 限制本次处理数量
  const toProcess = personas.slice(0, maxInteractions);

  for (const persona of toProcess) {
    try {
      const result = await executeRandomInteraction(persona);

      if (!result) {
        skipped++;
        continue;
      }

      results.push(result);

      if (result.success) {
        success++;
      } else if (result.skippedReason) {
        skipped++;
      } else {
        failed++;
      }

      // 避免过快请求
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err: any) {
      failed++;
      results.push({
        success: false,
        type: 'comment',
        error: err.message,
      });
    }
  }

  return { success, skipped, failed, results };
}
