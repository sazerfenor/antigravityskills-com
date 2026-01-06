import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  getCommunityPosts,
  getCommunityPostsCount,
  CommunityPostStatus,
} from '@/shared/models/community_post';

/**
 * GET /api/admin/gallery
 * Get pending posts for admin review
 */
export async function GET(request: Request) {
  try {
    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // TODO: Add admin role check
    // For now, assume authenticated user is admin
    // if (!user.isAdmin) {
    //   throw new Error('unauthorized: admin only');
    // }

    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const statusParam = searchParams.get('status');
    
    // Default to pending, but allow admin to view all statuses
    let status: CommunityPostStatus | CommunityPostStatus[];
    if (statusParam) {
      status = statusParam as CommunityPostStatus;
    } else {
      status = CommunityPostStatus.PENDING;
    }

    // Get posts with user info
    const posts = await getCommunityPosts({
      status,
      sort: 'newest',
      page,
      limit,
      getUser: true,
    });

    // Get total count
    const total = await getCommunityPostsCount({ status });

    return respData({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e: any) {
    console.error('Get admin gallery failed:', e);
    return respErr(e.message);
  }
}
