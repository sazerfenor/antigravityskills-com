import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { isNull, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function backfill() {
  console.log('🔍 回填现有帖子的 subcategory 字段...\n');

  // 1. 加载原始评分数据
  const sourcePath = path.join(process.cwd(), 'docs/prompt-scoring/output/merged-prompts-full.json');

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 源文件不存在: ${sourcePath}`);
    process.exit(1);
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  console.log(`📂 已加载 ${sourceData.length} 条源数据`);

  // 2. 创建 prompt → subcategory 映射
  const promptMap = new Map<string, string>();
  sourceData.forEach((item: any) => {
    const normalizedPrompt = item.prompt.trim();
    promptMap.set(normalizedPrompt, item.subject_type);
  });

  console.log(`📊 创建了 ${promptMap.size} 个 prompt → subcategory 映射\n`);

  // 3. 查询所有缺少 subcategory 的帖子
  const posts = await db()
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      category: communityPost.category,
    })
    .from(communityPost)
    .where(isNull(communityPost.subcategory));

  console.log(`🔎 找到 ${posts.length} 条需要回填的帖子\n`);

  if (posts.length === 0) {
    console.log('✅ 所有帖子都已有 subcategory，无需回填');
    process.exit(0);
  }

  // 4. 回填数据
  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    const normalizedPrompt = post.prompt?.trim();

    if (!normalizedPrompt) {
      console.log(`⚠️  ${post.id}: prompt 为空，跳过`);
      failCount++;
      continue;
    }

    const subcategory = promptMap.get(normalizedPrompt);

    if (subcategory) {
      await db()
        .update(communityPost)
        .set({ subcategory })
        .where(eq(communityPost.id, post.id));

      console.log(`✅ ${post.id}: ${subcategory}`);
      successCount++;
    } else {
      console.log(`⚠️  ${post.id}: 未找到对应的 subcategory`);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 回填统计:`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log(`   总计: ${posts.length}`);
  console.log(`   成功率: ${((successCount / posts.length) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);

  // 5. 验证回填结果
  const [stats] = await db()
    .select({
      total: db().execute<number>('SELECT COUNT(*) as count FROM community_post'),
      filled: db().execute<number>('SELECT COUNT(*) as count FROM community_post WHERE subcategory IS NOT NULL'),
    })
    .from(communityPost)
    .limit(1) as any;

  console.log('✅ 回填完成！');
  process.exit(0);
}

backfill().catch((error) => {
  console.error('❌ 回填失败:', error.message);
  console.error(error);
  process.exit(1);
});
