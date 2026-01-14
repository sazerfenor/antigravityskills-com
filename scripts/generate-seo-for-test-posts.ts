import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 为测试帖子生成 SEO 元数据
 *
 * 流程：
 * 1. 读取 test-posts-results.json 中成功的帖子
 * 2. 调用 SEO Generator API 生成元数据
 * 3. 更新帖子状态为 published
 */

async function generateSEOForTestPosts() {
  console.log('🚀 开始为测试帖子生成 SEO 元数据...\n');
  console.log('='.repeat(60));

  // 1. 读取测试结果
  const resultsPath = path.join(process.cwd(), 'test-posts-results.json');
  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ 测试结果文件不存在: ${resultsPath}`);
    process.exit(1);
  }

  const testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const successfulPosts = testResults.results.filter(
    (r: any) => r.status === 'pending_seo'
  );

  console.log(`📂 找到 ${successfulPosts.length} 个待生成 SEO 的帖子\n`);

  if (successfulPosts.length === 0) {
    console.log('✅ 没有需要生成 SEO 的帖子');
    process.exit(0);
  }

  const results = [];

  // 2. 为每个帖子生成 SEO
  for (let i = 0; i < successfulPosts.length; i++) {
    const testPost = successfulPosts[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`【${i + 1}/${successfulPosts.length}】处理帖子 ID: ${testPost.postId}`);
    console.log(`  Subcategory: ${testPost.subcategory}`);
    console.log(`  Author: ${testPost.authorName}`);

    try {
      // 2.1 从数据库读取帖子数据
      const [post] = await db()
        .select()
        .from(communityPost)
        .where(eq(communityPost.id, testPost.postId));

      if (!post) {
        throw new Error('Post not found in database');
      }

      console.log(`\n  ✅ 读取帖子数据`);
      console.log(`    - Prompt 长度: ${post.prompt?.length || 0} 字符`);
      console.log(`    - 已有 params: ${post.params ? '是' : '否'}`);

      // 2.2 调用 SEO Generator API
      console.log(`\n  🎯 调用 SEO Generator API...`);

      const response = await fetch('http://localhost:3000/api/admin/seo/generate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postIds: [testPost.postId],
          override: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const seoResult = await response.json();
      console.log(`  ✅ SEO 生成成功`);
      console.log(`    - 成功: ${seoResult.data?.successCount || 0}`);
      console.log(`    - 失败: ${seoResult.data?.failedCount || 0}`);

      // 2.3 更新帖子状态为 published
      await db()
        .update(communityPost)
        .set({ status: 'published' })
        .where(eq(communityPost.id, testPost.postId));

      console.log(`  ✅ 帖子状态已更新为 published`);

      results.push({
        postId: testPost.postId,
        subcategory: testPost.subcategory,
        authorName: testPost.authorName,
        status: 'published',
      });

    } catch (error: any) {
      console.error(`  ❌ 处理失败:`, error.message);
      results.push({
        postId: testPost.postId,
        error: error.message,
        status: 'failed',
      });
    }
  }

  // 3. 保存结果
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SEO 生成结果汇总:\n');

  const successCount = results.filter((r) => r.status === 'published').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  console.log(`  成功: ${successCount}/${successfulPosts.length}`);
  console.log(`  失败: ${failCount}/${successfulPosts.length}`);

  if (successCount > 0) {
    console.log('\n  ✅ 成功发布的帖子:');
    results
      .filter((r) => r.status === 'published')
      .forEach((r, idx) => {
        console.log(`    ${idx + 1}. Post ID: ${r.postId}`);
        console.log(`       Subcategory: ${r.subcategory}`);
        console.log(`       Author: ${r.authorName}`);
      });
  }

  const outputPath = path.join(process.cwd(), 'test-posts-seo-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          successCount,
          failCount,
          totalCount: successfulPosts.length,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n💾 结果已保存到: ${outputPath}`);

  console.log('\n📋 下一步:');
  console.log('  1. 前往 /admin/gallery 查看发布的帖子');
  console.log('  2. 验证 SEO 元数据是否正确生成');
  console.log('  3. 检查前台展示效果');

  console.log(`\n🎉 SEO 生成完成！`);
}

generateSEOForTestPosts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ SEO 生成失败:', e);
    process.exit(1);
  });
