/**
 * Batch Thumbnails API
 *
 * POST - Find posts that need thumbnails
 * PATCH - Update a post's thumbnailUrl after client-side generation
 *
 * Note: Actual thumbnail generation happens on client side using
 * browser-image-compression (see batch-thumbnails/page.tsx)
 */

import { respData, respErr } from '@/shared/lib/resp';
import { needsThumbnail } from '@/shared/lib/thumbnail-generator-server';
import {
  getCommunityPosts,
  updateCommunityPostById,
  CommunityPostStatus,
} from '@/shared/models/community_post';
import { getUserInfo } from '@/shared/models/user';

/**
 * POST /api/admin/gallery/batch-thumbnails
 * Find posts that need thumbnail generation
 */
export async function POST(request: Request) {
  try {
    // Verify admin
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const body = (await request.json()) as { limit?: number };
    const limit = Math.min(body.limit || 50, 200); // Max 200 per batch

    // Get published posts
    const posts = await getCommunityPosts({
      status: CommunityPostStatus.PUBLISHED,
      limit: 500, // Fetch more to filter
      page: 1,
    });

    // Filter posts that need thumbnails
    const postsNeedingThumbnails = posts
      .filter((post) => needsThumbnail(post.imageUrl, post.thumbnailUrl || null))
      .slice(0, limit)
      .map((post) => ({
        id: post.id,
        imageUrl: post.imageUrl,
        seoSlug: post.seoSlug,
      }));

    console.log(
      `[Batch Thumbnails] Found ${postsNeedingThumbnails.length} posts needing thumbnails (checked ${posts.length} published posts)`
    );

    return respData({
      posts: postsNeedingThumbnails,
      total: postsNeedingThumbnails.length,
    });
  } catch (e: any) {
    console.error('[Batch Thumbnails] POST Error:', e);
    return respErr(e.message);
  }
}

/**
 * PATCH /api/admin/gallery/batch-thumbnails
 * Update a post's thumbnailUrl after client-side generation
 */
export async function PATCH(request: Request) {
  try {
    // Verify admin
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const body = (await request.json()) as {
      postId: string;
      thumbnailUrl: string;
    };

    if (!body.postId) {
      return respErr('postId is required');
    }

    if (!body.thumbnailUrl) {
      return respErr('thumbnailUrl is required');
    }

    // Update the post
    await updateCommunityPostById(body.postId, {
      thumbnailUrl: body.thumbnailUrl,
    });

    console.log('[Batch Thumbnails] Updated post:', body.postId, 'with thumbnail:', body.thumbnailUrl);

    return respData({ success: true, thumbnailUrl: body.thumbnailUrl });
  } catch (e: any) {
    console.error('[Batch Thumbnails] PATCH Error:', e);
    return respErr(e.message);
  }
}
