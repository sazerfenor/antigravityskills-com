import { NextRequest } from 'next/server';
import { db } from '@/core/db';
import { eq, and, sql } from 'drizzle-orm';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { userFollow, user } from '@/config/db/schema';
import { nanoid } from 'nanoid';
import { sendNotification, NotificationType } from '@/shared/services/notification';

/**
 * GET /api/users/[id]/follow
 * 获取当前用户是否关注了目标用户
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    const { id: targetUserId } = await params;

    if (!currentUser) {
      return respData({ isFollowing: false });
    }

    const existing = await db()
      .select()
      .from(userFollow)
      .where(
        and(
          eq(userFollow.followerId, currentUser.id),
          eq(userFollow.followingId, targetUserId)
        )
      )
      .limit(1);

    return respData({ isFollowing: existing.length > 0 });
  } catch (error: any) {
    console.error('[GET Follow Status] Error:', error);
    return respErr(error.message);
  }
}

/**
 * POST /api/users/[id]/follow
 * 关注/取消关注用户
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Please sign in to follow users');
    }

    const { id: targetUserId } = await params;

    // 不能关注自己
    if (currentUser.id === targetUserId) {
      return respErr('Cannot follow yourself');
    }

    // 检查是否已关注
    const existing = await db()
      .select()
      .from(userFollow)
      .where(
        and(
          eq(userFollow.followerId, currentUser.id),
          eq(userFollow.followingId, targetUserId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 取消关注
      await db()
        .delete(userFollow)
        .where(eq(userFollow.id, existing[0].id));

      // 更新计数
      await Promise.all([
        db()
          .update(user)
          .set({ followingCount: sql`${user.followingCount} - 1` })
          .where(eq(user.id, currentUser.id)),
        db()
          .update(user)
          .set({ followerCount: sql`${user.followerCount} - 1` })
          .where(eq(user.id, targetUserId)),
      ]);

      return respData({ isFollowing: false });
    } else {
      // 添加关注
      await db().insert(userFollow).values({
        id: nanoid(),
        followerId: currentUser.id,
        followingId: targetUserId,
        createdAt: new Date(),
      });

      // 更新计数
      await Promise.all([
        db()
          .update(user)
          .set({ followingCount: sql`${user.followingCount} + 1` })
          .where(eq(user.id, currentUser.id)),
        db()
          .update(user)
          .set({ followerCount: sql`${user.followerCount} + 1` })
          .where(eq(user.id, targetUserId)),
      ]);

      // 发送通知给被关注者
      sendNotification({
        userId: targetUserId,
        type: NotificationType.NEW_FOLLOWER,
        actorId: currentUser.id,
        resourceId: currentUser.id,
        resourceType: 'user' as any,
        link: `/profile/${currentUser.id}`,
        previewText: `${currentUser.name} followed you`,
      }).catch(console.error);

      return respData({ isFollowing: true });
    }
  } catch (error: any) {
    console.error('[POST Follow] Error:', error);
    return respErr(error.message);
  }
}
