/**
 * 修复已重建帖子的问题
 *
 * 问题 1: 图片 URL 没有从 AI Task 同步到帖子
 * 问题 2: 老的 SEO 字段没有清理，导致新旧数据混合
 *
 * 使用方法:
 * pnpm tsx scripts/fix-rebuilt-posts.ts --dry-run    # 预览模式
 * pnpm tsx scripts/fix-rebuilt-posts.ts              # 执行修复
 */

import { eq, sql } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost, aiTask } from '@/config/db/schema';
import { updateCommunityPostById } from '@/shared/models/community_post';
import { generateThumbnail } from '@/shared/lib/thumbnail-generator';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 修复已重建帖子');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会执行实际操作\n');
  }

  const database = db();

  // 查找有 formValues 的帖子（已经过重建脚本处理的）
  const posts = await database
    .select({
      id: communityPost.id,
      imageUrl: communityPost.imageUrl,
      thumbnailUrl: communityPost.thumbnailUrl,
      seoSlug: communityPost.seoSlug,
      useCases: communityPost.useCases,
      faqItems: communityPost.faqItems,
      visualTags: communityPost.visualTags,
      createdAt: communityPost.createdAt,
    })
    .from(communityPost)
    .where(sql`
      ${communityPost.params}::jsonb->>'formValues' IS NOT NULL
      AND ${communityPost.createdAt} < '2025-12-28'
    `);

  console.log(`\n找到 ${posts.length} 篇已重建的老帖子\n`);

  let fixedCount = 0;
  let errorCount = 0;

  for (const post of posts) {
    console.log(`\n处理: ${post.seoSlug || post.id.slice(0, 8)}`);

    // 检查是否需要修复图片
    // 找到该帖子最新的 AI Task（通过 prompt 匹配或时间范围）
    const recentTasks = await database
      .select({
        id: aiTask.id,
        imageUrl: aiTask.imageUrl,
        status: aiTask.status,
        createdAt: aiTask.createdAt,
      })
      .from(aiTask)
      .where(sql`
        ${aiTask.createdAt} > '2025-12-30'
        AND ${aiTask.status} = 'completed'
        AND ${aiTask.imageUrl} IS NOT NULL
      `)
      .orderBy(sql`${aiTask.createdAt} DESC`);

    // 查找可能对应的任务（基于时间戳接近）
    let matchedTask = null;

    // 检查当前图片是否已经是新生成的（包含 bananaprompts-info）
    const hasNewImage = post.imageUrl?.includes('bananaprompts-info') || false;
    const hasOldSEOFields = !!(post.useCases || post.faqItems || post.visualTags);

    console.log(`  当前图片: ${hasNewImage ? '✅ 新图' : '❌ 旧图'}`);
    console.log(`  老SEO字段: ${hasOldSEOFields ? '❌ 有残留' : '✅ 已清理'}`);

    // 如果图片是旧的，尝试从最近任务中找匹配
    if (!hasNewImage && recentTasks.length > 0) {
      // 这里简单取第一个可用的任务（实际应该更精确匹配）
      // 由于我们按时间排序，取最新的
      matchedTask = recentTasks[0];
      console.log(`  找到潜在匹配任务: ${matchedTask.id.slice(0, 8)}...`);
    }

    // 构建更新数据
    const updates: Record<string, any> = {};

    // 问题 1: 更新图片 URL（如果找到匹配任务）
    if (matchedTask && !hasNewImage) {
      updates.imageUrl = matchedTask.imageUrl;
      console.log(`  📸 将更新图片: ${matchedTask.imageUrl?.slice(0, 60)}...`);

      // 生成缩略图
      if (matchedTask.imageUrl) {
        try {
          const thumbnailUrl = await generateThumbnail(matchedTask.imageUrl);
          if (thumbnailUrl) {
            updates.thumbnailUrl = thumbnailUrl;
            console.log(`  🖼️ 生成缩略图: ${thumbnailUrl.slice(0, 60)}...`);
          }
        } catch (e: any) {
          console.log(`  ⚠️ 缩略图生成失败: ${e.message}`);
        }
      }
    }

    // 问题 2: 清理老的 SEO 字段
    if (hasOldSEOFields) {
      updates.useCases = null;
      updates.faqItems = null;
      updates.visualTags = null;
      updates.dynamicHeaders = null;
      updates.expertCommentary = null;
      console.log(`  🧹 将清理老SEO字段`);
    }

    // 执行更新
    if (Object.keys(updates).length > 0) {
      if (DRY_RUN) {
        console.log(`  ⏭️ [Dry Run] 将更新: ${Object.keys(updates).join(', ')}`);
      } else {
        try {
          await updateCommunityPostById(post.id, updates);
          console.log(`  ✅ 更新成功`);
          fixedCount++;
        } catch (e: any) {
          console.log(`  ❌ 更新失败: ${e.message}`);
          errorCount++;
        }
      }
    } else {
      console.log(`  ✓ 无需修复`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 修复结果:\n');
  console.log(`  已修复: ${fixedCount}`);
  console.log(`  失败: ${errorCount}`);
  console.log(`  无需修复: ${posts.length - fixedCount - errorCount}`);

  if (DRY_RUN) {
    console.log('\n💡 移除 --dry-run 执行实际修复');
  }

  console.log('\n' + '='.repeat(60));
  await closeDb();
}

main().catch(async (error) => {
  console.error('❌ 脚本执行失败:', error);
  await closeDb();
  process.exit(1);
});
