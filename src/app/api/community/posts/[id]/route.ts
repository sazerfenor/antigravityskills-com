import { respData } from '@/shared/lib/resp';
import { findCommunityPostById } from '@/shared/models/community_post';
import { getTagsForPost } from '@/shared/models/tag';
import { incrementViewCount } from '@/shared/lib/kv';
import { handleApiError } from '@/shared/lib/api-error-handler';

/**
 * GET /api/community/posts/[id]
 * Get post details (for Remix and detail view)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get post with user info
    const post = await findCommunityPostById(id, true);
    if (!post) {
      throw new Error('post not found');
    }

    // Get tags for this post
    const tags = await getTagsForPost(id);

    // Increment view count in KV (async, non-blocking)
    incrementViewCount(id).catch((err) => {
      console.error('Failed to increment view count:', err);
    });

    return respData({
      ...post,
      tags,
    });
  } catch (e: unknown) {
    return handleApiError(e, { feature: 'community' });
  }
}
