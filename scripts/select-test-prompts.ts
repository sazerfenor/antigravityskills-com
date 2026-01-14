import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function selectTestPrompts() {
  console.log('🔍 从 merged-prompts-full.json 选择测试 Prompt...\n');
  console.log('='.repeat(60));

  // 1. 读取评分后的 Prompt 数据（这是正确的数据源）
  const sourcePath = path.join(process.cwd(), 'docs/prompt-scoring/output/merged-prompts-full.json');

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 源文件不存在: ${sourcePath}`);
    process.exit(1);
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  console.log(`📂 已加载 ${sourceData.length} 条 Prompt`);

  // 2. 获取已发布帖子使用的 subcategory (即 subject_type)
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
  console.log(`  已使用的 subcategory (subject_type) 数: ${usedSubcategories.size}`);
  console.log(`  总帖子数: ${publishedPosts.reduce((sum, p) => sum + p.count, 0)}`);
  console.log(`\n  使用最多的 10 个 subcategory:`);
  publishedPosts
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((p, idx) => {
      console.log(`    ${idx + 1}. ${p.subcategory}: ${p.count} 篇`);
    });

  // 3. 统计所有 subject_type
  const allSubjectTypes = new Set<string>();
  sourceData.forEach((item: any) => {
    if (item.subject_type) {
      allSubjectTypes.add(item.subject_type);
    }
  });

  console.log(`\n📊 Prompt 库中的 subject_type 统计:`);
  console.log(`  总 subject_type 数: ${allSubjectTypes.size}`);

  // 4. 找出未使用的 subject_type
  const unusedSubjectTypes = Array.from(allSubjectTypes).filter(
    (st) => !usedSubcategories.has(st)
  );

  console.log(`\n🆕 未使用的 subject_type:`);
  console.log(`  总数: ${unusedSubjectTypes.length}`);
  console.log(`  前 20 个:`);
  unusedSubjectTypes.slice(0, 20).forEach((st, idx) => {
    const count = sourceData.filter((item: any) => item.subject_type === st).length;
    console.log(`    ${idx + 1}. ${st} (${count} 个 prompt)`);
  });

  // 5. 按 total_score 排序，排除前 200 名
  const sortedPrompts = sourceData
    .filter((item: any) => item.total_score !== undefined)
    .sort((a: any, b: any) => b.total_score - a.total_score);

  console.log(`\n🎯 评分排序:`);
  console.log(`  总评分 Prompt 数: ${sortedPrompts.length}`);
  console.log(`  前 200 名最高分: ${sortedPrompts[0]?.total_score} → ${sortedPrompts[199]?.total_score}`);
  console.log(`  第 201 名起: ${sortedPrompts[200]?.total_score}`);

  // 6. 从第 201 名开始，筛选未使用的 subject_type
  const candidates = sortedPrompts
    .slice(200) // 排除前 200 名
    .filter((item: any) => unusedSubjectTypes.includes(item.subject_type));

  console.log(`\n🎯 符合条件的候选 Prompt（排除前 200 名 + 未使用的 subject_type）:`);
  console.log(`  总数: ${candidates.length}`);

  // 7. 选择前 5 个作为测试
  const testPrompts = candidates.slice(0, 5);

  console.log(`\n✅ 筛选出的 5 个测试 Prompt:\n`);
  testPrompts.forEach((p: any, idx: number) => {
    console.log(`【${idx + 1}】ID: ${p.id} | 评分: ${p.total_score} | 排名: ${sortedPrompts.indexOf(p) + 1}`);
    console.log(`  Subject Type: ${p.subject_type}`);
    console.log(`  Title: ${p.title}`);
    console.log(`  Vertical: ${p.vertical}`);
    console.log(`  Visual Style: ${p.visual_style}`);
    console.log(`  Commercial Prob: ${p.commercial_prob}`);
    console.log(`  Requires Upload: ${p.requires_upload ? 'Yes' : 'No'}`);
    console.log(`  Prompt (前 100 字): ${p.prompt.substring(0, 100)}...`);
    console.log('');
  });

  // 8. 保存结果
  const outputPath = path.join(process.cwd(), 'test-prompts-5-correct.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          source: 'merged-prompts-full.json',
          totalPrompts: sourceData.length,
          totalSubjectTypes: allSubjectTypes.size,
          usedSubjectTypes: usedSubcategories.size,
          unusedSubjectTypes: unusedSubjectTypes.length,
          candidatesAfterRank200: candidates.length,
          selectedCount: testPrompts.length,
        },
        testPrompts,
      },
      null,
      2
    )
  );

  console.log(`💾 测试 Prompt 已保存到: ${outputPath}`);
  console.log(`\n🎉 选择完成！`);
}

selectTestPrompts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  });
