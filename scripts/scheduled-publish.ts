/**
 * 定时发布脚本 - 模拟自然发布节奏
 *
 * 每次运行发布 N 篇 pending 帖子（N 随机，默认 3-7 篇）
 * 可通过 Vercel Cron / GitHub Actions 每天定时执行
 *
 * 使用方法：
 * pnpm tsx scripts/scheduled-publish.ts --dry-run       # 预览模式
 * pnpm tsx scripts/scheduled-publish.ts                 # 执行发布
 * pnpm tsx scripts/scheduled-publish.ts --min 2 --max 5 # 自定义数量范围
 * pnpm tsx scripts/scheduled-publish.ts --count 3       # 固定发布 3 篇
 */

import { eq, and, isNull, asc } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { updateCommunityPostById } from '@/shared/models/community_post';

// 命令行参数解析
const DRY_RUN = process.argv.includes('--dry-run');

const MIN_COUNT = (() => {
  const idx = process.argv.indexOf('--min');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 3;
})();

const MAX_COUNT = (() => {
  const idx = process.argv.indexOf('--max');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 7;
})();

const FIXED_COUNT = (() => {
  const idx = process.argv.indexOf('--count');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();

/**
 * 生成随机发布数量
 */
function getRandomCount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 查询待发布的帖子（已有完整 SEO 内容的 pending 帖子）
 */
async function getPendingPostsReadyToPublish() {
  const database = db();

  // 查询条件：
  // 1. status = 'pending'
  // 2. 有 seoSlug（说明已生成 SEO）
  // 3. 有 contentSections 或 seoTitle（说明内容已就绪）
  const posts = await database
    .select({
      id: communityPost.id,
      seoSlug: communityPost.seoSlug,
      seoTitle: communityPost.seoTitle,
      prompt: communityPost.prompt,
      createdAt: communityPost.createdAt,
    })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'pending'),
        // 确保已有 SEO 内容
        // isNotNull(communityPost.seoSlug)
      )
    )
    .orderBy(asc(communityPost.createdAt)); // 按创建时间排序，先进先出

  // 过滤出真正准备好的帖子
  return posts.filter(post => post.seoSlug && post.seoTitle);
}

/**
 * 发布帖子
 */
async function publishPost(postId: string): Promise<{ success: boolean; message: string }> {
  try {
    await updateCommunityPostById(postId, {
      status: 'published',
      // 可选：设置发布时间为当前时间
      // publishedAt: new Date(),
    });

    return { success: true, message: '已发布' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('📅 定时发布脚本 - 模拟自然发布节奏');
  console.log('='.repeat(60));
  console.log(`模式: ${DRY_RUN ? '预览 (--dry-run)' : '执行'}`);
  console.log(`发布范围: ${FIXED_COUNT ? `固定 ${FIXED_COUNT} 篇` : `${MIN_COUNT}-${MAX_COUNT} 篇`}`);
  console.log();

  // 1. 查询待发布帖子
  console.log('📊 查询待发布帖子...');
  const pendingPosts = await getPendingPostsReadyToPublish();
  console.log(`  找到 ${pendingPosts.length} 个待发布帖子（已有完整 SEO 内容）`);

  if (pendingPosts.length === 0) {
    console.log('\n✅ 没有待发布的帖子，退出。');
    await closeDb();
    return;
  }

  // 2. 确定本次发布数量
  const targetCount = FIXED_COUNT || getRandomCount(MIN_COUNT, MAX_COUNT);
  const actualCount = Math.min(targetCount, pendingPosts.length);

  console.log(`\n🎲 本次计划发布: ${actualCount} 篇`);
  if (actualCount < targetCount) {
    console.log(`   (原计划 ${targetCount} 篇，但只有 ${pendingPosts.length} 篇待发布)`);
  }

  // 3. 选择要发布的帖子（按时间顺序）
  const postsToPublish = pendingPosts.slice(0, actualCount);

  console.log('\n📋 待发布列表:');
  postsToPublish.forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.seoSlug || post.id}`);
  });

  // 4. 预览模式
  if (DRY_RUN) {
    console.log('\n✅ 预览完成。使用不带 --dry-run 的命令来执行发布。');
    await closeDb();
    return;
  }

  // 5. 执行发布
  console.log('\n🚀 开始发布...');
  let successCount = 0;
  let errorCount = 0;

  for (const post of postsToPublish) {
    const result = await publishPost(post.id);
    if (result.success) {
      console.log(`  ✅ ${post.seoSlug}: ${result.message}`);
      successCount++;
    } else {
      console.log(`  ❌ ${post.seoSlug}: ${result.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 发布完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
  console.log(`  📦 剩余待发布: ${pendingPosts.length - actualCount}`);
  console.log('='.repeat(60));

  await closeDb();
}

main().catch(async (error) => {
  console.error('❌ 脚本执行失败:', error);
  await closeDb();
  process.exit(1);
});
