/**
 * 修复 originalInput 脚本
 * 1. 恢复被清空的 originalInput（从 promptEnglish）
 * 2. 清空 prompt 字段（Build 旁边的输入框）
 */

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

async function main() {
  const database = db();

  // Step 1: 恢复 originalInput
  console.log('📊 Step 1: 恢复 originalInput...');

  const posts = await database
    .select({
      id: communityPost.id,
      params: communityPost.params,
    })
    .from(communityPost)
    .where(isNotNull(communityPost.params));

  console.log('需要检查的帖子数量:', posts.length);

  let restored = 0;
  for (const post of posts) {
    if (!post.params) continue;

    try {
      const parsed = JSON.parse(post.params);

      // 如果 originalInput 为空但 promptEnglish 有值，从 promptEnglish 恢复
      const needsRestore = !parsed.originalInput || parsed.originalInput === '';
      const hasSource = parsed.promptEnglish;

      if (needsRestore && hasSource) {
        parsed.originalInput = parsed.promptEnglish;

        await database
          .update(communityPost)
          .set({ params: JSON.stringify(parsed) })
          .where(eq(communityPost.id, post.id));

        restored++;
      }
    } catch (e) {
      // 跳过解析失败的
    }
  }

  console.log('✅ 已恢复', restored, '个帖子的 originalInput');

  // Step 2: 清空 prompt 字段（Build 旁边的输入框用的是这个）
  console.log('\n📊 Step 2: 清空 prompt 字段...');

  // 注意：之前已经清空了，这里只是确认
  const withPrompt = await database
    .select({ id: communityPost.id })
    .from(communityPost)
    .where(isNotNull(communityPost.prompt));

  console.log('有 prompt 的帖子数量:', withPrompt.length);

  if (withPrompt.length > 0) {
    await database
      .update(communityPost)
      .set({ prompt: null })
      .where(isNotNull(communityPost.prompt));

    console.log('✅ 已清空所有 prompt 字段');
  } else {
    console.log('✅ prompt 字段已经是空的');
  }

  await closeDb();
  console.log('\n🎉 完成！');
}

main().catch(async (e) => {
  console.error('❌ 错误:', e);
  await closeDb();
  process.exit(1);
});
