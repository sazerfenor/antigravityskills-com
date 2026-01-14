import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, eq } from 'drizzle-orm';

async function verifyCompletePipeline() {
  console.log('🔍 验证三大核心流程的完整性\n');
  console.log('=' .repeat(60));

  // 1. 表单生成流程（Intent Analyzer + Field Generator）
  console.log('\n📋 流程 1: 表单生成（Intent Analyzer + Field Generator）');
  console.log('检查已发布帖子的 params 字段...');

  const paramsStats = await db()
    .select({
      total: sql<number>`count(*)`,
      hasParams: sql<number>`count(CASE WHEN ${communityPost.params} IS NOT NULL THEN 1 END)`,
      hasFormValues: sql<number>`count(CASE WHEN json_extract(${communityPost.params}, '$.formValues') IS NOT NULL THEN 1 END)`,
      hasSchema: sql<number>`count(CASE WHEN json_extract(${communityPost.params}, '$.schema') IS NOT NULL THEN 1 END)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log(`  总帖子数: ${paramsStats[0].total}`);
  console.log(`  有 params: ${paramsStats[0].hasParams} (${((paramsStats[0].hasParams / paramsStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 formValues: ${paramsStats[0].hasFormValues} (${((paramsStats[0].hasFormValues / paramsStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 schema: ${paramsStats[0].hasSchema} (${((paramsStats[0].hasSchema / paramsStats[0].total) * 100).toFixed(1)}%)`);

  if (paramsStats[0].hasParams === paramsStats[0].total) {
    console.log('  ✅ 流程 1 数据完整性：100%');
  } else {
    console.log(`  ⚠️  流程 1 数据完整性：${((paramsStats[0].hasParams / paramsStats[0].total) * 100).toFixed(1)}%`);
  }

  // 2. Prompt 编译流程（Compiler）
  console.log('\n🔧 流程 2: Prompt 编译（Compiler）');
  console.log('检查已发布帖子的 prompt 字段...');

  const promptStats = await db()
    .select({
      total: sql<number>`count(*)`,
      hasPrompt: sql<number>`count(CASE WHEN ${communityPost.prompt} IS NOT NULL AND ${communityPost.prompt} != '' THEN 1 END)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log(`  总帖子数: ${promptStats[0].total}`);
  console.log(`  有 prompt: ${promptStats[0].hasPrompt} (${((promptStats[0].hasPrompt / promptStats[0].total) * 100).toFixed(1)}%)`);

  if (promptStats[0].hasPrompt === promptStats[0].total) {
    console.log('  ✅ 流程 2 数据完整性：100%');
  } else {
    console.log(`  ⚠️  流程 2 数据完整性：${((promptStats[0].hasPrompt / promptStats[0].total) * 100).toFixed(1)}%`);
  }

  // 3. SEO 生成流程
  console.log('\n🎯 流程 3: SEO 生成');
  console.log('检查已发布帖子的 SEO 字段...');

  const seoStats = await db()
    .select({
      total: sql<number>`count(*)`,
      hasSeoSlug: sql<number>`count(CASE WHEN ${communityPost.seoSlug} IS NOT NULL THEN 1 END)`,
      hasSeoTitle: sql<number>`count(CASE WHEN ${communityPost.seoTitle} IS NOT NULL THEN 1 END)`,
      hasH1Title: sql<number>`count(CASE WHEN ${communityPost.h1Title} IS NOT NULL THEN 1 END)`,
      hasTitle: sql<number>`count(CASE WHEN ${communityPost.title} IS NOT NULL THEN 1 END)`,
      hasSeoDescription: sql<number>`count(CASE WHEN ${communityPost.seoDescription} IS NOT NULL THEN 1 END)`,
      hasAnchor: sql<number>`count(CASE WHEN ${communityPost.anchor} IS NOT NULL THEN 1 END)`,
      hasMicroFocus: sql<number>`count(CASE WHEN ${communityPost.microFocus} IS NOT NULL THEN 1 END)`,
      hasContentSections: sql<number>`count(CASE WHEN ${communityPost.contentSections} IS NOT NULL THEN 1 END)`,
      hasSubcategory: sql<number>`count(CASE WHEN ${communityPost.subcategory} IS NOT NULL THEN 1 END)`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));

  console.log(`  总帖子数: ${seoStats[0].total}`);
  console.log(`  有 seoSlug: ${seoStats[0].hasSeoSlug} (${((seoStats[0].hasSeoSlug / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 seoTitle: ${seoStats[0].hasSeoTitle} (${((seoStats[0].hasSeoTitle / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 h1Title: ${seoStats[0].hasH1Title} (${((seoStats[0].hasH1Title / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  🔧 有 title: ${seoStats[0].hasTitle} (${((seoStats[0].hasTitle / seoStats[0].total) * 100).toFixed(1)}%) [新修复]`);
  console.log(`  有 seoDescription: ${seoStats[0].hasSeoDescription} (${((seoStats[0].hasSeoDescription / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 anchor: ${seoStats[0].hasAnchor} (${((seoStats[0].hasAnchor / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 microFocus: ${seoStats[0].hasMicroFocus} (${((seoStats[0].hasMicroFocus / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 contentSections: ${seoStats[0].hasContentSections} (${((seoStats[0].hasContentSections / seoStats[0].total) * 100).toFixed(1)}%)`);
  console.log(`  有 subcategory: ${seoStats[0].hasSubcategory} (${((seoStats[0].hasSubcategory / seoStats[0].total) * 100).toFixed(1)}%)`);

  const seoComplete = seoStats[0].hasSeoSlug === seoStats[0].total &&
                      seoStats[0].hasTitle === seoStats[0].total &&
                      seoStats[0].hasSubcategory === seoStats[0].total;

  if (seoComplete) {
    console.log('  ✅ 流程 3 关键字段完整性：100%');
  } else {
    console.log('  ⚠️  流程 3 存在缺失字段');
  }

  // 4. 虚拟作者发帖系统
  console.log('\n👥 虚拟作者发帖系统');
  console.log('检查虚拟作者发布的帖子...');

  const { user } = await import('@/config/db/schema');

  const virtualAuthorStats = await db()
    .select({
      totalVirtualUsers: sql<number>`count(DISTINCT CASE WHEN ${user.isVirtual} = 1 THEN ${user.id} END)`,
      totalVirtualPosts: sql<number>`count(CASE WHEN ${user.isVirtual} = 1 AND ${communityPost.status} = 'published' THEN 1 END)`,
    })
    .from(communityPost)
    .leftJoin(user, eq(communityPost.userId, user.id));

  console.log(`  虚拟作者数量: ${virtualAuthorStats[0].totalVirtualUsers}`);
  console.log(`  虚拟作者发布的帖子: ${virtualAuthorStats[0].totalVirtualPosts}`);

  if (virtualAuthorStats[0].totalVirtualPosts > 0) {
    console.log('  ✅ 虚拟作者发帖系统运行正常');
  } else {
    console.log('  ⚠️  虚拟作者尚未发帖');
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 总体评估\n');

  const allComplete =
    paramsStats[0].hasParams === paramsStats[0].total &&
    promptStats[0].hasPrompt === promptStats[0].total &&
    seoComplete &&
    virtualAuthorStats[0].totalVirtualPosts > 0;

  if (allComplete) {
    console.log('✅ 所有流程数据完整性验证通过！');
    console.log('✅ 三大核心流程（表单生成、Prompt 编译、SEO 生成）运行正常');
    console.log('✅ 虚拟作者系统运行正常');
  } else {
    console.log('⚠️  存在部分流程数据不完整，请检查上述详情');
  }

  // 抽样验证：查看最新的 5 条帖子的完整性
  console.log('\n📋 抽样验证（最新 5 条帖子）:');
  const samplePosts = await db()
    .select({
      id: communityPost.id,
      createdAt: communityPost.createdAt,
      hasParams: sql<number>`CASE WHEN ${communityPost.params} IS NOT NULL THEN 1 ELSE 0 END`,
      hasPrompt: sql<number>`CASE WHEN ${communityPost.prompt} IS NOT NULL THEN 1 ELSE 0 END`,
      hasTitle: sql<number>`CASE WHEN ${communityPost.title} IS NOT NULL THEN 1 ELSE 0 END`,
      hasSubcategory: sql<number>`CASE WHEN ${communityPost.subcategory} IS NOT NULL THEN 1 ELSE 0 END`,
      hasSeoSlug: sql<number>`CASE WHEN ${communityPost.seoSlug} IS NOT NULL THEN 1 ELSE 0 END`,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .orderBy(sql`${communityPost.createdAt} DESC`)
    .limit(5);

  samplePosts.forEach((post, idx) => {
    const complete = post.hasParams && post.hasPrompt && post.hasTitle && post.hasSubcategory && post.hasSeoSlug;
    console.log(`\n帖子 ${idx + 1} (${new Date(post.createdAt).toLocaleDateString()}):`);
    console.log(`  params: ${post.hasParams ? '✅' : '❌'}`);
    console.log(`  prompt: ${post.hasPrompt ? '✅' : '❌'}`);
    console.log(`  title: ${post.hasTitle ? '✅' : '❌'}`);
    console.log(`  subcategory: ${post.hasSubcategory ? '✅' : '❌'}`);
    console.log(`  seoSlug: ${post.hasSeoSlug ? '✅' : '❌'}`);
    console.log(`  ${complete ? '✅ 完整' : '❌ 不完整'}`);
  });
}

verifyCompletePipeline()
  .then(() => {
    console.log('\n🎉 验证完成！');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ 验证失败:', e);
    process.exit(1);
  });
