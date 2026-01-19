import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema';
import { sql, desc, inArray } from 'drizzle-orm';

async function main() {
  // 获取所有 skill- 开头的 post
  const results = await db()
    .select({
      id: communityPost.id,
      seoSlug: communityPost.seoSlug,
      title: communityPost.title,
      createdAt: communityPost.createdAt,
    })
    .from(communityPost)
    .where(sql`seo_slug LIKE 'skill-%'`)
    .orderBy(communityPost.seoSlug, desc(communityPost.createdAt));
  
  // 按 skill 名分组，找出重复的
  const grouped: Record<string, any[]> = {};
  for (const r of results) {
    // 提取 skill 名 (去掉 skill- 前缀和 -xxxxxx 后缀)
    const match = r.seoSlug?.match(/^skill-(.+)-[a-f0-9]{6,8}$/);
    if (match) {
      const skillName = match[1];
      if (!grouped[skillName]) grouped[skillName] = [];
      grouped[skillName].push(r);
    }
  }
  
  // 找出需要删除的 (保留每组最后一条，即最新的)
  const toDelete: string[] = [];
  for (const [skillName, posts] of Object.entries(grouped)) {
    // 按 createdAt 降序排序，第一条最新
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (posts.length > 1) {
      console.log(`\n[${skillName}] 有 ${posts.length} 条记录:`);
      posts.forEach((p, i) => {
        const status = i === 0 ? '✅ 保留' : '❌ 删除';
        console.log(`  ${status}: ${p.seoSlug} (${p.createdAt})`);
        if (i > 0) toDelete.push(p.id);
      });
    }
  }
  
  console.log(`\n总计需要删除: ${toDelete.length} 条`);
  
  if (toDelete.length > 0) {
    // 执行删除
    await db()
      .delete(communityPost)
      .where(inArray(communityPost.id, toDelete));
    console.log('✅ 删除完成');
  }
}

main().catch(console.error);
