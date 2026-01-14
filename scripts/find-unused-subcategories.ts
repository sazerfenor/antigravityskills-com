import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function findUnusedSubcategories() {
  console.log('🔍 分析未使用的 subcategory...\n');
  console.log('='.repeat(60));

  // 1. 读取 prompts-input-enriched.json
  const promptsPath = path.join(process.cwd(), 'prompts-input-enriched.json');
  const promptsData = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
  const allPrompts = promptsData.prompts;

  console.log(`\n📊 Prompt 数据统计:`);
  console.log(`  总 Prompt 数: ${allPrompts.length}`);
  console.log(`  总 subcategory 数: ${promptsData.meta.subcategoryCount}`);

  // 2. 获取已发布帖子的 subcategory
  const publishedPosts = await db()
    .select({
      subcategory: communityPost.subcategory,
      count: sql<number>`count(*)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .groupBy(communityPost.subcategory);

  const usedSubcategories = new Set(
    publishedPosts.map((p) => p.subcategory).filter(Boolean)
  );

  console.log(`\n📋 已发布帖子统计:`);
  console.log(`  已使用的 subcategory 数: ${usedSubcategories.size}`);
  publishedPosts.forEach((p) => {
    console.log(`    ${p.subcategory}: ${p.count} 篇`);
  });

  // 3. 找出所有 Prompt 的 subcategory
  const allSubcategories = new Set<string>();
  allPrompts.forEach((p: any) => {
    if (p.subcategory) {
      allSubcategories.add(p.subcategory);
    }
  });

  // 4. 找出未使用的 subcategory
  const unusedSubcategories = Array.from(allSubcategories).filter(
    (sub) => !usedSubcategories.has(sub)
  );

  console.log(`\n🆕 未使用的 subcategory:`);
  console.log(`  总数: ${unusedSubcategories.length}`);
  console.log(`  前 20 个:`);
  unusedSubcategories.slice(0, 20).forEach((sub, idx) => {
    console.log(`    ${idx + 1}. ${sub}`);
  });

  // 5. 查找已使用的 Prompt ID（假设已用前 210 个）
  const usedPromptIds = new Set(
    allPrompts.slice(0, 210).map((p: any) => p.id)
  );

  // 6. 从未使用的 Prompt 中筛选（排除前 210 个）
  const unusedPrompts = allPrompts
    .slice(210) // 排除前 210 个
    .filter((p: any) => unusedSubcategories.includes(p.subcategory));

  console.log(`\n🎯 符合条件的 Prompt（排除前 210 个，且 subcategory 未使用）:`);
  console.log(`  总数: ${unusedPrompts.length}`);

  // 7. 取前 5 个作为测试
  const testPrompts = unusedPrompts.slice(0, 5);

  console.log(`\n✅ 筛选出的 5 个测试 Prompt:\n`);
  testPrompts.forEach((p: any, idx: number) => {
    console.log(`【${idx + 1}】Prompt ID: ${p.id}`);
    console.log(`  Title: ${p.title}`);
    console.log(`  Subject: ${p.subject}`);
    console.log(`  Category: ${p.category}`);
    console.log(`  Subcategory: ${p.subcategory}`);
    console.log(`  Visual Tags: ${p.visualTags.join(', ')}`);
    console.log(`  Prompt (前 100 字): ${p.prompt.substring(0, 100)}...`);
    console.log('');
  });

  // 8. 保存结果到文件
  const outputPath = path.join(process.cwd(), 'test-prompts-5.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          totalUnusedSubcategories: unusedSubcategories.length,
          totalCandidates: unusedPrompts.length,
          selectedCount: testPrompts.length,
        },
        testPrompts,
      },
      null,
      2
    )
  );

  console.log(`\n💾 测试 Prompt 已保存到: ${outputPath}`);
  console.log(`\n🎉 分析完成！`);
}

findUnusedSubcategories()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  });
