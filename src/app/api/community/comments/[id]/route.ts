import { NextRequest } from 'next/server';
import { db } from '@/core/db';
import { eq, and } from 'drizzle-orm';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { comment } from '@/config/db/schema';
import { hasAnyRole, ROLES } from '@/shared/services/rbac';

/**
 * DELETE /api/community/comments/[id]
 * 删除评论（软删除）
 * - 用户可删除自己的评论
 * - 管理员可删除任意评论
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to delete comments');
    }

    const { id: commentId } = await params;

    // 检查评论是否存在
    const existingComment = await db()
      .select()
      .from(comment)
      .where(eq(comment.id, commentId))
      .limit(1);

    if (existingComment.length === 0) {
      return respErr('Comment not found');
    }

    // 权限检查：评论作者 或 管理员
    const isOwner = existingComment[0].userId === currentUser.id;
    const isAdmin = await hasAnyRole(currentUser.id, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);

    if (!isOwner && !isAdmin) {
      return respErr('You can only delete your own comments');
    }

    // 软删除
    await db()
      .update(comment)
      .set({ status: 'deleted' })
      .where(eq(comment.id, commentId));

    return respData({ success: true });
  } catch (error: any) {
    console.error('[DELETE Comment] Error:', error);
    return respErr(error.message);
  }
}

/**
 * PATCH /api/community/comments/[id]
 * 编辑评论
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to edit comments');
    }

    const { id: commentId } = await params;
    const { content } = await request.json() as any;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return respErr('Comment content is required');
    }

    // 检查评论是否属于当前用户
    const existingComment = await db()
      .select()
      .from(comment)
      .where(eq(comment.id, commentId))
      .limit(1);

    if (existingComment.length === 0) {
      return respErr('Comment not found');
    }

    if (existingComment[0].userId !== currentUser.id) {
      return respErr('You can only edit your own comments');
    }

    // 更新评论
    await db()
      .update(comment)
      .set({ 
        content: content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(comment.id, commentId));

    return respData({ success: true });
  } catch (error: any) {
    console.error('[PATCH Comment] Error:', error);
    return respErr(error.message);
  }
}
