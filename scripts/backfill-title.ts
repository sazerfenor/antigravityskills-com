import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, isNull, and, eq } from 'drizzle-orm';

async function backfillTitle() {
  console.log('开始回填 community_post.title 字段...\n');

  // 1. 先查看已发布帖子的 seoTitle 和 h1Title 情况
  console.log('📊 检查已发布帖子的标题字段状态:');
  const samplePosts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      seoTitle: communityPost.seoTitle,
      h1Title: communityPost.h1Title,
      anchor: communityPost.anchor,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .limit(5);

  samplePosts.forEach((post, idx) => {
    console.log(`\n帖子 ${idx + 1}:`);
    console.log(`  title: ${post.title || '❌ NULL'}`);
    console.log(`  seoTitle: ${post.seoTitle ? '✅ ' + post.seoTitle : '❌ NULL'}`);
    console.log(`  h1Title: ${post.h1Title ? '✅ ' + post.h1Title : '❌ NULL'}`);
    console.log(`  anchor: ${post.anchor ? '✅ ' + post.anchor : '❌ NULL'}`);
  });

  // 2. 统计各字段的填充情况
  console.log('\n📈 统计标题字段填充率:');

  const stats = await db()
    .select({
      totalPublished: sql<number>`count(*)`,
      hasSeoTitle: sql<number>`count(CASE WHEN ${communityPost.seoTitle} IS NOT NULL THEN 1 END)`,
      hasH1Title: sql<number>`count(CASE WHEN ${communityPost.h1Title} IS NOT NULL THEN 1 END)`,
      hasAnchor: sql<number>`count(CASE WHEN ${communityPost.anchor} IS NOT NULL THEN 1 END)`,
      hasTitle: sql<number>`count(CASE WHEN ${communityPost.title} IS NOT NULL THEN 1 END)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log(`  总已发布帖子: ${stats[0].totalPublished}`);
  console.log(`  有 seoTitle: ${stats[0].hasSeoTitle} (${((stats[0].hasSeoTitle / stats[0].totalPublished) * 100).toFixed(1)}%)`);
  console.log(`  有 h1Title: ${stats[0].hasH1Title} (${((stats[0].hasH1Title / stats[0].totalPublished) * 100).toFixed(1)}%)`);
  console.log(`  有 anchor: ${stats[0].hasAnchor} (${((stats[0].hasAnchor / stats[0].totalPublished) * 100).toFixed(1)}%)`);
  console.log(`  有 title: ${stats[0].hasTitle} (${((stats[0].hasTitle / stats[0].totalPublished) * 100).toFixed(1)}%)`);

  // 3. 确定回填策略
  console.log('\n🎯 回填策略:');
  console.log('  优先级: h1Title > seoTitle > anchor > "Untitled Post"');

  // 4. 执行回填
  console.log('\n🔄 开始回填...');

  const postsToBackfill = await db()
    .select({
      id: communityPost.id,
      seoTitle: communityPost.seoTitle,
      h1Title: communityPost.h1Title,
      anchor: communityPost.anchor,
    })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.title)
      )
    );

  console.log(`  需要回填的帖子数: ${postsToBackfill.length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const post of postsToBackfill) {
    try {
      // 确定 title 值（优先级: h1Title > seoTitle > anchor > "Untitled Post"）
      const titleValue = post.h1Title || post.seoTitle || post.anchor || 'Untitled Post';

      await db()
        .update(communityPost)
        .set({ title: titleValue })
        .where(eq(communityPost.id, post.id));

      successCount++;

      if (successCount % 10 === 0) {
        console.log(`  进度: ${successCount}/${postsToBackfill.length}`);
      }
    } catch (error) {
      console.error(`  ❌ 回填失败 (${post.id}):`, error);
      errorCount++;
    }
  }

  console.log('\n✅ 回填完成:');
  console.log(`  成功: ${successCount} 条`);
  console.log(`  失败: ${errorCount} 条`);

  // 5. 验证回填结果
  console.log('\n🔍 验证回填结果:');
  const afterStats = await db()
    .select({
      totalPublished: sql<number>`count(*)`,
      hasTitle: sql<number>`count(CASE WHEN ${communityPost.title} IS NOT NULL THEN 1 END)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log(`  总已发布帖子: ${afterStats[0].totalPublished}`);
  console.log(`  有 title: ${afterStats[0].hasTitle} (${((afterStats[0].hasTitle / afterStats[0].totalPublished) * 100).toFixed(1)}%)`);

  // 6. 抽样验证
  console.log('\n📋 抽样验证（前5条）:');
  const verifyPosts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      h1Title: communityPost.h1Title,
      seoTitle: communityPost.seoTitle,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .limit(5);

  verifyPosts.forEach((post, idx) => {
    console.log(`\n帖子 ${idx + 1}:`);
    console.log(`  title: ${post.title}`);
    console.log(`  h1Title: ${post.h1Title || 'NULL'}`);
    console.log(`  seoTitle: ${post.seoTitle || 'NULL'}`);
  });
}

backfillTitle()
  .then(() => {
    console.log('\n🎉 所有任务完成！');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  });
