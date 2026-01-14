/**
 * 补充现有帖子的 visualTags 字段
 * 从 contentSections 中提取 type='tags' 的数据
 */

import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema.sqlite';
import { eq, isNull, or } from 'drizzle-orm';

async function backfillVisualTags() {
  console.log('='.repeat(70));
  console.log('🔄 补充 visualTags 字段');
  console.log('='.repeat(70));

  // 查询所有 visualTags 为 null 或 '[]' 的帖子
  const posts = await db()
    .select({
      id: communityPost.id,
      contentSections: communityPost.contentSections,
      status: communityPost.status,
    })
    .from(communityPost)
    .where(
      or(
        isNull(communityPost.visualTags),
        eq(communityPost.visualTags, '[]')
      )
    );

  console.log(`\n找到 ${posts.length} 个需要补充的帖子`);

  let updated = 0;
  let skipped = 0;
  let noTags = 0;

  for (const post of posts) {
    if (!post.contentSections) {
      console.log(`⏭️ 跳过 ${post.id.substring(0, 8)}: 无 contentSections`);
      skipped++;
      continue;
    }

    try {
      const sections = JSON.parse(post.contentSections);
      const tagsSection = sections.find((s: any) => s.type === 'tags');

      if (tagsSection?.data?.items && Array.isArray(tagsSection.data.items)) {
        const visualTags = JSON.stringify(tagsSection.data.items);

        await db()
          .update(communityPost)
          .set({ visualTags })
          .where(eq(communityPost.id, post.id));

        console.log(`✅ ${post.id.substring(0, 8)}: ${tagsSection.data.items.length} 个标签 - ${tagsSection.data.items.slice(0, 3).join(', ')}...`);
        updated++;
      } else {
        console.log(`⚠️ ${post.id.substring(0, 8)}: contentSections 中无 tags block`);
        noTags++;
      }
    } catch (e: any) {
      console.error(`❌ ${post.id.substring(0, 8)}: 解析失败 -`, e.message);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 补充完成');
  console.log('='.repeat(70));
  console.log(`✅ 成功更新: ${updated}`);
  console.log(`⚠️ 无tags block: ${noTags}`);
  console.log(`❌ 跳过/失败: ${skipped}`);

  console.log('\n💡 建议:');
  if (noTags > 0) {
    console.log(`   ${noTags} 个帖子的 contentSections 中没有 tags block`);
    console.log(`   可能是 AI 生成时没有生成 tags section`);
    console.log(`   需要检查 SEO prompt 是否正确要求生成 tags`);
  }

  if (updated > 0) {
    console.log(`\n🔄 请运行验证脚本查看结果:`);
    console.log(`   pnpm tsx scripts/verify-tags.ts`);
  }
}

backfillVisualTags().catch(console.error);
