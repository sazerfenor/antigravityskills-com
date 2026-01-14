import { db } from '@/core/db';
import { communityPost, post } from '@/config/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function countPages() {
  try {
    // 统计社区帖子
    const publishedPosts = await db()
      .select({ count: communityPost.id })
      .from(communityPost)
      .where(eq(communityPost.status, 'published'));

    const postsWithSEO = await db()
      .select({ count: communityPost.id })
      .from(communityPost)
      .where(eq(communityPost.status, 'published'));

    // 统计博客文章
    const blogPosts = await db()
      .select({ count: post.id })
      .from(post)
      .where(eq(post.status, 'published'));

    console.log('📊 页面统计报告');
    console.log('='.repeat(50));
    console.log(`✅ 已发布社区帖子: ${publishedPosts.length}`);
    console.log(`🔍 有SEO slug的帖子: ${postsWithSEO.filter((p: any) => p.seoSlug).length}`);
    console.log(`📝 已发布博客文章: ${blogPosts.length}`);
    console.log('='.repeat(50));
    console.log(`📄 静态页面 (sitemap.ts): ~17个`);
    console.log(`🌐 动态页面总计: ${publishedPosts.length + blogPosts.length}`);
    console.log(`📊 Sitemap总页面数: ~${17 + publishedPosts.length + blogPosts.length}`);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

countPages();
