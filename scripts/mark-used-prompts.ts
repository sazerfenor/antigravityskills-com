import fs from 'fs';
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';

/**
 * 标记源文件中已被使用的 prompts
 *
 * 目的：
 * 1. 在 merged-prompts-full.json 中添加 "used" 字段标记已生成图片的 prompts
 * 2. 方便后续筛选 Top 200 时排除已用 prompts（避免重复生成）
 */
async function markUsedPrompts() {
  console.log('🏷️  标记源文件中已使用的 prompts...\n');

  // 1. 从数据库查询所有已生成的 prompts
  const existingPosts = await db()
    .select({
      prompt: communityPost.prompt,
      id: communityPost.id,
    })
    .from(communityPost);

  console.log(`📊 数据库中有 ${existingPosts.length} 条已生成的帖子\n`);

  // 创建已用 prompts 集合（用于快速查找）
  const usedPrompts = new Set(existingPosts.map(p => p.prompt.trim()));

  // 2. 加载源文件
  const sourcePath = 'docs/prompt-scoring/output/merged-prompts-full.json';
  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  console.log(`📂 源文件包含 ${sourceData.length} 条 prompts\n`);

  // 3. 标记已用 prompts
  let usedCount = 0;
  const marked = sourceData.map((item: any) => {
    const isUsed = usedPrompts.has(item.prompt.trim());
    if (isUsed) usedCount++;

    return {
      ...item,
      used: isUsed,
    };
  });

  console.log(`✅ 标记完成: ${usedCount} 条已使用, ${sourceData.length - usedCount} 条未使用\n`);

  // 4. 保存带标记的文件
  const outputPath = 'docs/prompt-scoring/output/merged-prompts-full-marked.json';
  fs.writeFileSync(outputPath, JSON.stringify(marked, null, 2));
  console.log(`💾 已保存到: ${outputPath}`);

  // 5. 统计信息
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 统计:`);
  console.log(`   源文件总数: ${sourceData.length}`);
  console.log(`   已使用: ${usedCount} (${((usedCount / sourceData.length) * 100).toFixed(1)}%)`);
  console.log(`   未使用: ${sourceData.length - usedCount} (${(((sourceData.length - usedCount) / sourceData.length) * 100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('✅ 标记完成！后续筛选 Top 200 时将使用带标记的文件');
  process.exit(0);
}

markUsedPrompts().catch(error => {
  console.error('❌ 标记失败:', error);
  process.exit(1);
});
