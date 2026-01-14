import 'dotenv/config';
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { isNull } from 'drizzle-orm';

async function main() {
  // 查找所有没有 seoSlug 的帖子（这些是用 UUID 路由的错误帖子）
  const posts = await db()
    .select({ id: communityPost.id, seoSlug: communityPost.seoSlug, title: communityPost.title })
    .from(communityPost)
    .where(isNull(communityPost.seoSlug));

  console.log(`找到 ${posts.length} 个没有 SEO slug 的帖子:`);
  posts.forEach(p => console.log(`  - ${p.id}: ${p.title?.slice(0, 50)}`));

  if (posts.length > 0) {
    await db()
      .delete(communityPost)
      .where(isNull(communityPost.seoSlug));
    console.log(`\n✅ 已删除 ${posts.length} 个帖子`);
  } else {
    console.log('\n没有需要删除的帖子');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('错误:', e);
  process.exit(1);
});
