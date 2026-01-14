import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function applySubcategories() {
  console.log('🔄 回填 subcategory 到数据库...\n');

  // 1. 加载 AI 分析结果
  const analyzed = JSON.parse(fs.readFileSync('logs/prompts-with-subcategory.json', 'utf-8'));
  console.log(`📂 加载了 ${analyzed.length} 条分析结果\n`);

  // 2. 回填到数据库
  let successCount = 0;
  let failCount = 0;

  for (const item of analyzed) {
    if (!item.subcategory || item.subcategory === 'Unknown') {
      console.log(`⚠️  ${item.id}: subcategory 为空或 Unknown，跳过`);
      failCount++;
      continue;
    }

    try {
      await db()
        .update(communityPost)
        .set({ subcategory: item.subcategory })
        .where(eq(communityPost.id, item.id));

      console.log(`✅ ${item.id}: ${item.subcategory}`);
      successCount++;
    } catch (error: any) {
      console.log(`❌ ${item.id}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 回填统计:`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败/跳过: ${failCount}`);
  console.log(`   总计: ${analyzed.length}`);
  console.log(`   成功率: ${((successCount / analyzed.length) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);

  // 3. 验证回填结果
  const [stats] = await db()
    .select({
      total: db().execute('SELECT COUNT(*) as count FROM community_post'),
      filled: db().execute('SELECT COUNT(*) as count FROM community_post WHERE subcategory IS NOT NULL'),
    } as any)
    .from(communityPost)
    .limit(1);

  console.log('✅ 回填完成！');
  process.exit(0);
}

applySubcategories().catch(error => {
  console.error('❌ 回填失败:', error);
  process.exit(1);
});
