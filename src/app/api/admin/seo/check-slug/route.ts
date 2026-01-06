import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * GET /api/admin/seo/check-slug?slug={slug}&postId={postId}
 * Check if a slug is already in use
 */
export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const postId = searchParams.get('postId'); // Current post's ID (to exclude from check)

    if (!slug) {
      throw new Error('slug parameter is required');
    }

    // Check if slug exists in database (excluding current post)
    const query = postId
      ? db()
          .select({ id: communityPost.id })
          .from(communityPost)
          .where(and(
            eq(communityPost.seoSlug, slug),
            ne(communityPost.id, postId)
          ))
          .limit(1)
      : db()
          .select({ id: communityPost.id })
          .from(communityPost)
          .where(eq(communityPost.seoSlug, slug))
          .limit(1);

    const existing = await query;

    return respData({
      available: existing.length === 0,
      slug,
      conflictId: existing[0]?.id || null,
    });
  } catch (error: any) {
    console.error('[Check Slug] Error:', error);
    return respErr(error.message);
  }
}
