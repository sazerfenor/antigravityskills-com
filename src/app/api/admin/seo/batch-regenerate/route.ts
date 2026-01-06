import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getCommunityPosts, updateCommunityPostById, CommunityPostStatus } from '@/shared/models/community_post';

/**
 * POST /api/admin/seo/batch-regenerate
 * 批量重新生成所有 published 帖子的 SEO 内容
 */
export async function POST(request: Request) {
  try {
    // 🔒 AuthN
    const user = await getSignUser();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    // 🔒 AuthZ
    if (!await hasPermission(user.id, 'admin.seo.write')) {
      return respErr('Forbidden: Missing admin.seo.write permission', 403);
    }

    const { dryRun = false, limit = 100, delayMs = 2000 } = await request.json() as {
      dryRun?: boolean;
      limit?: number;
      delayMs?: number;
    };

    console.log('[Batch Regenerate] Starting batch SEO regeneration...', { dryRun, limit, delayMs });

    // 1. 获取所有 published 帖子
    const posts = await getCommunityPosts({
      status: CommunityPostStatus.PUBLISHED,
      limit,
      page: 1,
    });

    console.log(`[Batch Regenerate] Found ${posts.length} published posts`);

    if (dryRun) {
      return respData({
        mode: 'dry-run',
        totalPosts: posts.length,
        posts: posts.map(p => ({ id: p.id, prompt: p.prompt?.substring(0, 50), model: p.model })),
      });
    }

    // 2. 逐个处理
    const results: { id: string; status: 'success' | 'error'; message?: string }[] = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`[Batch Regenerate] Processing ${i + 1}/${posts.length}: ${post.id}`);

      try {
        // 调用 generate-all API
        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/seo/generate-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({
            postId: post.id,
            prompt: post.prompt || '',
            model: post.model || 'gemini-3.0-flash-preview',
            imageUrl: post.imageUrl || '',
          }),
        });

        const generateData = await generateResponse.json() as any;

        if (generateData.code !== 0) {
          throw new Error(generateData.message || 'Generate failed');
        }

        // 保存 SEO 数据
        await updateCommunityPostById(post.id, {
          seoSlug: generateData.data.seoSlug,
          seoTitle: generateData.data.seoTitle,
          h1Title: generateData.data.h1Title,
          seoDescription: generateData.data.seoDescription,
          seoKeywords: generateData.data.seoKeywords,
          seoSlugKeywords: generateData.data.seoSlugKeywords,
          contentIntro: generateData.data.contentIntro,
          promptBreakdown: generateData.data.promptBreakdown,
          imageAlt: generateData.data.imageAlt,
          faqItems: generateData.data.faqItems,
          visualTags: generateData.data.visualTags,
          contentSections: generateData.data.contentSections,
          anchor: generateData.data.anchor,
          microFocus: generateData.data.microFocus,
        });

        results.push({ id: post.id, status: 'success' });
        console.log(`[Batch Regenerate] ✅ Success: ${post.id}`);

      } catch (error: any) {
        results.push({ id: post.id, status: 'error', message: error.message });
        console.error(`[Batch Regenerate] ❌ Error: ${post.id}`, error.message);
      }

      // 速率限制
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`[Batch Regenerate] Complete: ${successCount} success, ${errorCount} errors`);

    return respData({
      totalPosts: posts.length,
      successCount,
      errorCount,
      results,
    });

  } catch (error: any) {
    console.error('[Batch Regenerate] Fatal error:', error);
    return respErr(error.message);
  }
}
