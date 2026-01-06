import { respData, respErr } from '@/shared/lib/resp';
import { generateSEOSlug, saveSlugWithRetry } from '@/shared/lib/seo-slug-generator';
import {
  updateCommunityPostById,
  findCommunityPostById,
  CommunityPostStatus,
} from '@/shared/models/community_post';
import { getUserInfo } from '@/shared/models/user';

/**
 * PATCH /api/admin/gallery/[id]
 * Approve or reject a post
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action }: any = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      throw new Error('invalid action, must be "approve" or "reject"');
    }

    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // TODO: Add admin role check
    // if (!user.isAdmin) {
    //   throw new Error('unauthorized: admin only');
    // }

    // Verify post exists
    const post = await findCommunityPostById(id);
    if (!post) {
      throw new Error('post not found');
    }

    // 🔥 Generate SEO slug when approving
    if (action === 'approve') {
      console.log('[Admin Approve] Generating SEO slug for post:', id);
      
      try {
        let slug: string;
        
        // Option 1: Use AI-generated seoSlugKeywords if available
        if (post.seoSlugKeywords) {
          console.log('[Admin Approve] Using AI-generated seoSlugKeywords');
          const { modelNameToSlug, cleanSlugText } = await import('@/shared/lib/seo-slug-generator');
          const modelSlug = modelNameToSlug(post.model || 'unknown');
          const keywordsPart = cleanSlugText(post.seoSlugKeywords);
          const shortId = post.id.replace(/-/g, '').slice(-8);
          slug = `${modelSlug}-${keywordsPart}-${shortId}`;
        } else {
          // Option 2: Generate using simple algorithm
          console.log('[Admin Approve] No seoSlugKeywords, using simple algorithm');
          slug = await generateSEOSlug({
            prompt: post.prompt || '',
            model: post.model || '',
            postId: post.id,
            useAI: false, // Simple extraction
          });
        }
        
        console.log('[Admin Approve] Generated slug:', slug);
        
        // Save slug with automatic conflict handling
        await saveSlugWithRetry(post.id, slug);
        
        console.log('[Admin Approve] ✅ Slug saved successfully');
      } catch (slugError) {
        // Log error but don't block approval
        console.error('[Admin Approve] ⚠️ Failed to generate/save slug:', slugError);
        // Continue with approval even if slug generation fails
      }

      // 🖼️ Note: Thumbnail generation happens on client-side in Admin Gallery SEO Edit page
      // using browser-image-compression. See: admin-gallery-seo-edit/index.tsx
    }

    // Update status
    const newStatus = action === 'approve' 
      ? CommunityPostStatus.PUBLISHED 
      : CommunityPostStatus.REJECTED;

    const updatedPost = await updateCommunityPostById(id, {
      status: newStatus,
      publishedAt: action === 'approve' ? new Date() : post.publishedAt,
    });

    return respData(updatedPost);
  } catch (e: any) {
    console.error('Admin action failed:', e);
    return respErr(e.message);
  }
}
