import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/core/db';
import { user, userFollow, communityPost } from '@/config/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

/**
 * GET /api/users/[id]/profile
 * 获取用户完整资料 + isFollowing 状态
 * 统计数据从 community_post 表实时计算
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // 获取用户基础信息 + 实时计算统计数据
    const [profileUser] = await db()
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        bio: user.bio,
        createdAt: user.createdAt,
        isVirtual: user.isVirtual,
        originalTwitterUrl: user.originalTwitterUrl,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        // Real-time stats from community_post table
        postCount: sql<number>`CAST((SELECT COUNT(*) FROM community_post WHERE user_id = ${user.id} AND status = 'published') AS INTEGER)`.as('post_count'),
        totalViews: sql<number>`CAST(COALESCE((SELECT SUM(view_count) FROM community_post WHERE user_id = ${user.id} AND status = 'published'), 0) AS INTEGER)`.as('total_views'),
        totalLikes: sql<number>`CAST(COALESCE((SELECT SUM(like_count) FROM community_post WHERE user_id = ${user.id} AND status = 'published'), 0) AS INTEGER)`.as('total_likes'),
        totalDownloads: sql<number>`CAST(COALESCE((SELECT SUM(download_count) FROM community_post WHERE user_id = ${user.id} AND status = 'published'), 0) AS INTEGER)`.as('total_downloads'),
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!profileUser) {
      return respErr('User not found', 404);
    }

    // 检查当前登录用户是否关注了此用户
    let isFollowing = false;
    const currentUser = await getUserInfo();
    
    if (currentUser && currentUser.id !== userId) {
      const [followRecord] = await db()
        .select({ id: userFollow.id })
        .from(userFollow)
        .where(
          and(
            eq(userFollow.followerId, currentUser.id),
            eq(userFollow.followingId, userId)
          )
        )
        .limit(1);
      
      isFollowing = !!followRecord;
    }

    return respData({
      user: {
        ...profileUser,
        // 虚拟作者标识只在管理员后台显示，前端不返回
        isVirtual: undefined,
      },
      isFollowing,
    });
  } catch (error: any) {
    console.error('[GET Profile] Error:', error);
    return respErr(error.message);
  }
}
