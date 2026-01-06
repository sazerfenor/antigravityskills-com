/**
 * 修复已重建帖子的 params 结构
 * 添加 version: 2 字段以支持 Remix 直接加载表单
 */

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, eq } from 'drizzle-orm';

async function fix() {
  const database = db();

  // 查找有 formValues 但缺少 version 字段的帖子
  const posts = await database
    .select({
      id: communityPost.id,
      params: communityPost.params,
      prompt: communityPost.prompt,
    })
    .from(communityPost)
    .where(sql`
      ${communityPost.params}::jsonb->>'formValues' IS NOT NULL
      AND ${communityPost.params}::jsonb->>'version' IS NULL
    `);

  console.log(`找到 ${posts.length} 篇需要修复的帖子`);

  for (const post of posts) {
    if (post.params === null) continue;

    try {
      const parsed = JSON.parse(post.params);

      // 添加 version: 2 和其他缺失字段
      const fixed = {
        version: 2,
        ...parsed,
        originalInput: post.prompt || parsed.schema?.context || '',
        promptNative: parsed.promptNative || '',
        promptEnglish: parsed.promptEnglish || post.prompt || '',
        detectedLang: parsed.detectedLang || 'English',
        aspectRatio: parsed.aspectRatio || '1:1',
      };

      await database
        .update(communityPost)
        .set({ params: JSON.stringify(fixed) })
        .where(eq(communityPost.id, post.id));

      console.log(`  ✅ 修复: ${post.id.slice(0, 8)}...`);
    } catch (e: any) {
      console.log(`  ❌ 失败: ${post.id.slice(0, 8)} - ${e.message}`);
    }
  }

  console.log('\n修复完成！');
  await closeDb();
}

fix().catch(console.error);
