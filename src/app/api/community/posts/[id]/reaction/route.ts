import { respData } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  toggleReaction,
  getUserReactionsForPost,
  ReactionType,
} from '@/shared/models/reaction';
import { incrementLikeCount } from '@/shared/models/community_post';
import { handleApiError } from '@/shared/lib/api-error-handler';

/**
 * POST /api/community/posts/[id]/reaction
 * Toggle reaction on a post
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { type }: any = await request.json();

    console.log('[Reaction API] POST request received:', { postId, type });

    if (!type || !Object.values(ReactionType).includes(type)) {
      throw new Error('invalid reaction type');
    }

    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    console.log('[Reaction API] User authenticated:', { userId: user.id, username: user.name });

    // Toggle reaction (true = created, false = deleted)
    const isCreated = await toggleReaction(user.id, postId, type as ReactionType);
    console.log('[Reaction API] Reaction toggled:', { isCreated, userId: user.id, postId, type });

    // Update post's like count cache
    const delta = isCreated ? 1 : -1;
    await incrementLikeCount(postId, delta);
    console.log('[Reaction API] Like count updated:', { postId, delta });

    // Get user's current reactions for this post
    const userReactions = await getUserReactionsForPost(user.id, postId);
    console.log('[Reaction API] User reactions fetched:', { postId, reactions: userReactions.map(r => r.type) });

    return respData({
      success: true,
      isCreated,
      userReactions: userReactions.map((r) => r.type),
    });
  } catch (e: unknown) {
    return handleApiError(e, { feature: 'community' });
  }
}

/**
 * GET /api/community/posts/[id]/reaction
 * Get user's reactions for a post
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{id: string }> }
) {
  try {
    const { id: postId } = await params;

    // Get current user (optional, can be anonymous)
    const user = await getUserInfo();
    if (!user) {
      return respData({ userReactions: [] });
    }

    // Get user's reactions
    const userReactions = await getUserReactionsForPost(user.id, postId);

    return respData({
      userReactions: userReactions.map((r) => r.type),
    });
  } catch (e: unknown) {
    return handleApiError(e, { feature: 'community' });
  }
}
