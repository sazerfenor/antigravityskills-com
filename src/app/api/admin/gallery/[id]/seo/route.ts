import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  updateCommunityPostById,
  getCommunityPostById,
} from '@/shared/models/community_post';

/**
 * PATCH /api/admin/gallery/[id]/seo
 * 更新Community Post的SEO数据
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 验证Admin权限
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    // 获取post
    const post = await getCommunityPostById(id);
    if (!post) {
      throw new Error('post not found');
    }

    const seoData = await request.json() as any;
    
    console.log('[Admin SEO Update] Updating SEO data for post:', id);
    console.log('[V14 Debug Save] Received contentSections:', seoData.contentSections);
    console.log('[V14 Debug Save] contentSections type:', typeof seoData.contentSections);
    console.log('[V14 Debug Save] contentSections length:', seoData.contentSections?.length);
    console.log('[V14 Debug Save] Block types:', seoData.contentSections?.map((s: any) => s.type));

    // 更新SEO字段
    await updateCommunityPostById(id, {
      seoSlug: seoData.seoSlug,
      seoTitle: seoData.seoTitle,
      h1Title: seoData.h1Title, // 🆕 独立 H1
      seoDescription: seoData.seoDescription,
      seoKeywords: seoData.seoKeywords,
      seoSlugKeywords: seoData.seoSlugKeywords,
      category: seoData.category, // 🆕 Gallery 分类
      contentIntro: seoData.contentIntro,
      promptBreakdown: seoData.promptBreakdown,
      imageAlt: seoData.imageAlt,
      dynamicHeaders: seoData.dynamicHeaders,
      faqItems: seoData.faqItems,
      useCases: seoData.useCases,
      visualTags: seoData.visualTags,
      relatedPosts: seoData.relatedPosts,
      // 🆕 V12.0 新字段
      remixIdeas: seoData.remixIdeas ? JSON.parse(seoData.remixIdeas) : null,
      relatedConcepts: seoData.relatedConcepts ? JSON.parse(seoData.relatedConcepts) : null,
      // 🆕 V14.0 新字段 - P0 Critical Fix: 必须持久化
      contentSections: seoData.contentSections || null,
      anchor: seoData.anchor || null,
      microFocus: seoData.microFocus || null,
      // 🆕 缩略图 URL
      thumbnailUrl: seoData.thumbnailUrl || null,
    });

    console.log('[Admin SEO Update] ✅ SEO data updated successfully');

    return respData({ success: true });
  } catch (error: any) {
    console.error('[Admin SEO Update] Error:', error);
    return respErr(error.message);
  }
}
