/**
 * 紧急修复脚本：恢复被清空的 prompt 字段
 *
 * 问题：之前错误地将数据库的 prompt 字段清空了
 * 解决：从 params.promptEnglish 恢复 prompt 字段
 */

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

async function main() {
  const database = db();

  console.log('📊 查询需要恢复的帖子...');

  // 查询所有 params 有值的帖子
  const posts = await database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      params: communityPost.params,
    })
    .from(communityPost)
    .where(isNotNull(communityPost.params));

  console.log('Total posts with params:', posts.length);

  let restored = 0;
  let skipped = 0;

  for (const post of posts) {
    // 如果 prompt 为空但 params.promptEnglish 有值，恢复它
    if (!post.prompt && post.params) {
      try {
        const parsed = JSON.parse(post.params);
        const promptToRestore = parsed.promptEnglish || parsed.promptNative;

        if (promptToRestore) {
          await database
            .update(communityPost)
            .set({ prompt: promptToRestore })
            .where(eq(communityPost.id, post.id));
          restored++;

          if (restored % 20 === 0) {
            console.log(`  进度: ${restored} 个已恢复...`);
          }
        } else {
          skipped++;
        }
      } catch (e) {
        skipped++;
      }
    } else if (post.prompt) {
      // prompt 已有值，跳过
      skipped++;
    }
  }

  console.log('\n✅ 恢复完成!');
  console.log(`  - 已恢复: ${restored} 个帖子`);
  console.log(`  - 跳过: ${skipped} 个帖子`);

  await closeDb();
}

main().catch(async (e) => {
  console.error('❌ 错误:', e);
  await closeDb();
  process.exit(1);
});
